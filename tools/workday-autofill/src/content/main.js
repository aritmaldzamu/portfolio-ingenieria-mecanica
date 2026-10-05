// Orquestador: agrega entradas faltantes (experiencia, educación, idiomas…),
// recorre los campos en varias pasadas (algunos sitios re-renderizan al cambiar
// país, etc.), llena lo que reconoce y reporta lo pendiente. Nunca da clic en Next.
(() => {
  const WD = (window.__WDAF = window.__WDAF || {});
  if (WD.fill) return;
  const { sleep, norm, waitFor, isVisible, realClick, text } = WD.utils;
  const { scan, isEmpty, sectionFromHeading } = WD.fields;
  const { resolve } = WD.rules;
  const { apply, closePopups } = WD.widgets;
  const panel = WD.panel;

  const DEFAULT_SETTINGS = { activeAddress: 0, activeResume: 0, overwrite: false, uploadResume: true, floatingButton: true, autoOnStep: false, addCertifications: false };
  const SECTION_KEYS = ['experience', 'education', 'languages', 'websites', 'certifications'];

  async function loadData() {
    const data = await chrome.storage.local.get(['profile', 'settings', 'resumes', 'learned']);
    return { profile: data.profile, settings: { ...DEFAULT_SETTINGS, ...(data.settings || {}) }, resumes: data.resumes || [], learned: data.learned || {} };
  }

  // ---------- botones "Add / Agregar" de secciones repetibles ----------
  const ADD_RE = /^(add|agregar|anadir|add another|agregar otr[oa]|anadir otr[oa]|\+)\b/;

  function sectionOfButton(btn) {
    const own = sectionFromHeading((btn.getAttribute('aria-label') || '') + ' ' + text(btn));
    if (own) return own;
    for (let n = btn.parentElement; n && n !== document.body; n = n.parentElement) {
      const ids = n.getAttribute('aria-labelledby');
      const title = ids ? ids.split(/\s+/).map((id) => text(document.getElementById(id))).join(' ') : text(n.querySelector('h2, h3, h4, legend'));
      if (title) return sectionFromHeading(title);
    }
    return null;
  }

  function findAddButton(section) {
    const btns = [...document.querySelectorAll('button, [role="button"]')].filter((b) => {
      if (!isVisible(b) || b.closest('#wdaf-root')) return false;
      const aid = b.getAttribute('data-automation-id') || '';
      const label = norm(text(b) || b.getAttribute('aria-label') || '');
      return aid === 'add-button' || ADD_RE.test(label);
    });
    const mine = btns.filter((b) => sectionOfButton(b) === section);
    return mine[mine.length - 1] || null;
  }

  async function ensureEntries(profile, settings, log, handled = new Set()) {
    for (const section of SECTION_KEYS) {
      if (handled.has(section)) continue;
      if (section === 'certifications' && !settings.addCertifications) continue;
      const want = (profile[section] || []).length;
      if (!want) continue;
      for (let guard = 0; guard < want + 2; guard++) {
        const have = scan().entryCounts[section] || 0;
        if (have >= want) break;
        const btn = findAddButton(section);
        if (!btn) break;
        realClick(btn);
        const grew = await waitFor(() => (scan().entryCounts[section] || 0) > have, { timeout: 3000 });
        if (!grew) {
          log.push(`No pude agregar otra entrada en "${section}".`);
          break;
        }
        await sleep(250);
      }
    }
  }

  function buildCtx(profile, addr, resume, fields, learned) {
    const names = (f) => resolve({ p: profile, addr }, f)?.rule;
    const present = new Set(fields.map(names).filter(Boolean));
    return {
      p: profile,
      addr,
      resume,
      learned,
      hasLastName: present.has('Apellido') || present.has('Apellido materno'),
      hasSecondLastName: present.has('Apellido materno'),
      hasPhoneCode: present.has('Código de país (teléfono)'),
      hasExteriorNumber: present.has('Número exterior'),
    };
  }

  const blank = (v) => v == null || v === '' || (Array.isArray(v) && !v.filter((x) => x != null && x !== '').length) || (v && v.multi && !v.multi.length);
  const keyOf = (f) => f.el;

  /** Llena en varias pasadas (los sitios agregan o redibujan campos al elegir país, etc.). */
  async function fillPasses(getFields, makeCtx, settings, report, maxPasses = 5) {
    for (let pass = 0; pass < maxPasses; pass++) {
      const fields = getFields();
      const ctx = makeCtx(fields);
      const plan = fields.map((f) => ({ f, r: resolve(ctx, f) })).sort((a, b) => (b.r?.early ? 1 : 0) - (a.r?.early ? 1 : 0));
      let acted = 0;
      let rescan = false;
      for (const { f, r } of plan) {
        const prev = report.get(keyOf(f));
        if (prev && prev.status !== 'unknown') continue;
        if (!r) {
          if (isEmpty(f) && f.kind !== 'checkbox') report.set(keyOf(f), { f, status: 'unknown' });
          continue;
        }
        if (blank(r.value)) {
          // value === null: la regla dice "no tocar" (aceptación legal, extensión…)
          // sólo es "pendiente" si el campo es obligatorio; los opcionales vacíos se dejan así
          if (r.value !== null && f.required && isEmpty(f)) report.set(keyOf(f), { f, status: 'nodata', rule: r.rule });
          else report.set(keyOf(f), { f, status: 'skip', rule: r.rule });
          continue;
        }
        if (!settings.overwrite && f.kind !== 'checkbox' && !isEmpty(f)) {
          report.set(keyOf(f), { f, status: 'kept', rule: r.rule });
          continue;
        }
        let res;
        try {
          res = await apply(f, r.value);
        } catch (e) {
          res = false;
          console.warn('[Autollenado]', f.label, e);
        }
        const ok = typeof res === 'object' ? res.ok : res;
        report.set(keyOf(f), { f, status: ok ? 'filled' : 'failed', rule: r.rule, note: typeof res === 'object' ? res.note : '' });
        acted++;
        if (ok && r.early) {
          // p.ej. al cambiar país el sitio redibuja la dirección: volver a escanear
          await sleep(900);
          rescan = true;
          break;
        }
      }
      if (!acted && !rescan) break;
      await sleep(400);
    }
  }

  // ---------- secciones "Agregar → llenar → Guardar" (Oracle/Ford, SuccessFactors, iCIMS…) ----------
  const SAVE_RE = /^(save|guardar|done|listo|aceptar|ok|confirm|confirmar|add|agregar|anadir|update|actualizar|save (experience|education|entry)|guardar (experiencia|educacion|cambios))$/;
  const CANCEL_RE = /cancel|cancelar|delete|eliminar|remove|quitar|borrar|close|cerrar/;
  const firstOf = (v) => (Array.isArray(v) ? v : [v]).filter(Boolean);

  /** Bloque de la sección (para ver qué entradas ya están guardadas como tarjetas). */
  function sectionBox(btn, section) {
    for (let n = btn.parentElement; n && n !== document.body; n = n.parentElement) {
      const h = n.querySelector(':scope > h2, :scope > h3, :scope > h4, :scope > legend, :scope > [role="heading"], :scope > div > h2, :scope > div > h3, :scope > header h2');
      const ids = n.getAttribute('aria-labelledby');
      const title = ids ? ids.split(/\s+/).map((id) => text(document.getElementById(id))).join(' ') : text(h);
      if (title && sectionFromHeading(title) === section) return n;
    }
    return btn.parentElement || document.body;
  }

  /** ¿La entrada ya aparece guardada en la página? (empresa+puesto, escuela+carrera, idioma…) */
  function alreadyShown(section, e, box) {
    const t = norm(text(box));
    const keys =
      section === 'experience' ? [e.company, e.title] :
      section === 'education' ? [e.school, e.fieldOfStudy] :
      section === 'languages' ? [e.language] :
      section === 'certifications' ? [e.name] : [typeof e === 'string' ? e : e.url];
    const lists = keys.map(firstOf).filter((l) => l.length);
    return lists.length > 0 && lists.every((alts) => alts.some((a) => t.includes(norm(a))));
  }

  function commonAncestor(els) {
    let a = els[0]?.parentElement;
    while (a && !els.every((e) => a.contains(e))) a = a.parentElement;
    return a || document.body;
  }

  const BTN_SEL = 'button, [role="button"], input[type="button"], input[type="submit"]';

  /** Botón Guardar del formulario recién abierto. Un "Agregar" sólo cuenta si apareció con el formulario. */
  function findSave(box, addBtn, beforeBtns) {
    return [...box.querySelectorAll(BTN_SEL)].find((b) => {
      if (b === addBtn || !isVisible(b) || b.closest('#wdaf-root')) return false;
      const t = norm(text(b) || b.value || b.getAttribute('aria-label') || '');
      if (!SAVE_RE.test(t) || CANCEL_RE.test(t)) return false;
      if (ADD_RE.test(t) && (beforeBtns.has(b) || sectionOfButton(b))) return false;
      return true;
    });
  }

  /**
   * Para sitios que muestran UN formulario por entrada con su botón Guardar:
   * Agregar → llenar con la entrada i → Guardar → siguiente. Devuelve las
   * secciones que manejó (para no tratarlas como en Workday).
   */
  async function sequentialSections(profile, settings, makeCtx, report, notes) {
    const handled = new Set();
    for (const section of SECTION_KEYS) {
      if (section === 'certifications' && !settings.addCertifications) continue;
      const entries = profile[section] || [];
      if (!entries.length) continue;
      // Workday y formularios con todas las entradas visibles: se manejan aparte
      if ((scan().entryCounts[section] || 0) > 0) continue;
      let added = 0;
      for (let i = 0; i < entries.length; i++) {
        const btn = findAddButton(section);
        if (!btn || btn.getAttribute('data-automation-id') === 'add-button') break;
        if (alreadyShown(section, entries[i], sectionBox(btn, section))) {
          handled.add(section);
          continue;
        }
        const before = new Set(scan().fields.map((f) => f.el));
        const beforeBtns = new Set(document.querySelectorAll(BTN_SEL));
        realClick(btn);
        const fresh = await waitFor(() => {
          const n = scan().fields.filter((f) => !before.has(f.el));
          return n.length ? n : null;
        }, { timeout: 3000 });
        if (!fresh) break;
        let box = commonAncestor(fresh.map((f) => f.el));
        let save = findSave(box, btn, beforeBtns);
        // subir hasta 4 niveles, sin salirse a un bloque que contenga otros campos que ya estaban
        for (let up = 0; !save && up < 4 && box.parentElement; up++) {
          const parent = box.parentElement;
          if ([...before].some((el) => parent.contains(el))) break;
          box = parent;
          save = findSave(box, btn, beforeBtns);
        }
        if (!save) break; // entradas en línea (como Workday): las llena el flujo normal
        handled.add(section);
        const els = new Set(fresh.map((f) => f.el));
        const getFields = () => scan().fields.filter((f) => box.contains(f.el) || els.has(f.el)).map((f) => Object.assign(f, { section, entryIndex: i }));
        await fillPasses(getFields, makeCtx, { ...settings, overwrite: true }, report, 3);
        await closePopups();
        realClick(save);
        const closed = await waitFor(() => ![...els].some((el) => el.isConnected && isVisible(el)), { timeout: 4000 });
        if (!closed) {
          notes.push(`No pude guardar la entrada ${i + 1} de ${SECTION_NAMES[section]}: revisa los campos marcados y da Guardar.`);
          break;
        }
        added++;
        await sleep(500);
      }
      if (added) notes.push(`Agregué y guardé ${added} entrada(s) en ${SECTION_NAMES[section]}.`);
    }
    return handled;
  }

  const SECTION_NAMES = { experience: 'Experiencia', education: 'Educación', languages: 'Idiomas', websites: 'Sitios web', certifications: 'Certificaciones' };

  let running = false;

  async function fill() {
    if (running) return { busy: true };
    running = true;
    let started = false;
    try {
      const { profile, settings, resumes, learned } = await loadData();
      const first = scan();
      if (!first.fields.length && window !== window.top) return { skipped: true };
      panel.setBusy(true);
      started = true;
      WD.markUsed?.();
      if (!profile) {
        panel.render([], { message: 'Aún no tienes perfil guardado. Abre las opciones de la extensión y carga tu perfil.' });
        return { error: 'no-profile' };
      }
      if (!first.fields.length) {
        if (!document.querySelector('iframe')) panel.render([], { message: 'No encontré campos para llenar en esta página.' });
        return { filled: 0 };
      }
      const addr = (profile.addresses || [])[settings.activeAddress] || (profile.addresses || [])[0] || null;
      const resume = settings.uploadResume ? resumes[settings.activeResume] || resumes[0] || null : null;
      const log = [];

      const report = new Map();
      const makeCtx = (fields) => buildCtx(profile, addr, resume, fields, learned);
      const notes = [];
      const handled = await sequentialSections(profile, settings, makeCtx, report, notes);
      await ensureEntries(profile, settings, log, handled);
      await fillPasses(() => scan().fields, makeCtx, settings, report);
      await closePopups();

      // descartar entradas de elementos que ya no existen (re-render)
      const items = [...report.values()].filter((i) => i.f.el.isConnected && i.status !== 'skip');
      panel.render(items, { notes });
      if (log.length) console.info('[Autollenado]', log.join('\n'));
      return { filled: items.filter((i) => i.status === 'filled').length, pending: items.filter((i) => i.status === 'failed' || i.status === 'nodata').length };
    } finally {
      if (started) panel.setBusy(false);
      running = false;
    }
  }

  WD.fill = fill;

  // ---------- mensajes desde popup / atajo ----------
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type === 'WDAF_PING') {
      sendResponse({ ok: true });
      return false;
    }
    if (msg?.type === 'WDAF_FILL') {
      fill().then(sendResponse, (e) => sendResponse({ error: String(e) }));
      return true;
    }
    return false;
  });

  // ---------- botón flotante, aprendizaje y llenado automático por paso ----------
  const isWorkday = /(^|\.)(myworkdayjobs|myworkdaysite|workday)\.com$/.test(location.hostname);

  async function setupUi() {
    const { settings } = await loadData();
    WD.learn.hook();
    if (settings.floatingButton) {
      // cualquier sitio de empleo con un formulario (las SPA lo dibujan después: observar)
      let shown = false;
      const check = () => {
        const want = WD.learn.isJobPage() && scan().fields.length >= 3;
        if (want !== shown) {
          shown = want;
          panel.showButton(want);
        }
      };
      setTimeout(check, 800);
      new MutationObserver(debounce(check, 1500)).observe(document.body, { childList: true, subtree: true });
    }
    if (isWorkday && settings.autoOnStep) {
      let lastStep = '';
      const onChange = debounce(() => {
        const step = text(document.querySelector('[data-automation-id="progressBarActiveStep"]'));
        if (step && step !== lastStep) {
          lastStep = step;
          setTimeout(fill, 1200);
        }
      }, 600);
      new MutationObserver(onChange).observe(document.body, { childList: true, subtree: true });
    }
  }

  function debounce(fn, ms) {
    let t;
    return () => {
      clearTimeout(t);
      t = setTimeout(fn, ms);
    };
  }

  if (document.body) setupUi();
  else document.addEventListener('DOMContentLoaded', setupUi);
})();
