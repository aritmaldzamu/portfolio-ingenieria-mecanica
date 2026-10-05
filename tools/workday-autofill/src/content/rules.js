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
  const DATE = ['date-month', 'date-year', 'date-day', 'date-native', 'date-text'];

  const first = (v) => (Array.isArray(v) ? v[0] : v);
  const pick = (...vals) => vals.find((v) => v != null && v !== '' && !(Array.isArray(v) && !v.length));

  /** "2024-07" -> {year:'2024', month:'07'}; "2024" -> {year:'2024'} */
  function parseDate(s) {
    if (!s) return null;
    const m = String(s).match(/^(\d{4})(?:[-/](\d{1,2}))?(?:[-/](\d{1,2}))?/);
    if (!m) return null;
    return { year: m[1], month: m[2] ? m[2].padStart(2, '0') : null, day: m[3] ? m[3].padStart(2, '0') : null };
  }

  function fullName(p) {
    const per = p.personal || {};
    return [per.firstName, per.middleName, pick(per.lastNameFull, [per.lastName, per.secondLastName].filter(Boolean).join(' '))].filter(Boolean).join(' ');
  }

  function dateValue(f, raw) {
    const d = parseDate(raw);
    if (!d) return null;
    // segmentos (MM / AAAA / DD): se pasa la fecha completa; el widget llena todo el grupo
    const part = { 'date-year': 'year', 'date-month': 'month', 'date-day': 'day' }[f.kind];
    if (part) return d[part] ? { date: d, part } : null;
    if (f.kind === 'date-text') {
      // respeta el formato del placeholder: mm/dd/yyyy, dd/mm/aaaa, MM/YYYY…
      const fmt = (f.el.getAttribute('placeholder') || f.el.getAttribute('data-format') || 'mm/dd/yyyy').trim();
      return fmt.replace(/yyyy|aaaa|yy|mm|dd/gi, (t) => {
        const k = t.toLowerCase();
        if (k === 'yyyy' || k === 'aaaa') return d.year;
        if (k === 'yy') return d.year.slice(2);
        if (k === 'mm') return d.month || '01';
        return d.day || '01';
      });
    }
    if (f.kind === 'date-native') return f.el.type === 'month' ? `${d.year}-${d.month || '01'}` : `${d.year}-${d.month || '01'}-${d.day || '01'}`;
    return null;
  }

  const START = /\b(from|start|desde|inicio|de inicio|first year attended|fecha de ingreso)\b/;
  const END = /\b(to|end|hasta|fin|termino|last year attended|graduation|graduacion|egreso|expected)\b/;
  const isStart = (f) => /\b(start date|first year attended|from)\b/.test(f.tokens) || START.test(norm(f.label));
  const isEnd = (f) => /\b(end date|last year attended|to)\b/.test(f.tokens) || END.test(norm(f.label));

  // ---------- campos sueltos (no dentro de una sección repetible) ----------
  const TOP = [
    { name: 'Correo', label: /\b(e ?mail|correo)\b/, tokens: /\bemail\b/, kinds: TEXT, value: (c) => c.p.personal.email },
    { name: 'Apellido materno', label: /(second(ary)?|maternal|mother s) (last|family) name|apellido materno|segundo apellido/, tokens: /(secondary|second|maternal) (last|family) name/, kinds: TEXT, value: (c) => c.p.personal.secondLastName },
    { name: 'Segundo nombre', label: /middle name|segundo nombre|otros nombres/, tokens: /middle name/, kinds: TEXT, value: (c) => c.p.personal.middleName },
    {
      name: 'Nombre completo',
      label: /full (legal )?name|nombre completo|nombre y apellidos?|apellidos y nombres?|your (full )?name|^(legal )?name$|^tu nombre$|^candidate name$/,
      tokens: /\bfull name\b|^name$/,
      exclude: /company|empresa|school|escuela|universi|reference|referencia|emergency|emergencia|contact|contacto|user ?name|usuario|file|archivo/,
      kinds: TEXT,
      value: (c, f) => (c.hasLastName && /^(legal )?name$/.test(norm(f.label)) ? c.p.personal.firstName : fullName(c.p)),
    },
    {
      name: 'Nombre',
      label: /first name|given names?|primer nombre|nombre de pila|^nombres?( s)?$/,
      tokens: /first name|given name/,
      exclude: /company|empresa|school|escuela|universi|reference|referencia|emergency|emergencia|user ?name|usuario/,
      kinds: TEXT,
      value: (c) => (c.hasLastName ? c.p.personal.firstName : fullName(c.p)),
    },
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
    {
      name: 'Ubicación actual',
      label: /current location|^location$|^ubicacion( actual)?$|where are you (currently )?(located|based)|lugar de residencia|residencia actual|^residencia$|^location city$|city and state|ciudad y estado/,
      tokens: /^location$|current location/,
      kinds: [...TEXT, 'combobox', ...CHOICE],
      value: (c) => (c.addr ? [[first(c.addr.city), first(c.addr.state), first(c.addr.country)].filter(Boolean).join(', '), first(c.addr.city)] : null),
    },
    { name: 'Estado civil', label: /marital status|estado civil/, kinds: [...CHOICE, 'text'], value: (c) => c.p.personal.maritalStatus },
    { name: 'Municipio', label: /municipality|municipio|delegacion|alcaldia|county/, tokens: /municipality|county|region subdivision 1/, kinds: [...TEXT, ...CHOICE], value: (c) => c.addr?.municipality },
    { name: 'Ciudad', label: /\bcity\b|ciudad|localidad|\btown\b|poblacion/, tokens: /\bcity\b/, kinds: [...TEXT, ...CHOICE], value: (c) => c.addr?.city },
    { name: 'Código postal', label: /postal|\bzip\b|codigo postal|^c ?p$/, tokens: /postal|\bzip\b/, kinds: TEXT, value: (c) => c.addr?.postalCode },
    { name: 'Estado', label: /^(state|estado|province|provincia|region|entidad federativa|state province)\b|\bstate\b/, tokens: /country region|\bstate\b|\bprovince\b/, exclude: /civil|marital|status|estatus|united/, kinds: [...CHOICE, 'text'], value: (c) => c.addr?.state },
    // --- otros datos personales ---
    {
      name: '¿Trabajaste antes aquí?',
      label: /previously (worked|been employed)|(worked|been employed) (for|at|with) .{0,60}(before|previously)|former employee|ex ?emplead|trabaj(o|aste|ado)( usted)? (antes|anteriormente|previamente)|(ha|has|haya) trabajado (antes|anteriormente|previamente|para|en)|ha sido emplead|has sido emplead/,
      tokens: /previous worker|previously worked|former employee/,
      kinds: CHOICE,
      value: (c) => pick(c.p.preferences?.previousWorker, 'No'),
    },
    { name: 'Fecha de nacimiento', label: /date of birth|birth ?date|fecha de nacimiento|^nacimiento$/, tokens: /birth ?date|date of birth|bday/, kinds: [...TEXT, ...DATE], value: (c, f) => (DATE.includes(f.kind) ? dateValue(f, c.p.personal.dateOfBirth) : c.p.personal.dateOfBirth) },
    { name: 'CURP', label: /\bcurp\b/, tokens: /\bcurp\b/, kinds: TEXT, value: (c) => c.p.personal.curp },
    { name: 'RFC', label: /\brfc\b/, tokens: /\brfc\b/, kinds: TEXT, value: (c) => c.p.personal.rfc },
    { name: 'NSS', label: /\bnss\b|numero de seguro social|seguro social|imss/, tokens: /\bnss\b/, kinds: TEXT, value: (c) => c.p.personal.nss },
    { name: 'Empresa actual', label: /current (company|employer)|empresa actual|empleador actual|most recent (company|employer)|ultima empresa|empresa (donde trabajas|anterior)|^company$|^empresa$/, kinds: [...TEXT, 'combobox'], value: (c) => first(c.p.experience?.[0]?.company) },
    { name: 'Puesto actual', label: /current (job )?title|current (position|role)|puesto actual|cargo actual|ultimo puesto|most recent (job )?title/, kinds: [...TEXT, 'combobox'], value: (c) => first(c.p.experience?.[0]?.title) },
    { name: 'Años de experiencia', label: /years of (relevant |professional |work )?experience|anos de experiencia|how many years/, kinds: [...TEXT, ...CHOICE], value: (c) => c.p.preferences?.yearsExperience },
    { name: 'Universidad', label: /^(school|university|college|institution)( name)?$|universidad|escuela|institucion educativa|centro de estudios|alma mater|school or university/, kinds: [...TEXT, 'combobox', ...CHOICE], value: (c) => c.p.education?.[0]?.school },
    { name: 'Carrera', label: /field of study|\bmajor\b|carrera|area de estudio|discipline|especialidad|programa academico|que estudias(te)?/, kinds: [...TEXT, 'combobox', ...CHOICE], value: (c) => c.p.education?.[0]?.fieldOfStudy },
    { name: 'Grado académico', label: /^degree$|degree (type|level|obtained)|grado (academico|de estudios|maximo)|nivel (de estudios|academico|educativo|maximo de estudios)|escolaridad/, kinds: [...CHOICE, ...TEXT, 'combobox'], value: (c) => c.p.education?.[0]?.degree },
    { name: 'Promedio', label: /\bgpa\b|grade point|promedio|grade average/, kinds: TEXT, value: (c) => c.p.education?.[0]?.gpa },
    { name: 'Graduación', label: /graduation|graduacion|egreso|expected (to )?graduat|fecha de termino de (tus )?estudios|ano de termino/, kinds: [...TEXT, ...DATE, ...CHOICE], value: (c, f) => { const e = c.p.education?.[0]?.end; return DATE.includes(f.kind) ? dateValue(f, e) : TEXT.includes(f.kind) ? e : parseDate(e)?.year; } },
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

  // Casillas de aceptación legal: siempre las decides tú
  const CONSENT = /acepto|i agree|agree (to|with)|consent|consiento|terms|terminos|condiciones|privacy|privacidad|aviso de privacidad|certify|certifico|declaro|acknowledge|autorizo|i authorize|i confirm|confirmo que|bajo protesta/;

  function ruleMatches(rule, f) {
    // un combobox (autocompletar) acepta reglas de lista o de texto
    const kind = f.kind === 'combobox' && rule.kinds && !rule.kinds.includes('combobox') ? (rule.kinds.includes('dropdown') ? 'dropdown' : 'text') : f.kind;
    if (rule.kinds && !rule.kinds.includes(kind)) return false;
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
  const isBlank = (v) => v == null || v === '' || (Array.isArray(v) && !v.filter((x) => x != null && x !== '').length) || (v && v.multi && !v.multi.length);

  /** Respuesta aprendida de lo que tú escribiste antes en otro formulario. */
  function learnedFor(ctx, f, fuzzy) {
    const L = ctx.learned;
    if (!L || !f.label) return null;
    const key = norm(f.label);
    let hit = L[key];
    if (!hit && fuzzy) {
      let best = 0;
      for (const [k, v] of Object.entries(L)) {
        const sc = WD.utils.similarity(k, key);
        if (sc > best && sc >= 0.85) {
          best = sc;
          hit = v;
        }
      }
    }
    if (!hit) return null;
    let v = hit.value;
    if (f.kind === 'checkbox') v = v === true || /^(yes|si|true|1)$/.test(norm(first(v)));
    else if (TEXT.includes(f.kind) && Array.isArray(v)) v = v.join(', ');
    else if (f.kind === 'multiselect' && Array.isArray(v)) v = { multi: v };
    return { rule: 'Aprendido', value: v };
  }

  const isConsent = (f) => (f.kind === 'checkbox' || f.kind === 'radio') && CONSENT.test(norm(f.label + ' ' + (f.optionText || '')));

  function resolve(ctx, f) {
    if (!f.section) {
      if (isConsent(f)) return { rule: 'Aceptación (tú decides)', value: null };
      const ans = answerFor(ctx, f);
      if (ans) return ans;
      const rule = TOP.find((r) => ruleMatches(r, f));
      const built = rule ? { rule: rule.name, value: rule.value(ctx, f), early: !!rule.early } : null;
      // el perfil manda; lo aprendido sólo cubre huecos (preguntas que el perfil no tiene)
      if (built && (built.value === null || !isBlank(built.value))) return built;
      return learnedFor(ctx, f, false) || learnedFor(ctx, f, true) || built;
    }
    const entries = ctx.p[SECTION_PROFILE_KEY[f.section]] || [];
    const entry = entries[f.entryIndex];
    if (!entry) return null;
    const rule = (SECTION[f.section] || []).find((r) => ruleMatches(r, f));
    return rule ? { rule: rule.name, value: rule.value(ctx, f, entry) } : null;
  }

  WD.rules = { resolve, parseDate, isConsent, isBlank, CONSENT, TOP, SECTION };
})();
