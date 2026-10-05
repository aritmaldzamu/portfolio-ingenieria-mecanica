// Descubre los campos del formulario y los describe: tipo de widget, etiqueta,
// tokens de id, sección repetible (experiencia, educación…) e índice de entrada.
// Funciona en cualquier sitio: inputs nativos, widgets ARIA (Google Forms,
// react-select, listas personalizadas), Workday y web components (Shadow DOM).
(() => {
  const WD = (window.__WDAF = window.__WDAF || {});
  if (WD.fields) return;
  const { norm, splitTokens, isUsable, isVisible, text, deepQueryAll, byId, labelFor } = WD.utils;

  // Secciones repetibles. `id` cubre ids de Workday (workExperience-29--jobTitle)
  // y `heading` cubre formularios donde sólo hay título visible.
  const SECTIONS = [
    { key: 'experience', id: /^(work ?experience|experience|employment)$/, heading: /work experience|employment history|experiencia (laboral|profesional)|historial laboral|empleos? anteriores|(?<!candidate )\bexperience( history)?( \d+)?$|^experiencia( \d+)?$|agregar experiencia|anadir experiencia/ },
    { key: 'education', id: /^education$/, heading: /\beducation\b|educacion|formacion academica|estudios/ },
    { key: 'languages', id: /^languages?$/, heading: /\blanguages?\b|idiomas?/ },
    { key: 'websites', id: /^(web ?address|websites?)$/, heading: /\bwebsites?\b|sitios? web|paginas? web/ },
    { key: 'certifications', id: /^certifications?$/, heading: /certifications?|certificaciones|certificados|licenses?|licencias/ },
  ];

  const ENTRY_ID_RE = /^([a-zA-Z]+)-(\d+)--/;

  function sectionFromIdPrefix(prefix) {
    const t = splitTokens(prefix);
    return SECTIONS.find((s) => s.id.test(t))?.key || null;
  }

  function sectionFromHeading(str) {
    const t = norm(str);
    return SECTIONS.find((s) => s.heading.test(t))?.key || null;
  }

  function labelledByText(el) {
    const ids = el.getAttribute('aria-labelledby');
    if (!ids) return '';
    return ids
      .split(/\s+/)
      .map((id) => text(byId(el, id)))
      .filter(Boolean)
      .join(' ');
  }

  function cleanLabel(s) {
    return String(s || '')
      .replace(/\*/g, ' ')
      .replace(/\b(required|requerido|obligatorio|select one|selecciona uno|seleccione uno|seleccione un valor|selecciona un valor)\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // botones tipo "píldora" Sí/No (Oracle Recruiting Cloud, etc.) se comportan como radios
  const isPill = (el) => el.hasAttribute?.('aria-pressed') && !el.hasAttribute('aria-haspopup');
  const isRoleRadio = (el) => el.type === 'radio' || el.getAttribute('role') === 'radio' || isPill(el);
  const isRoleCheckbox = (el) => el.type === 'checkbox' || el.getAttribute('role') === 'checkbox';
  const isChecked = (el) => !!el.checked || el.getAttribute('aria-checked') === 'true' || el.getAttribute('aria-pressed') === 'true';
  const pillGroup = (el) => el.closest('fieldset, [role="radiogroup"], [role="group"]') || el.parentElement?.parentElement || el.parentElement;

  /** Contenedor del campo: en Workday cada campo vive en data-automation-id="formField-…". */
  function fieldContainer(el) {
    return (
      el.closest('[data-automation-id^="formField"]') ||
      (isPill(el) && pillGroup(el)) ||
      (isRoleRadio(el) && el.closest('[role="radiogroup"]')) ||
      el.closest('fieldset') ||
      el.parentElement
    );
  }

  const HAS_FIELD = 'input:not([type="hidden"]), select, textarea, [role="radio"], [role="checkbox"], [role="combobox"], [role="listbox"]';

  /** Texto suelto junto al campo (formularios hechos a mano: <div>Nombre</div><input>). */
  function nearbyText(el) {
    let node = el;
    for (let depth = 0; depth < 4 && node && node !== document.body; depth++) {
      let sib = node.previousElementSibling;
      for (let k = 0; sib && k < 3; k++, sib = sib.previousElementSibling) {
        if (sib.matches(HAS_FIELD) || sib.querySelector(HAS_FIELD)) break;
        const t = text(sib);
        if (t && t.length < 200) return t;
      }
      node = node.parentElement;
    }
    return '';
  }

  /** Texto del grupo que contiene las listas Mes y Año de una misma fecha ("Fecha de inicio"). */
  function dateContext(el) {
    let a = el.parentElement;
    for (let i = 0; i < 3 && a; i++, a = a.parentElement) {
      if (a.querySelectorAll('select, [role="combobox"], input, button[aria-haspopup]').length >= 2) break;
    }
    if (!a) return '';
    const own = [...a.children].filter((c) => !c.matches(HAS_FIELD) && !c.querySelector(HAS_FIELD)).map(text).join(' ');
    return own || nearbyText(a);
  }

  /** Devuelve { label, raw } — raw conserva el "*" de obligatorio. */
  function resolveLabel(el, container) {
    const tries = [];
    const radio = isRoleRadio(el);
    const box = isRoleCheckbox(el);
    if (!radio) {
      const lab = labelFor(el);
      if (lab) tries.push(text(lab));
    }
    const wrapLabel = el.closest('label');
    if (wrapLabel && !radio && !box) tries.push(text(wrapLabel));
    if (radio) {
      const rg = el.closest('[role="radiogroup"]') || (isPill(el) && pillGroup(el));
      if (rg) tries.push(labelledByText(rg) || rg.getAttribute('aria-label') || text(rg.querySelector(':scope > legend')) || nearbyText(rg));
    }
    if (container && container.matches?.('[data-automation-id^="formField"]')) {
      const lab = container.querySelector('label, legend, [data-automation-id="richText"]');
      if (lab) tries.push(text(lab));
    }
    const fs = el.closest('fieldset');
    if (fs) {
      const lg = fs.querySelector('legend');
      if (lg) tries.push(text(lg));
    }
    if (!radio) {
      tries.push(labelledByText(el));
      tries.push(box ? '' : el.getAttribute('aria-label') || '');
    }
    tries.push(nearbyText(radio ? container || el : el));
    if (!radio) tries.push(el.getAttribute('placeholder') || '');
    tries.push(el.getAttribute('title') || '');
    if (box) tries.push(el.getAttribute('aria-label') || '');
    const raw = tries.find((t) => cleanLabel(t) && cleanLabel(t).length < 300) || '';
    return { label: cleanLabel(raw), raw };
  }

  /** Para checkboxes/radios: texto propio de la opción. */
  function optionLabel(el) {
    const lab = labelFor(el);
    if (lab) return text(lab);
    const wrap = el.closest('label');
    if (wrap) return text(wrap);
    return el.getAttribute('aria-label') || el.getAttribute('data-value') || labelledByText(el) || text(el) || el.value || '';
  }

  const HEAD_SEL = ':scope > h2, :scope > h3, :scope > h4, :scope > legend, :scope > [role="heading"], :scope > div > h2, :scope > div > h3, :scope > div > h4, :scope > header h2, :scope > header h3';

  /**
   * Título propio de un bloque. Si el bloque contiene otros títulos del mismo nivel
   * que NO son de esa sección (p.ej. el formulario entero), no es el bloque de la sección.
   */
  function ownHeading(n) {
    const h = n.querySelector(HEAD_SEL);
    if (!h) return '';
    const t = text(h);
    const key = sectionFromHeading(t);
    if (!key) return '';
    const peers = [...n.querySelectorAll(h.tagName)];
    if (peers.some((x) => x !== h && sectionFromHeading(text(x)) !== key)) return '';
    return t;
  }

  /** Sección y número de entrada (experiencia 1, 2…) del campo. */
  function locateSection(el) {
    // 1) ids de Workday: workExperience-29--jobTitle
    for (let n = el; n && n !== document.body; n = n.parentElement) {
      const m = (n.id || '').match(ENTRY_ID_RE) || (n.getAttribute?.('data-automation-id') || '').match(ENTRY_ID_RE);
      if (m) {
        const key = sectionFromIdPrefix(m[1]);
        if (key) return { section: key, entryKey: `${m[1]}-${m[2]}`, entryEl: null };
      }
    }
    // 2) grupos con título "Work Experience 2" dentro de la sección "Work Experience"
    let entryEl = null;
    let entryKey = null;
    for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
      const aid = n.getAttribute('data-automation-id') || '';
      const title = labelledByText(n) || ownHeading(n);
      const key = sectionFromHeading(title) || sectionFromIdPrefix(aid.replace(/Section$/, '').replace(/[-_]?\d+$/, ''));
      if (!key) continue;
      const numbered = title.match(/(\d+)\s*$/) || aid.match(/(\d+)$/);
      if (numbered && !entryEl) {
        entryEl = n;
        entryKey = `${key}-${numbered[1]}`;
        continue;
      }
      // una sección con título pero sin entradas numeradas en un formulario genérico
      // ("Educación" con un solo bloque de campos) cuenta como su primera entrada
      return { section: key, entryKey: entryKey || `${key}-single`, entryEl: entryEl || n };
    }
    if (entryEl) return { section: entryKey.split('-')[0], entryKey, entryEl };
    return { section: null, entryKey: null, entryEl: null };
  }

  const DATE_FMT_RE = /^(mm|dd|yyyy|aaaa|yy)([\/\-. ](mm|dd|yyyy|aaaa|yy)){1,2}$/i;

  function kindOf(el) {
    const aid = el.getAttribute('data-automation-id') || '';
    const tag = el.tagName;
    const role = el.getAttribute('role');
    if (tag === 'SELECT') return 'select';
    if (tag === 'TEXTAREA') return 'textarea';
    if (tag !== 'INPUT') {
      if (role === 'radio' || isPill(el)) return 'radio';
      if (role === 'checkbox') return 'checkbox';
      if (role === 'textbox' && el.isContentEditable) return null;
      return 'dropdown'; // button/div con listbox
    }
    const type = (el.getAttribute('type') || 'text').toLowerCase();
    if (type === 'checkbox') return 'checkbox';
    if (type === 'radio') return 'radio';
    if (type === 'file') return 'file';
    if (/dateSectionMonth/i.test(aid) || /dateSectionMonth/i.test(el.id)) return 'date-month';
    if (/dateSectionYear/i.test(aid) || /dateSectionYear/i.test(el.id)) return 'date-year';
    if (/dateSectionDay/i.test(aid) || /dateSectionDay/i.test(el.id)) return 'date-day';
    if (type === 'date' || type === 'month') return 'date-native';
    // fecha escrita como texto con formato en el placeholder: "mm/dd/yyyy", "dd/mm/aaaa", "MM/YYYY"
    if (DATE_FMT_RE.test((el.getAttribute('placeholder') || el.getAttribute('data-format') || '').trim())) return 'date-text';
    // lista desplegable hecha con un input de sólo lectura: se abre con clic y se elige
    if (el.readOnly && (role === 'combobox' || el.hasAttribute('aria-haspopup') || el.hasAttribute('aria-owns'))) return 'dropdown';
    if (aid === 'searchBox' || el.closest('[data-automation-id="multiselectInputContainer"]') || el.getAttribute('data-uxi-widget-type') === 'selectinput') return 'multiselect';
    if (role === 'combobox' || el.getAttribute('aria-autocomplete') === 'list' || el.getAttribute('aria-autocomplete') === 'both') return 'combobox';
    if (['text', 'email', 'tel', 'url', 'number', 'search', ''].includes(type)) return 'text';
    return null;
  }

  function isRequired(el, container, raw) {
    if (el.required || el.getAttribute('aria-required') === 'true') return true;
    const group = el.closest('[role="radiogroup"]');
    if (group?.getAttribute('aria-required') === 'true') return true;
    if (container?.querySelector?.('[aria-required="true"], abbr[title="required"], [data-automation-id="requiredIndicator"]')) return true;
    const lab = container?.querySelector?.('label, legend');
    return /\*/.test(raw) || (!!lab && /\*/.test(text(lab)));
  }

  const SELECTOR = [
    'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="password"]):not([type="image"]):not([type="range"]):not([type="color"])',
    'textarea',
    'select',
    'button[aria-haspopup="listbox"]',
    '[role="button"][aria-haspopup="listbox"]',
    '[role="combobox"]:not(input)',
    '[role="listbox"][aria-expanded]',
    '[role="radio"]:not(input)',
    '[role="checkbox"]:not(input)',
    'button[aria-pressed]',
    '[role="button"][aria-pressed]',
  ].join(',');

  /** Lista de campos visibles. Radios se agrupan (por name o por radiogroup) en un solo campo. */
  function scan() {
    const out = [];
    const radioGroups = new Map();
    const seen = new Set();
    for (const el of deepQueryAll(SELECTOR)) {
      if (seen.has(el)) continue;
      seen.add(el);
      if (el.closest('#wdaf-root')) continue;
      if (!isUsable(el)) continue;
      const kind = kindOf(el);
      if (!kind) continue;
      // opciones dentro de un menú abierto, o fichas de selección: no son campos
      if (el.parentElement?.closest('[role="listbox"], [role="menu"]')) continue;
      // un combobox ARIA que envuelve a un <input>: el input es el campo
      if (kind === 'dropdown' && el.querySelector('input:not([type="hidden"])')) continue;
      const container = fieldContainer(el);
      const { label, raw } = resolveLabel(el, container);
      const tokens = [el.id, el.name, el.getAttribute('data-automation-id'), el.getAttribute('autocomplete'), container?.getAttribute?.('data-automation-id')].filter(Boolean).map(splitTokens).join(' ');
      const loc = locateSection(el);
      if (kind === 'radio') {
        const gkey = (el.type === 'radio' && el.name) || (isPill(el) && pillGroup(el)) || el.closest('[role="radiogroup"]') || container || label;
        if (!radioGroups.has(gkey)) {
          const f = { el, kind, label, tokens, container, options: [], required: false, ...loc };
          radioGroups.set(gkey, f);
          out.push(f);
        }
        const g = radioGroups.get(gkey);
        g.options.push({ el, text: optionLabel(el) });
        g.required = g.required || isRequired(el, container, raw);
        continue;
      }
      // pista extra (aria-label/placeholder) para listas Mes/Año dentro de "Fecha de inicio"
      const hint = norm([el.getAttribute('aria-label'), el.getAttribute('placeholder'), el.getAttribute('title'), el.tagName === 'SELECT' ? el.options[0]?.text : ''].filter(Boolean).join(' '));
      // listas Mes/Año: el contexto ("Fecha de inicio") suele estar en el texto del grupo
      const ctx = /\b(month|mes|year|ano)\b/.test(hint + ' ' + norm(label)) ? norm(dateContext(el)) : '';
      out.push({ el, kind, label, hint, ctx, tokens, container, required: isRequired(el, container, raw), optionText: kind === 'checkbox' ? optionLabel(el) : '', ...loc });
    }
    // índice de entrada dentro de su sección, en orden del documento
    const bySection = {};
    for (const f of out) {
      if (!f.section) continue;
      const list = (bySection[f.section] = bySection[f.section] || []);
      if (!list.includes(f.entryKey)) list.push(f.entryKey);
      f.entryIndex = list.indexOf(f.entryKey);
    }
    // botones de alternar sueltos (negritas, favoritos…) no son preguntas: exigir ≥2 opciones
    for (let i = out.length - 1; i >= 0; i--) if (isPill(out[i].el) && out[i].options.length < 2) out.splice(i, 1);
    return { fields: out, entryCounts: Object.fromEntries(Object.entries(bySection).map(([k, v]) => [k, v.length])) };
  }

  const PLACEHOLDER_RE = /^(select|selecciona|seleccione|seleccionar|choose|elige|escoge|please select|por favor seleccione|start typing|empieza a escribir)\b/;

  /** Valor visible de un combobox tipo react-select (el input queda vacío y el valor va al lado). */
  function comboDisplay(f) {
    if (f.el.value) return f.el.value;
    const shown = f.container?.querySelector?.('[class*="single-value"], [class*="singleValue"], [class*="multi-value"], [class*="multiValue"], [class*="selected-value"]');
    return shown ? text(shown) : '';
  }

  function pillTexts(f) {
    const box = f.el.closest('[data-automation-id="multiSelectContainer"], [data-automation-id="multiselectInputContainer"]')?.parentElement || f.container;
    return [...(box?.querySelectorAll('[data-automation-id="selectedItem"], [data-automation-id="promptSelectionLabel"], [data-automation-id="selectedItemList"] li, [role="listitem"], [role="option"]') || [])]
      .filter(isVisible)
      .map(text)
      .filter(Boolean);
  }

  /** ¿El campo está vacío? (para no pisar lo que ya llenaste o lo que el sitio pre-llenó). */
  function isEmpty(f) {
    const el = f.el;
    switch (f.kind) {
      case 'text':
      case 'textarea':
      case 'date-month':
      case 'date-year':
      case 'date-day':
      case 'date-native':
      case 'date-text':
        return !el.value || /^(mm|yyyy|aaaa|dd)$/i.test(el.value.trim()) || DATE_FMT_RE.test(el.value.trim());
      case 'select':
        return !el.value || el.selectedIndex <= 0;
      case 'dropdown': {
        const t = norm((el.tagName === 'INPUT' ? el.value : text(el)) || (el.tagName === 'INPUT' ? '' : el.getAttribute('aria-label')) || '');
        return !t || PLACEHOLDER_RE.test(t) || /^(none|ninguno|\-+)$/.test(t) || norm(t) === norm(f.label);
      }
      case 'multiselect':
        return !pillTexts(f).length && !el.value;
      case 'combobox':
        return !comboDisplay(f);
      case 'radio':
        return !f.options.some((o) => isChecked(o.el));
      case 'checkbox':
        return !isChecked(el);
      case 'file':
        return !(el.files && el.files.length) && !f.container?.querySelector?.('[data-automation-id="file-upload-item"], [data-automation-id="file-upload-successful"]');
      default:
        return true;
    }
  }

  /** Lo que el campo tiene ahora, como texto (para aprender tus respuestas). */
  function readValue(f) {
    if (isEmpty(f)) return null;
    const el = f.el;
    switch (f.kind) {
      case 'select':
        return el.options[el.selectedIndex]?.text?.trim() || null;
      case 'dropdown':
        return (el.tagName === 'INPUT' ? el.value : text(el)) || null;
      case 'multiselect': {
        const p = pillTexts(f);
        return p.length > 1 ? p : p[0] || null;
      }
      case 'combobox':
        return comboDisplay(f) || null;
      case 'radio':
        return f.options.find((o) => isChecked(o.el))?.text?.trim() || null;
      case 'checkbox':
        return isChecked(el);
      case 'file':
        return null;
      default:
        return el.value || null;
    }
  }

  WD.fields = { scan, isEmpty, readValue, isChecked, sectionFromHeading, SECTIONS, fieldContainer, DATE_FMT_RE };
})();
