// Cómo escribir en cada tipo de widget de Workday: texto, listas desplegables
// (button + listbox), "prompts" con búsqueda (multiselect), fechas por
// segmentos, radios, checkboxes y carga de archivo.
(() => {
  const WD = (window.__WDAF = window.__WDAF || {});
  if (WD.widgets) return;
  const { sleep, norm, waitFor, isVisible, realClick, typeInto, blur, press, fire, bestOption, similarity, setNativeValue, text } = WD.utils;

  const OPTION_SEL = '[role="option"], [data-automation-id="promptOption"], [data-automation-id="menuItem"]';
  const LISTBOX_SEL = '[role="listbox"], [data-automation-id="activeListContainer"], [data-automation-popup], [data-automation-id="selectWidget"]';

  const asList = (v) => (Array.isArray(v) ? v : [v]).filter((x) => x != null && x !== '');

  function visibleOptions(scope = document) {
    return [...scope.querySelectorAll(OPTION_SEL)]
      .filter((el) => isVisible(el) && !el.closest('#wdaf-root'))
      // evitar contar el contenedor y su hijo como dos opciones
      .filter((el, _, all) => !all.some((o) => o !== el && el.contains(o)))
      .map((el) => ({ el, text: el.getAttribute('data-automation-label') || text(el) }))
      .filter((o) => o.text);
  }

  async function closePopups() {
    const target = document.activeElement || document.body;
    press(target, 'Escape');
    await sleep(80);
  }

  // ---------------- texto ----------------
  async function setText(f, value) {
    const v = String(Array.isArray(value) ? value[0] : value);
    await typeInto(f.el, v);
    blur(f.el);
    await sleep(40);
    return f.el.value === v;
  }

  // ---------------- <select> nativo ----------------
  async function setSelect(f, value) {
    const opts = [...f.el.options].map((o) => ({ el: o, text: o.text }));
    const best = bestOption(opts.filter((o) => o.el.value !== ''), asList(value));
    if (!best) return false;
    f.el.value = best.el.value;
    fire(f.el, 'input');
    fire(f.el, 'change');
    blur(f.el);
    return true;
  }

  // ---------------- lista desplegable (button aria-haspopup=listbox) ----------------
  function visibleListboxes() {
    return [...document.querySelectorAll('[role="listbox"]')].filter((l) => isVisible(l) && !l.closest('#wdaf-root'));
  }

  /** Listbox de este botón: aria-controls, o el que apareció tras el clic, el más cercano al botón. */
  function findListbox(btn, before) {
    const ctrl = btn.getAttribute('aria-controls') || btn.getAttribute('aria-owns');
    const own = ctrl && document.getElementById(ctrl);
    if (own && isVisible(own)) return own;
    const all = visibleListboxes();
    if (!all.length) return null;
    const fresh = all.filter((l) => !before.has(l));
    const br = btn.getBoundingClientRect();
    const dist = (l) => {
      const r = l.getBoundingClientRect();
      return Math.abs(r.top - br.bottom) + Math.abs(r.left - br.left);
    };
    return (fresh.length ? fresh : all).sort((a, b) => dist(a) - dist(b))[0];
  }

  async function openListbox(btn) {
    const before = new Set(visibleListboxes());
    realClick(btn);
    let lb = await waitFor(() => findListbox(btn, before), { timeout: 1500 });
    if (!lb) {
      // algunos widgets abren con teclado y no con clic sintético
      btn.focus();
      press(btn, 'ArrowDown');
      lb = await waitFor(() => findListbox(btn, before), { timeout: 800 });
      if (!lb) {
        press(btn, 'Enter');
        lb = await waitFor(() => findListbox(btn, before), { timeout: 800 });
      }
    }
    return lb;
  }

  function scrollerOf(listbox) {
    const scrollable = (el) => el && el.scrollHeight > el.clientHeight + 4 && /(auto|scroll)/.test(getComputedStyle(el).overflowY);
    if (scrollable(listbox)) return listbox;
    for (let n = listbox.parentElement, i = 0; n && i < 4; n = n.parentElement, i++) if (scrollable(n)) return n;
    return [...listbox.querySelectorAll('*')].find(scrollable) || null;
  }

  /** Busca la opción; si la lista es virtualizada (sólo dibuja lo visible), la recorre con scroll. */
  async function findOption(listbox, wanted) {
    let opts = await waitFor(() => {
      const o = visibleOptions(listbox);
      return o.length ? o : null;
    }, { timeout: 2500 });
    if (!opts) return { best: null, seen: [] };
    const seen = new Set(opts.map((o) => o.text));
    let best = bestOption(opts, wanted);
    const sc = !best && scrollerOf(listbox);
    if (sc) {
      sc.scrollTop = 0;
      await sleep(100);
      for (let i = 0; i < 60 && !best; i++) {
        opts = visibleOptions(listbox);
        opts.forEach((o) => seen.add(o.text));
        best = bestOption(opts, wanted);
        if (best) break;
        const prev = sc.scrollTop;
        sc.scrollTop += Math.max(40, sc.clientHeight * 0.8);
        sc.dispatchEvent(new Event('scroll', { bubbles: true }));
        await sleep(120);
        if (sc.scrollTop === prev) break;
      }
    }
    if (!best) {
      // último recurso: escribir para saltar a la opción
      for (const ch of String(wanted[0]).slice(0, 6)) {
        press(document.activeElement || listbox, ch);
        await sleep(60);
      }
      await sleep(300);
      opts = visibleOptions(listbox);
      opts.forEach((o) => seen.add(o.text));
      best = bestOption(opts, wanted);
    }
    return { best, seen: [...seen] };
  }

  async function setDropdown(f, value) {
    const wanted = asList(value);
    const btn = f.el;
    const before = norm(text(btn));
    const listbox = await openListbox(btn);
    if (!listbox) return { ok: false, note: 'No se abrió la lista' };
    const { best, seen } = await findOption(listbox, wanted);
    if (!best) {
      press(listbox, 'Escape');
      await closePopups();
      const sample = seen.filter((t) => !/^(seleccion|select)/i.test(t)).slice(0, 8).join(', ');
      return { ok: false, note: `Sin opción para "${wanted[0]}"${sample ? `. Vi: ${sample}${seen.length > 8 ? '…' : ''}` : ''}` };
    }
    best.el.scrollIntoView({ block: 'nearest' });
    realClick(best.el);
    await waitFor(() => !isVisible(listbox) || norm(text(btn)) !== before, { timeout: 1500 });
    await sleep(120);
    if (isVisible(listbox)) {
      press(listbox, 'Escape');
      await closePopups();
    }
    const now = norm(text(btn) || btn.getAttribute('aria-label') || '');
    return similarity(now, best.text) >= 0.6 || now.includes(norm(best.text));
  }

  // ---------------- prompt con búsqueda (Workday "multiselect") ----------------
  function pillCount(f) {
    const scope = f.container || f.el.parentElement;
    return [...(scope?.querySelectorAll('[data-automation-id="selectedItem"]') || [])].filter(isVisible).length;
  }

  async function pickOne(f, alternatives) {
    const input = f.el;
    const startPills = pillCount(f);
    for (const term of alternatives) {
      realClick(input);
      await typeInto(input, String(term));
      press(input, 'Enter');
      const opts = await waitFor(() => {
        const o = visibleOptions();
        return o.length ? o : null;
      }, { timeout: 3000 });
      let best = opts && bestOption(opts, alternatives, 0.55);
      // categorías anidadas (p.ej. "Job Board" > "LinkedIn"): hasta 2 niveles
      for (let depth = 0; best && depth < 3; depth++) {
        const label = best.text;
        realClick(best.el);
        await sleep(350);
        if (pillCount(f) > startPills || (!f.el.closest('[data-automation-id="multiselectInputContainer"]') && norm(input.value) === norm(label))) {
          await closePopups();
          return true;
        }
        const next = visibleOptions();
        best = next.length ? bestOption(next, alternatives, 0.55) : null;
        if (best && best.text === label) best = null;
      }
      // sin coincidencia: limpiar búsqueda antes de intentar el siguiente término
      await typeInto(input, '');
      await closePopups();
    }
    return pillCount(f) > startPills;
  }

  async function setMultiselect(f, value) {
    const items = value && value.multi ? value.multi : [value];
    let ok = 0;
    const missed = [];
    for (const item of items) {
      const alts = asList(item);
      if (!alts.length) continue;
      if (await pickOne(f, alts)) ok++;
      else missed.push(alts[0]);
    }
    blur(f.el);
    if (value && value.multi) return { ok: ok > 0, note: missed.length ? `sin coincidencia: ${missed.join(', ')}` : '' };
    return ok > 0;
  }

  // ---------------- checkbox / radio ----------------
  async function setCheckbox(f, want) {
    if (f.el.checked === !!want) return true;
    const lab = f.el.id && document.querySelector(`label[for="${CSS.escape(f.el.id)}"]`);
    realClick(isVisible(f.el) ? f.el : lab || f.el);
    await sleep(120);
    return f.el.checked === !!want;
  }

  async function setRadio(f, value) {
    const best = bestOption(f.options, asList(value));
    if (!best) return false;
    if (best.el.checked) return true;
    const lab = best.el.id && document.querySelector(`label[for="${CSS.escape(best.el.id)}"]`);
    realClick(isVisible(best.el) ? best.el : lab || best.el);
    await sleep(120);
    return best.el.checked;
  }

  // ---------------- fechas por segmento (MM / YYYY) ----------------
  const SEG = { 'dateSectionMonth-input': 'month', 'dateSectionYear-input': 'year', 'dateSectionDay-input': 'day' };
  const segPart = (el) => SEG[el.getAttribute('data-automation-id')] || (/dateSectionMonth/i.test(el.id) ? 'month' : /dateSectionYear/i.test(el.id) ? 'year' : /dateSectionDay/i.test(el.id) ? 'day' : null);

  /** Segmentos de la misma fecha (MM, AAAA, DD) en orden del documento. */
  function dateGroup(el) {
    let box = el.closest('[data-automation-id="dateInputWrapper"]');
    for (let n = el.parentElement, i = 0; !box && n && i < 3; n = n.parentElement, i++) {
      if ([...n.querySelectorAll('input')].filter(segPart).length > 1) box = n;
    }
    return box ? [...box.querySelectorAll('input')].filter(segPart) : [el];
  }

  /** Una tecla "de verdad": keydown; si nadie la cancela, se inserta en el elemento con foco. */
  function typeChar(ch) {
    const t = document.activeElement;
    const init = { key: ch, code: /\d/.test(ch) ? `Digit${ch}` : '', keyCode: ch.charCodeAt(0), which: ch.charCodeAt(0), bubbles: true, cancelable: true, composed: true };
    const go = t.dispatchEvent(new KeyboardEvent('keydown', init));
    t.dispatchEvent(new KeyboardEvent('keypress', init));
    if (go) {
      try {
        document.execCommand('insertText', false, ch);
      } catch (_) {
        /* ignore */
      }
    }
    t.dispatchEvent(new KeyboardEvent('keyup', init));
  }

  /**
   * Fechas de Workday: escribe todo el grupo como lo haría una persona
   * ("07" + "2024"), siguiendo el foco cuando Workday lo salta solo al año.
   * Sólo enfoca un segmento a mano si el foco no llegó ahí por sí mismo.
   */
  async function setDateSegment(f, value) {
    const d = value.date;
    const segs = dateGroup(f.el);
    const want = (el) => {
      const v = d[segPart(el)];
      return v == null ? null : segPart(el) === 'year' ? String(v) : String(v).padStart(2, '0');
    };
    const good = (el) => want(el) == null || (el.value && Number(el.value) === Number(want(el)));
    if (segs.every(good) && segs.every((el) => el.value)) return true;

    for (const el of segs) {
      const v = want(el);
      if (v == null) continue;
      if (document.activeElement !== el) {
        realClick(el);
        await sleep(40);
      }
      try {
        el.select();
      } catch (_) {
        /* ignore */
      }
      for (const ch of v) {
        if (!segs.includes(document.activeElement)) document.activeElement !== el && el.focus();
        typeChar(ch);
        await sleep(35);
      }
      await sleep(60);
    }
    // respaldo: si algún segmento no quedó, asignarlo directamente
    for (const el of segs) {
      if (good(el)) continue;
      setNativeValue(el, want(el));
      fire(el, 'input', { inputType: 'insertText', data: want(el) });
      fire(el, 'change');
    }
    const last = segs[segs.length - 1];
    blur(document.activeElement && segs.includes(document.activeElement) ? document.activeElement : last);
    await sleep(120);
    return segs.every(good);
  }

  async function setNativeDate(f, value) {
    setNativeValue(f.el, value);
    fire(f.el, 'input');
    fire(f.el, 'change');
    blur(f.el);
    return f.el.value === value;
  }

  // ---------------- archivo (CV) ----------------
  async function setFile(f, value) {
    const r = value.file;
    const bin = atob(r.dataB64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const file = new File([bytes], r.name, { type: r.type || 'application/pdf' });
    const dt = new DataTransfer();
    dt.items.add(file);
    f.el.files = dt.files;
    fire(f.el, 'input');
    fire(f.el, 'change');
    await sleep(800);
    return true;
  }

  async function apply(f, value) {
    switch (f.kind) {
      case 'text':
      case 'textarea':
        return setText(f, value);
      case 'select':
        return setSelect(f, value);
      case 'dropdown':
        return setDropdown(f, value);
      case 'multiselect':
        return setMultiselect(f, value);
      case 'checkbox':
        return setCheckbox(f, value);
      case 'radio':
        return setRadio(f, value);
      case 'date-month':
      case 'date-year':
      case 'date-day':
        return setDateSegment(f, value);
      case 'date-native':
        return setNativeDate(f, value);
      case 'file':
        return setFile(f, value);
      default:
        return false;
    }
  }

  WD.widgets = { apply, closePopups, visibleOptions };
})();
