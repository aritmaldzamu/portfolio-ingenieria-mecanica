// Utilidades compartidas: normalización de texto, esperas, visibilidad y
// escritura "real" en inputs controlados por React (Workday).
(() => {
  const WD = (window.__WDAF = window.__WDAF || {});
  if (WD.utils) return;

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  /** minúsculas, sin acentos, sin signos; "Código Postal*" -> "codigo postal" */
  function norm(s) {
    return String(s ?? '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9+]+/g, ' ')
      .trim();
  }

  /** "workExperience-29--startDate-dateSectionMonth-input" -> "work experience 29 start date date section month input" */
  function splitTokens(s) {
    return norm(
      String(s ?? '')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/([a-zA-Z])(\d)/g, '$1 $2')
    );
  }

  async function waitFor(fn, { timeout = 3000, interval = 60 } = {}) {
    const end = Date.now() + timeout;
    for (;;) {
      let v;
      try {
        v = fn();
      } catch (_) {
        v = null;
      }
      if (v) return v;
      if (Date.now() > end) return null;
      await sleep(interval);
    }
  }

  function isVisible(el) {
    if (!el || !el.isConnected) return false;
    if (el.closest('[aria-hidden="true"], [hidden]')) return false;
    const rects = el.getClientRects();
    if (!rects.length) return false;
    const st = getComputedStyle(el);
    return st.visibility !== 'hidden' && st.display !== 'none' && Number(st.opacity) !== 0;
  }

  /** Visible o, si es un input oculto con un widget visible alrededor (radios/checkbox estilizados). */
  function isUsable(el) {
    if (el.disabled || el.getAttribute('aria-disabled') === 'true') return false;
    // un input de sólo lectura que abre un menú (Oracle cx-select, Oracle JET) sí se puede usar
    if (el.readOnly && !(el.getAttribute('role') === 'combobox' || el.hasAttribute('aria-haspopup') || el.hasAttribute('aria-owns') || el.hasAttribute('aria-controls'))) return false;
    if (isVisible(el)) return true;
    if (el.type === 'radio' || el.type === 'checkbox' || el.type === 'file') {
      const host = el.closest('label, [data-automation-id^="formField"], div');
      return host ? isVisible(host) : false;
    }
    return false;
  }

  function setNativeValue(el, value) {
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
    setter.call(el, value);
  }

  function fire(el, type, init = {}) {
    const Ctor = /^key/.test(type) ? KeyboardEvent : /^(pointer)/.test(type) ? PointerEvent : /^(mouse|click)/.test(type) ? MouseEvent : /^(focus|blur)/.test(type) ? FocusEvent : Event;
    el.dispatchEvent(new Ctor(type, { bubbles: true, cancelable: true, composed: true, view: window, ...init }));
  }

  function press(el, key) {
    const codes = { Enter: 13, Escape: 27, Tab: 9, ArrowDown: 40, Backspace: 8 };
    const init = { key, code: key, keyCode: codes[key] || 0, which: codes[key] || 0 };
    fire(el, 'keydown', init);
    if (key === 'Enter') fire(el, 'keypress', init);
    fire(el, 'keyup', init);
  }

  /** Secuencia completa de puntero; algunos widgets de Workday escuchan mousedown y no click. */
  function realClick(el) {
    el.scrollIntoView?.({ block: 'center', inline: 'nearest' });
    const r = el.getBoundingClientRect();
    const pos = { clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, button: 0 };
    fire(el, 'pointerover', pos);
    fire(el, 'mouseover', pos);
    fire(el, 'pointerdown', pos);
    fire(el, 'mousedown', pos);
    el.focus?.({ preventScroll: true });
    fire(el, 'pointerup', pos);
    fire(el, 'mouseup', pos);
    el.click();
  }

  /**
   * Escribe en un input controlado por React. Primero execCommand (genera eventos
   * de entrada reales); si el valor no quedó, setter nativo + eventos.
   */
  async function typeInto(el, value) {
    value = String(value);
    el.scrollIntoView?.({ block: 'center' });
    el.focus();
    fire(el, 'focusin');
    try {
      el.select?.();
    } catch (_) {
      /* inputs tipo number no soportan select() */
    }
    let ok = false;
    try {
      ok = document.execCommand('selectAll') && document.execCommand('insertText', false, value);
    } catch (_) {
      ok = false;
    }
    if (!ok || el.value !== value) {
      setNativeValue(el, value);
      fire(el, 'input', { inputType: 'insertText', data: value });
    }
    fire(el, 'change');
    await sleep(30);
    return el.value === value;
  }

  function blur(el) {
    fire(el, 'blur');
    fire(el, 'focusout');
    el.blur?.();
  }

  /** Similitud 0..1 entre dos textos normalizados. */
  function similarity(a, b) {
    a = norm(a);
    b = norm(b);
    if (!a || !b) return 0;
    if (a === b) return 1;
    // "Mexico (+52)" vs "mexico"
    if (a.startsWith(b + ' ') || b.startsWith(a + ' ')) return 0.92;
    const ta = new Set(a.split(' '));
    const tb = new Set(b.split(' '));
    let inter = 0;
    for (const t of ta) if (tb.has(t)) inter++;
    const dice = (2 * inter) / (ta.size + tb.size);
    const contains = a.includes(b) || b.includes(a) ? 0.8 : 0;
    return Math.max(dice, contains * Math.min(1, Math.min(a.length, b.length) / 3));
  }

  // Equivalencias ES/EN para opciones de listas desplegables.
  const ALIASES = [
    ['mexico', 'mexico', 'mx', 'estados unidos mexicanos'],
    ['united states', 'estados unidos', 'usa', 'united states of america', 'eeuu', 'ee uu'],
    ['nuevo leon', 'n l', 'nl'],
    ['puebla', 'pue'],
    ['spanish', 'espanol', 'castellano'],
    ['english', 'ingles'],
    ['german', 'aleman', 'deutsch'],
    ['french', 'frances'],
    ['portuguese', 'portugues'],
    ['mobile', 'movil', 'celular', 'cell', 'cellular', 'mobile phone'],
    ['home', 'casa', 'particular'],
    ['yes', 'si'],
    ['no', 'no'],
    ['native', 'nativo', 'lengua materna', 'native or bilingual'],
    ['fluent', 'fluido', 'fluent proficiency'],
    ['advanced', 'avanzado'],
    ['intermediate', 'intermedio'],
    ['beginner', 'basico', 'basic', 'principiante', 'elementary'],
    ['bachelor', 'licenciatura', 'ingenieria', 'bachelors degree', 'bachelor s degree', 'licenciado'],
    ['male', 'masculino', 'hombre'],
    ['female', 'femenino', 'mujer'],
    ['linkedin', 'linked in'],
  ];

  function expandAliases(value) {
    const n = norm(value);
    const out = [value];
    for (const group of ALIASES) {
      if (group.includes(n)) for (const g of group) if (g !== n) out.push(g);
    }
    return out;
  }

  /** Mejor opción (elemento) para una lista de valores candidatos. */
  function bestOption(options, wanted, minScore = 0.6) {
    const candidates = (Array.isArray(wanted) ? wanted : [wanted]).filter((v) => v != null && v !== '');
    let best = null;
    let bestScore = 0;
    candidates.forEach((cand, ci) => {
      for (const alias of expandAliases(cand)) {
        for (const opt of options) {
          // los primeros candidatos tienen leve prioridad
          const s = similarity(opt.text, alias) - ci * 0.01;
          if (s > bestScore) {
            bestScore = s;
            best = opt;
          }
        }
      }
    });
    return bestScore >= minScore ? best : null;
  }

  function text(el) {
    return (el?.innerText ?? el?.textContent ?? '').replace(/\s+/g, ' ').trim();
  }

  /** querySelectorAll que también entra a web components (Shadow DOM abierto). */
  // ¿la página usa web components? (se revisa como máximo cada 2 s; recorrer todo el DOM cuesta)
  let shadowCheckedAt = 0;
  let pageHasShadow = false;
  function hasShadow() {
    if (Date.now() - shadowCheckedAt > 2000) {
      shadowCheckedAt = Date.now();
      pageHasShadow = false;
      const w = document.createTreeWalker(document, NodeFilter.SHOW_ELEMENT);
      for (let n = w.currentNode; n; n = w.nextNode()) {
        if (n.shadowRoot && n.id !== 'wdaf-root') {
          pageHasShadow = true;
          break;
        }
      }
    }
    return pageHasShadow;
  }

  function deepQueryAll(selector, root = document) {
    const out = [...root.querySelectorAll(selector)];
    if (root === document && !hasShadow()) return out;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    for (let n = walker.currentNode; n; n = walker.nextNode()) {
      if (n.shadowRoot && n.id !== 'wdaf-root') out.push(...deepQueryAll(selector, n.shadowRoot));
    }
    return out;
  }

  /** document o shadowRoot del elemento (para label[for] / getElementById dentro de web components). */
  const rootOf = (el) => {
    const r = el?.getRootNode?.();
    return r && r.querySelector ? r : document;
  };
  const byId = (el, id) => (id ? rootOf(el).getElementById?.(id) || document.getElementById(id) : null);
  const labelFor = (el) => (el.id ? rootOf(el).querySelector(`label[for="${CSS.escape(el.id)}"]`) : null);

  WD.utils = { deepQueryAll, rootOf, byId, labelFor, sleep, norm, splitTokens, waitFor, isVisible, isUsable, setNativeValue, fire, press, realClick, typeInto, blur, similarity, bestOption, expandAliases, text };
})();
