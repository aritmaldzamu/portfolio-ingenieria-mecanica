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

  async function ensureEntries(profile, settings, log) {
    for (const section of SECTION_KEYS) {
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

      await ensureEntries(profile, settings, log);

      const report = new Map();
      for (let pass = 0; pass < 5; pass++) {
        const { fields } = scan();
        const ctx = buildCtx(profile, addr, resume, fields, learned);
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
            // value === null: la regla dice "no tocar" (contraseña, extensión…)
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
            // p.ej. al cambiar país Workday redibuja la dirección: volver a escanear
            await sleep(900);
            rescan = true;
            break;
          }
        }
        if (!acted && !rescan) break;
        await sleep(400);
      }
      await closePopups();

      // descartar entradas de elementos que ya no existen (re-render)
      const items = [...report.values()].filter((i) => i.f.el.isConnected && i.status !== 'skip');
      panel.render(items);
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
