// Reglas campo -> dato del perfil. El orden importa: las más específicas van
// primero ("número exterior" antes que "calle", "apellido materno" antes que
// "apellido"). Cada regla se prueba contra la etiqueta normalizada (sin
// acentos, minúsculas) y contra los tokens del id/data-automation-id.
(() => {
  const WD = (window.__WDAF = window.__WDAF || {});
  if (WD.rules) return;
  const { norm } = WD.utils;

  const TEXT = ['text', 'textarea'];
  const CHOICE = ['dropdown', 'select', 'multiselect', 'radio'];
  const ANY_VALUE = [...TEXT, ...CHOICE];
  const DATE = ['date-month', 'date-year', 'date-day', 'date-native'];

  const pick = (...vals) => vals.find((v) => v != null && v !== '' && !(Array.isArray(v) && !v.length));

  /** "2024-07" -> {year:'2024', month:'07'}; "2024" -> {year:'2024'} */
  function parseDate(s) {
    if (!s) return null;
    const m = String(s).match(/^(\d{4})(?:[-/](\d{1,2}))?(?:[-/](\d{1,2}))?/);
    if (!m) return null;
    return { year: m[1], month: m[2] ? m[2].padStart(2, '0') : null, day: m[3] ? m[3].padStart(2, '0') : null };
  }

  function dateValue(f, raw) {
    const d = parseDate(raw);
    if (!d) return null;
    if (f.kind === 'date-year') return d.year;
    if (f.kind === 'date-month') return d.month;
    if (f.kind === 'date-day') return d.day;
    if (f.kind === 'date-native') return `${d.year}-${d.month || '01'}-${d.day || '01'}`;
    return null;
  }

  const START = /\b(from|start|desde|inicio|de inicio|first year attended|fecha de ingreso)\b/;
  const END = /\b(to|end|hasta|fin|termino|last year attended|graduation|graduacion|egreso|expected)\b/;
  const isStart = (f) => /\b(start date|first year attended|from)\b/.test(f.tokens) || START.test(norm(f.label));
  const isEnd = (f) => /\b(end date|last year attended|to)\b/.test(f.tokens) || END.test(norm(f.label));

  // ---------- campos sueltos (no dentro de una sección repetible) ----------
  const TOP = [
    { name: 'Correo', label: /\b(e ?mail|correo)\b/, tokens: /\bemail\b/, kinds: TEXT, value: (c) => c.p.personal.email },
    { name: 'Apellido materno', label: /(second(ary)?|maternal|mother s) (last|family) name|apellido materno|segundo apellido/, tokens: /(secondary|second|maternal) (last|family) name|last name 2|family name 2/, kinds: TEXT, value: (c) => c.p.personal.secondLastName },
    { name: 'Segundo nombre', label: /middle name|segundo nombre|otros nombres/, tokens: /middle name/, kinds: TEXT, value: (c) => c.p.personal.middleName },
    { name: 'Nombre', label: /first name|given names?|primer nombre|nombre de pila|^nombres?( s)?$/, tokens: /first name|given name/, kinds: TEXT, value: (c) => c.p.personal.firstName },
    {
      name: 'Apellido',
      label: /last name|family name|surname|apellidos?|primer apellido/,
      tokens: /last name|family name/,
      kinds: TEXT,
      value: (c, f) => {
        const p = c.p.personal;
        const plural = /apellidos$/.test(norm(f.label));
        return c.hasSecondLastName && !plural ? p.lastName : pick(p.lastNameFull, [p.lastName, p.secondLastName].filter(Boolean).join(' '));
      },
    },
    { name: 'Nombre preferido', label: /preferred name|nombre preferido/, kinds: ['checkbox'], value: () => null },
    { name: 'Tipo de teléfono', label: /(phone )?device type|phone type|tipo de (telefono|dispositivo|numero)/, tokens: /phone type|device type/, kinds: CHOICE, value: (c) => pick(c.p.personal.phone.type, 'Mobile') },
    {
      name: 'Código de país (teléfono)',
      label: /country (phone )?code|phone country|codigo (telefonico )?de pais|codigo de area del pais|lada|prefijo/,
      tokens: /country phone code|phone code/,
      kinds: [...CHOICE, 'text'],
      value: (c, f) => {
        const ph = c.p.personal.phone;
        if (f.kind === 'text') return ph.countryCode;
        return [`${ph.countryName} (${ph.countryCode})`, ph.countryName, ph.countryCode];
      },
    },
    { name: 'Extensión', label: /\bextension\b|\bext\b/, tokens: /extension/, kinds: TEXT, value: () => null },
    {
      name: 'Teléfono',
      label: /phone|telefono|celular|movil|mobile|whatsapp/,
      tokens: /phone number|\bphone\b/,
      kinds: TEXT,
      value: (c) => (c.hasPhoneCode ? c.p.personal.phone.number : `${c.p.personal.phone.countryCode} ${c.p.personal.phone.number}`),
    },
    // --- domicilio (usa la dirección activa) ---
    { name: 'País', early: true, label: /^(country|pais|country territory|country region of residence|pais de residencia)$|^(country|pais)\b/, tokens: /^country country$|\bcountry\b(?! region| phone)/, exclude: /phone|code|codigo|citizenship|nacionalidad|birth|nacimiento|authoriz|autoriz|issu/, kinds: [...CHOICE, 'text'], value: (c) => c.addr?.country },
    { name: 'Número exterior', label: /exterior|num(ero)? ext|no ext|street number|house number|building number|numero de casa/, tokens: /exterior|street number|house number/, kinds: TEXT, value: (c) => c.addr?.exteriorNumber },
    { name: 'Número interior', label: /interior|apartment|\bapt\b|departamento|depto|suite|\bunit\b/, tokens: /interior|apartment/, kinds: TEXT, value: (c) => c.addr?.interiorNumber },
    { name: 'Colonia', label: /neighbou?rhood|colonia|suburb|district|barrio|fraccionamiento|asentamiento/, tokens: /neighbou?rhood|colonia|suburb/, kinds: [...TEXT, ...CHOICE], value: (c) => c.addr?.neighborhood },
    { name: 'Calle', label: /^street( name)?$|^calle$|^via$|^nombre de la calle/, tokens: /\bstreet name\b/, kinds: TEXT, value: (c) => (c.hasExteriorNumber ? pick(c.addr?.street, c.addr?.line1) : pick(c.addr?.line1, c.addr?.street)) },
    { name: 'Dirección completa', label: /full address|complete address|current address|home address|domicilio (completo|actual|particular)|direccion (completa|actual|particular)/, kinds: TEXT, value: (c) => pick(c.addr?.full, c.addr?.line1) },
    { name: 'Dirección línea 3', label: /address line 3|linea 3|direccion 3/, tokens: /address line 3/, kinds: TEXT, value: (c) => c.addr?.line3 },
    { name: 'Dirección línea 2', label: /address line 2|linea 2|direccion (linea )?2|address 2/, tokens: /address line 2/, kinds: TEXT, value: (c) => c.addr?.line2 },
    { name: 'Dirección línea 1', label: /address line 1|^address$|^direccion$|^domicilio|calle y numero|street address|direccion (linea )?1|^street$/, tokens: /address line 1/, kinds: TEXT, value: (c, f) => (f.kind === 'textarea' ? pick(c.addr?.full, c.addr?.line1) : c.addr?.line1) },
    { name: 'Municipio', label: /municipality|municipio|delegacion|alcaldia|county/, tokens: /municipality|county|region subdivision 1/, kinds: [...TEXT, ...CHOICE], value: (c) => c.addr?.municipality },
    { name: 'Ciudad', label: /\bcity\b|ciudad|localidad|\btown\b|poblacion/, tokens: /\bcity\b/, kinds: [...TEXT, ...CHOICE], value: (c) => c.addr?.city },
    { name: 'Código postal', label: /postal|\bzip\b|codigo postal|^c ?p$/, tokens: /postal|\bzip\b/, kinds: TEXT, value: (c) => c.addr?.postalCode },
    { name: 'Estado', label: /^(state|estado|province|provincia|region|entidad federativa|state province)\b|\bstate\b/, tokens: /country region|\bstate\b|\bprovince\b/, exclude: /civil|marital|status|estatus|united/, kinds: [...CHOICE, 'text'], value: (c) => c.addr?.state },
    // --- otros datos personales ---
    { name: 'Nacionalidad', label: /nationality|nacionalidad|citizenship|ciudadania/, kinds: [...CHOICE, 'text'], value: (c) => c.p.personal.nationality },
    { name: 'LinkedIn', label: /linked ?in/, tokens: /linked ?in/, kinds: TEXT, value: (c) => c.p.personal.linkedin },
    { name: 'GitHub', label: /github/, tokens: /github/, kinds: TEXT, value: (c) => c.p.personal.github },
    { name: 'Portafolio', label: /portfolio|portafolio|personal (website|site|url)|sitio web|pagina web|\bwebsite\b/, tokens: /portfolio|website/, kinds: ['text'], value: (c) => c.p.personal.portfolio },
    { name: '¿Cómo te enteraste?', label: /how did you (hear|learn|find)|como (te )?(enteraste|supiste|conociste|encontraste)|\bsource\b|fuente|medio por el cual|referral source/, tokens: /\bsource\b/, kinds: [...CHOICE, 'text'], value: (c) => c.p.preferences?.source },
    {
      name: 'Habilidades',
      label: /\bskills\b|habilidades|competencias|aptitudes|conocimientos tecnicos/,
      tokens: /\bskills\b/,
      kinds: ['multiselect', 'textarea', 'text'],
      value: (c, f) => (f.kind === 'multiselect' ? { multi: c.p.skills || [] } : (c.p.skills || []).join(', ')),
    },
    { name: 'Expectativa salarial', label: /salary|salario|sueldo|pretension|expectativa (economica|salarial)|compensation|remuneracion/, kinds: TEXT, value: (c) => c.p.preferences?.salaryExpectation },
    { name: 'Disponibilidad', label: /available to start|availability|disponibilidad|cuando podrias (iniciar|empezar)|fecha (disponible|de disponibilidad)/, kinds: TEXT, value: (c) => c.p.preferences?.availability },
    { name: 'Carta de presentación', label: /cover letter|carta (de )?presentacion|motivation|motivacion/, kinds: ['textarea'], value: (c) => c.p.coverLetter },
    { name: 'Resumen', label: /summary|resumen profesional|about (yourself|you)|acerca de ti|perfil profesional/, kinds: ['textarea'], value: (c) => c.p.summary },
    { name: 'CV (archivo)', label: /resume|\bcv\b|curriculum|hoja de vida|select files|seleccionar archivos|adjunt|upload|subir/, tokens: /resume|file upload|attachments?/, exclude: /cover|carta|transcript|kardex|certificad/, kinds: ['file'], value: (c) => (c.resume ? { file: c.resume } : null) },
  ];

  // ---------- secciones repetibles: value(c, f, entry) ----------
  const SECTION = {
    experience: [
      { name: 'Puesto', label: /job title|^title$|position|puesto|cargo|titulo del puesto/, tokens: /job title/, kinds: TEXT, value: (c, f, e) => e.title },
      { name: 'Empresa', label: /company|employer|empresa|compania|organi[sz]ation|organizacion/, tokens: /company/, kinds: [...TEXT, 'multiselect'], value: (c, f, e) => e.company },
      { name: 'Ubicación', label: /location|ubicacion|lugar|ciudad/, tokens: /location/, kinds: [...TEXT, 'multiselect'], value: (c, f, e) => e.location },
      { name: 'Trabajo actual', label: /currently work|i currently|actualmente|trabajo aqui|empleo actual|current(ly)? (job|role|position)/, tokens: /currently work/, kinds: ['checkbox'], value: (c, f, e) => !!e.current },
      { name: 'Fecha fin', test: isEnd, kinds: DATE, value: (c, f, e) => (e.current ? null : dateValue(f, e.end)) },
      { name: 'Fecha inicio', test: isStart, kinds: DATE, value: (c, f, e) => dateValue(f, e.start) },
      { name: 'Descripción', label: /description|responsibilit|descripcion|funciones|logros|achievements|duties/, tokens: /description/, kinds: ['textarea', 'text'], value: (c, f, e) => e.description },
    ],
    education: [
      { name: 'Escuela', label: /school|university|institution|college|universidad|escuela|institucion|centro educativo/, tokens: /school/, kinds: [...TEXT, ...CHOICE], value: (c, f, e) => e.school },
      { name: 'Título', label: /degree|titulo|grado|nivel (de )?estudios|nivel academico/, tokens: /degree/, kinds: [...CHOICE, ...TEXT], value: (c, f, e) => e.degree },
      { name: 'Carrera', label: /field of study|major|carrera|area de estudio|especialidad|discipline|campo de estudio|programa/, tokens: /field of study|major/, kinds: [...CHOICE, ...TEXT], value: (c, f, e) => e.fieldOfStudy },
      { name: 'Promedio', label: /\bgpa\b|grade average|promedio|overall result|calificacion/, tokens: /grade average|gpa/, kinds: TEXT, value: (c, f, e) => e.gpa },
      { name: 'Fecha fin', test: isEnd, kinds: DATE, value: (c, f, e) => dateValue(f, e.end) },
      { name: 'Fecha inicio', test: isStart, kinds: DATE, value: (c, f, e) => dateValue(f, e.start) },
    ],
    languages: [
      { name: 'Idioma nativo', label: /native|fluent|nativo|lengua materna/, kinds: ['checkbox'], value: (c, f, e) => !!e.native },
      {
        name: 'Nivel de idioma',
        label: /reading|lectura|speaking|conversacion|oral|habla|writing|escritura|redaccion|comprehension|comprension|listening|overall|proficiency|nivel|dominio|level/,
        tokens: /proficiency/,
        kinds: [...CHOICE, 'text'],
        value: (c, f, e) => {
          const l = norm(f.label);
          const lvl = e.levels || {};
          if (/reading|lectura|comprehension|comprension/.test(l)) return pick(lvl.reading, e.proficiency);
          if (/speaking|conversacion|oral|habla|listening/.test(l)) return pick(lvl.speaking, e.proficiency);
          if (/writing|escritura|redaccion/.test(l)) return pick(lvl.writing, e.proficiency);
          return e.proficiency;
        },
      },
      { name: 'Idioma', label: /language|idioma|lengua/, tokens: /\blanguage\b/, kinds: [...CHOICE, 'text'], value: (c, f, e) => e.language },
    ],
    websites: [{ name: 'URL', label: /url|website|sitio|web|link|enlace/, tokens: /url/, kinds: TEXT, value: (c, f, e) => (typeof e === 'string' ? e : e.url) }],
    certifications: [
      { name: 'Número de certificado', label: /number|numero|id\b|folio/, kinds: TEXT, value: (c, f, e) => e.number },
      { name: 'Emisor', label: /issuer|issued by|emisor|emitid|organization|organizacion/, kinds: [...TEXT, ...CHOICE], value: (c, f, e) => e.issuer },
      { name: 'Fecha', test: (f) => /issued|emision|obtained|obtencion|date|fecha/.test(norm(f.label)) || isStart(f), kinds: DATE, value: (c, f, e) => dateValue(f, e.date) },
      { name: 'Certificación', label: /certification|certificacion|license|licencia|name|nombre/, tokens: /certification/, kinds: [...TEXT, ...CHOICE], value: (c, f, e) => e.name },
    ],
  };

  const SECTION_PROFILE_KEY = { experience: 'experience', education: 'education', languages: 'languages', websites: 'websites', certifications: 'certifications' };

  function ruleMatches(rule, f) {
    if (rule.kinds && !rule.kinds.includes(f.kind)) return false;
    const label = norm(f.label + (f.kind === 'checkbox' && f.optionText ? ' ' + f.optionText : ''));
    if (rule.exclude && rule.exclude.test(label + ' ' + f.tokens)) return false;
    if (rule.test) return rule.test(f);
    return (rule.label && rule.label.test(label)) || (rule.tokens && rule.tokens.test(f.tokens));
  }

  /** Respuestas guardadas por el usuario: { "question": "regex", "answer": "No" } */
  function answerFor(ctx, f) {
    const label = norm(f.label + ' ' + (f.optionText || ''));
    if (!label) return null;
    for (const a of ctx.p.answers || []) {
      if (!a || !a.question || a.answer == null || a.answer === '') continue;
      let re;
      try {
        re = new RegExp(a.question.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase());
      } catch (_) {
        continue;
      }
      if (re.test(label)) {
        if (f.kind === 'checkbox') return { rule: 'Respuesta guardada', value: /^(yes|si|true|1)$/i.test(norm([].concat(a.answer)[0])) };
        const v = Array.isArray(a.answer) && TEXT.includes(f.kind) ? a.answer[0] : a.answer;
        return { rule: 'Respuesta guardada', value: v };
      }
    }
    return null;
  }

  /** Devuelve { rule, value } o null si no sabemos qué poner. value === null => saltar a propósito. */
  function resolve(ctx, f) {
    if (!f.section) {
      const ans = answerFor(ctx, f);
      if (ans) return ans;
      const rule = TOP.find((r) => ruleMatches(r, f));
      return rule ? { rule: rule.name, value: rule.value(ctx, f), early: !!rule.early } : null;
    }
    const entries = ctx.p[SECTION_PROFILE_KEY[f.section]] || [];
    const entry = entries[f.entryIndex];
    if (!entry) return null;
    const rule = (SECTION[f.section] || []).find((r) => ruleMatches(r, f));
    return rule ? { rule: rule.name, value: rule.value(ctx, f, entry) } : null;
  }

  WD.rules = { resolve, parseDate, TOP, SECTION };
})();
