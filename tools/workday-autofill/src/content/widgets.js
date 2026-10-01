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
  async function setDropdown(f, value) {
    const wanted = asList(value);
    const btn = f.el;
    const before = norm(text(btn));
    realClick(btn);
    const listbox = await waitFor(() => {
      const ctrl = btn.getAttribute('aria-controls') || btn.getAttribute('aria-owns');
      const lb = ctrl && document.getElementById(ctrl);
      if (lb && isVisible(lb)) return lb;
      const all = [...document.querySelectorAll('[role="listbox"]')].filter((l) => isVisible(l) && !l.closest('#wdaf-root'));
      return all[all.length - 1];
    }, { timeout: 2500 });
    if (!listbox) return false;
    let opts = await waitFor(() => {
      const o = visibleOptions(listbox);
      return o.length ? o : null;
    }, { timeout: 2500 });
    let best = opts && bestOption(opts, wanted);
    if (!best && opts) {
      // listas largas/virtualizadas: escribir para saltar a la opción
      for (const ch of String(wanted[0]).slice(0, 6)) {
        press(document.activeElement || listbox, ch);
        await sleep(60);
      }
      await sleep(300);
      opts = visibleOptions(listbox);
      best = bestOption(opts, wanted);
    }
    if (!best) {
      await closePopups();
      return false;
    }
    best.el.scrollIntoView({ block: 'nearest' });
    realClick(best.el);
    await waitFor(() => !isVisible(listbox) || norm(text(btn)) !== before, { timeout: 1500 });
    await sleep(120);
    if (isVisible(listbox)) await closePopups();
    return similarity(text(btn), best.text) >= 0.6 || norm(text(btn)).includes(norm(best.text));
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
  async function setDateSegment(f, value) {
    const v = String(value);
    const el = f.el;
    const same = () => el.value && Number(el.value) === Number(v);
    realClick(el);
    await typeInto(el, v);
    if (!same()) {
      // tecleo carácter por carácter: algunos segmentos sólo escuchan teclado
      setNativeValue(el, '');
      for (const ch of v) {
        press(el, ch);
        try {
          document.execCommand('insertText', false, ch);
        } catch (_) {
          /* ignore */
        }
        await sleep(25);
      }
    }
    blur(el);
    await sleep(60);
    return same();
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
