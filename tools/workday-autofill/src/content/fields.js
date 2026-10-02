// Descubre los campos del formulario y los describe: tipo de widget, etiqueta,
// tokens de id, sección repetible (experiencia, educación…) e índice de entrada.
(() => {
  const WD = (window.__WDAF = window.__WDAF || {});
  if (WD.fields) return;
  const { norm, splitTokens, isUsable, isVisible, text } = WD.utils;

  // Secciones repetibles de Workday. `id` cubre ids nuevos (workExperience-29--jobTitle)
  // y `heading` cubre tenants viejos o en español donde sólo hay título visible.
  const SECTIONS = [
    { key: 'experience', id: /^(work ?experience|experience|employment)$/, heading: /work experience|employment history|experiencia (laboral|profesional)|historial laboral|empleos? anteriores/ },
    { key: 'education', id: /^education$/, heading: /\beducation\b|educacion|formacion academica|estudios/ },
    { key: 'languages', id: /^languages?$/, heading: /\blanguages?\b|idiomas?/ },
    { key: 'websites', id: /^(web ?address|websites?)$/, heading: /\bwebsites?\b|sitios? web|paginas? web/ },
    { key: 'certifications', id: /^certifications?$/, heading: /certifications?|certificaciones|licenses?|licencias/ },
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
      .map((id) => text(document.getElementById(id)))
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

  /** Contenedor del campo: en Workday cada campo vive en data-automation-id="formField-…". */
  function fieldContainer(el) {
    return el.closest('[data-automation-id^="formField"]') || el.closest('fieldset') || el.parentElement;
  }

  function resolveLabel(el, container) {
    const tries = [];
    const isRadio = el.type === 'radio';
    if (el.id && !isRadio) {
      const lab = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (lab) tries.push(text(lab));
    }
    const wrapLabel = el.closest('label');
    if (wrapLabel && !isRadio && el.type !== 'checkbox') tries.push(text(wrapLabel));
    if (isRadio) {
      const rg = el.closest('[role="radiogroup"]');
      if (rg) tries.push(labelledByText(rg) || rg.getAttribute('aria-label') || '');
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
    if (!isRadio) {
      tries.push(labelledByText(el));
      tries.push(el.getAttribute('aria-label') || '');
    }
    tries.push(el.getAttribute('placeholder') || '');
    tries.push(el.getAttribute('title') || '');
    const first = tries.map(cleanLabel).find((t) => t && t.length < 300);
    return first || '';
  }

  /** Para checkboxes/radios: texto propio de la opción. */
  function optionLabel(el) {
    if (el.id) {
      const lab = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (lab) return text(lab);
    }
    const wrap = el.closest('label');
    if (wrap) return text(wrap);
    return el.getAttribute('aria-label') || labelledByText(el) || el.value || '';
  }

  /** Sección y número de entrada (experiencia 1, 2…) del campo. */
  function locateSection(el) {
    // 1) ids nuevos de Workday: workExperience-29--jobTitle
    for (let n = el; n && n !== document.body; n = n.parentElement) {
      const m = (n.id || '').match(ENTRY_ID_RE) || (n.getAttribute?.('data-automation-id') || '').match(ENTRY_ID_RE);
      if (m) {
        const key = sectionFromIdPrefix(m[1]);
        if (key) return { section: key, entryKey: `${m[1]}-${m[2]}`, entryEl: null };
      }
    }
    // 2) tenants viejos: grupos con título "Work Experience 2" dentro de la sección "Work Experience"
    let entryEl = null;
    let entryKey = null;
    for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
      const aid = n.getAttribute('data-automation-id') || '';
      const title = labelledByText(n) || (n.matches('[role="group"], section, fieldset') ? text(n.querySelector(':scope > h2, :scope > h3, :scope > h4, :scope > div > h3, :scope > div > h4, :scope > legend')) : '');
      const key = sectionFromHeading(title) || sectionFromIdPrefix(aid.replace(/Section$/, '').replace(/[-_]?\d+$/, ''));
      if (!key) continue;
      const numbered = title.match(/(\d+)\s*$/) || aid.match(/(\d+)$/);
      if (numbered && !entryEl) {
        entryEl = n;
        entryKey = `${key}-${numbered[1]}`;
        continue;
      }
      return { section: key, entryKey: entryKey || `${key}-single`, entryEl: entryEl || n };
    }
    if (entryEl) return { section: entryKey.split('-')[0], entryKey, entryEl };
    return { section: null, entryKey: null, entryEl: null };
  }

  function kindOf(el) {
    const aid = el.getAttribute('data-automation-id') || '';
    const tag = el.tagName;
    if (tag === 'SELECT') return 'select';
    if (tag === 'TEXTAREA') return 'textarea';
    if (tag === 'BUTTON') return 'dropdown';
    const type = (el.getAttribute('type') || 'text').toLowerCase();
    if (type === 'checkbox') return 'checkbox';
    if (type === 'radio') return 'radio';
    if (type === 'file') return 'file';
    if (/dateSectionMonth/i.test(aid) || /dateSectionMonth/i.test(el.id)) return 'date-month';
    if (/dateSectionYear/i.test(aid) || /dateSectionYear/i.test(el.id)) return 'date-year';
    if (/dateSectionDay/i.test(aid) || /dateSectionDay/i.test(el.id)) return 'date-day';
    if (type === 'date') return 'date-native';
    if (aid === 'searchBox' || el.closest('[data-automation-id="multiselectInputContainer"]') || el.getAttribute('data-uxi-widget-type') === 'selectinput') return 'multiselect';
    if (['text', 'email', 'tel', 'url', 'number', 'search', ''].includes(type)) return 'text';
    return null;
  }

  function isRequired(el, container, label) {
    if (el.required || el.getAttribute('aria-required') === 'true') return true;
    if (container?.querySelector?.('[aria-required="true"], abbr[title="required"], [data-automation-id="requiredIndicator"]')) return true;
    const raw = container ? text(container.querySelector('label, legend')) : '';
    return /\*/.test(raw) || /\*/.test(label);
  }

  const SELECTOR = [
    'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="password"]):not([type="image"])',
    'textarea',
    'select',
    'button[aria-haspopup="listbox"]',
  ].join(',');

  /** Lista de campos visibles. Radios se agrupan por name en un solo campo. */
  function scan(root = document) {
    const out = [];
    const radioGroups = new Map();
    for (const el of root.querySelectorAll(SELECTOR)) {
      if (el.closest('#wdaf-root')) continue;
      if (!isUsable(el)) continue;
      const kind = kindOf(el);
      if (!kind) continue;
      // checkboxes que en realidad son opciones de un listbox abierto
      if (el.closest('[role="listbox"]')) continue;
      const container = fieldContainer(el);
      const label = resolveLabel(el, container);
      const tokens = [el.id, el.name, el.getAttribute('data-automation-id'), container?.getAttribute?.('data-automation-id')].filter(Boolean).map(splitTokens).join(' ');
      const loc = locateSection(el);
      if (kind === 'radio') {
        const gkey = el.name || label;
        if (!radioGroups.has(gkey)) {
          const f = { el, kind, label, tokens, container, options: [], required: false, ...loc };
          radioGroups.set(gkey, f);
          out.push(f);
        }
        const g = radioGroups.get(gkey);
        g.options.push({ el, text: optionLabel(el) });
        g.required = g.required || isRequired(el, container, label);
        continue;
      }
      out.push({ el, kind, label, tokens, container, required: isRequired(el, container, label), optionText: kind === 'checkbox' ? optionLabel(el) : '', ...loc });
    }
    // índice de entrada dentro de su sección, en orden del documento
    const bySection = {};
    for (const f of out) {
      if (!f.section) continue;
      const list = (bySection[f.section] = bySection[f.section] || []);
      if (!list.includes(f.entryKey)) list.push(f.entryKey);
      f.entryIndex = list.indexOf(f.entryKey);
    }
    return { fields: out, entryCounts: Object.fromEntries(Object.entries(bySection).map(([k, v]) => [k, v.length])) };
  }

  /** ¿El campo está vacío? (para no pisar lo que ya llenaste o lo que Workday pre-llenó). */
  function isEmpty(f) {
    const el = f.el;
    switch (f.kind) {
      case 'text':
      case 'textarea':
      case 'date-month':
      case 'date-year':
      case 'date-day':
      case 'date-native':
        return !el.value || /^(mm|yyyy|aaaa|dd)$/i.test(el.value.trim());
      case 'select':
        return !el.value || el.selectedIndex <= 0;
      case 'dropdown': {
        const t = norm(text(el));
        return !t || /^(select|selecciona|seleccione|seleccionar|choose|elige|escoge|please select|por favor seleccione)\b/.test(t) || /^(none|ninguno|\-+)$/.test(t);
      }
      case 'multiselect': {
        const box = el.closest('[data-automation-id="multiSelectContainer"], [data-automation-id="multiselectInputContainer"]')?.parentElement || f.container;
        const pills = box?.querySelectorAll('[data-automation-id="selectedItem"], [data-automation-id="promptSelectionLabel"], [data-automation-id="selectedItemList"] li, [role="listitem"], [role="option"]') || [];
        return ![...pills].some(isVisible) && !el.value;
      }
      case 'radio':
        return !f.options.some((o) => o.el.checked);
      case 'checkbox':
        return !el.checked;
      case 'file':
        return !(el.files && el.files.length) && !f.container?.querySelector?.('[data-automation-id="file-upload-item"], [data-automation-id="file-upload-successful"]');
      default:
        return true;
    }
  }

  WD.fields = { scan, isEmpty, sectionFromHeading, SECTIONS, fieldContainer };
})();
