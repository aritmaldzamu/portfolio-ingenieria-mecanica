// Aprende de lo que TÚ contestas: cuando llenas a mano una pregunta que tu perfil
// no cubre ("¿Tienes licencia de manejo?", "¿Por qué quieres trabajar aquí?"),
// la guarda y la próxima vez, en cualquier sitio, la llena sola.
//
// Sólo aprende en páginas de empleo (o donde ya usaste el autollenado), nunca
// guarda contraseñas, datos bancarios, códigos ni casillas de aceptación legal.
(() => {
  const WD = (window.__WDAF = window.__WDAF || {});
  if (WD.learn) return;
  const { norm, text } = WD.utils;
  const { scan, readValue } = WD.fields;
  const { resolve, isConsent, isBlank } = WD.rules;

  const SENSITIVE = /password|contrasena|clave de acceso|tarjeta|card number|credit|debit|cvv|cvc|security code|codigo de seguridad|\bssn\b|social security number|clabe|cuenta bancaria|bank|account number|numero de cuenta|routing|token|otp|codigo de verificacion|verification code|captcha|\bpin\b|search|buscar|busqueda|keyword|palabra clave/;

  const JOB_RE = /(careers?|carreras? profesional|\bjobs?\b|apply|application|empleo|vacante|vacanc|postula|solicitud|candidat|recruit|talent|reclutamiento|bolsa de trabajo|greenhouse|lever\.co|smartrecruiters|icims|taleo|successfactors|workday|bamboohr|ashbyhq|jobvite|breezy|recruitee|teamtailor|personio|occ\.com|computrabajo|hiring|eightfold|phenom|oraclecloud|trabaja con nosotros|unete|join (our|the) team|resume|curriculum)/i;

  let usedHere = false; // el usuario ya dio "Autollenar" en esta página
  WD.markUsed = () => {
    usedHere = true;
  };

  function isJobPage() {
    if (usedHere) return true;
    if (JOB_RE.test(location.href) || JOB_RE.test(document.title) || JOB_RE.test(text(document.querySelector('h1')) || '')) return true;
    return !!document.querySelector('input[type="file"][name*="resume" i], input[type="file"][name*="cv" i], input[type="file"][id*="resume" i]');
  }

  async function load() {
    const { learned } = await chrome.storage.local.get('learned');
    return learned || {};
  }

  function canLearn(f) {
    if (f.section || f.kind === 'file') return false;
    const label = norm(f.label);
    if (!label || label.length < 3 || label.length > 250) return false;
    if (SENSITIVE.test(label) || SENSITIVE.test(f.tokens || '')) return false;
    if (isConsent(f)) return false;
    return true;
  }

  /**
   * Guarda las respuestas que tienes en pantalla a preguntas que tu perfil no cubre.
   * Devuelve cuántas guardó o actualizó.
   */
  async function snapshot() {
    if (!isJobPage()) return 0;
    const { profile, settings } = await chrome.storage.local.get(['profile', 'settings']);
    if (!profile) return 0;
    const addr = (profile.addresses || [])[settings?.activeAddress || 0] || null;
    const learned = await load();
    let changed = 0;
    for (const f of scan().fields) {
      if (!canLearn(f)) continue;
      // si el perfil ya tiene ese dato, el perfil manda: no se aprende
      const r = resolve({ p: profile, addr, learned: {} }, f);
      if (r && (r.value === null || !isBlank(r.value))) continue;
      const value = readValue(f);
      if (value == null || value === '' || value === false) continue;
      const key = norm(f.label);
      const prev = learned[key];
      if (prev && JSON.stringify(prev.value) === JSON.stringify(value)) continue;
      learned[key] = { label: f.label, value, kind: f.kind, host: location.hostname, at: new Date().toISOString() };
      changed++;
    }
    if (changed) await chrome.storage.local.set({ learned });
    return changed;
  }

  // ---------- aprendizaje automático ----------
  let timer;
  const later = () => {
    clearTimeout(timer);
    timer = setTimeout(() => snapshot().catch(() => {}), 1200);
  };
  const NEXT_RE = /^(next|continue|continuar|siguiente|submit|send|enviar|apply|aplicar|postular(me)?|guardar( y continuar)?|save( and continue)?|review|revisar|finish|finalizar|terminar)\b/;

  function hook() {
    // cambios en campos nativos (los widgets de clic se capturan al avanzar de página)
    document.addEventListener('change', (e) => {
      if (!e.isTrusted || e.target.closest?.('#wdaf-root')) return;
      later();
    }, true);
    // al dar Siguiente/Enviar: guardar antes de que la página cambie
    document.addEventListener('click', (e) => {
      if (!e.isTrusted) return;
      const b = e.target.closest?.('button, [role="button"], input[type="submit"], a');
      if (!b || b.closest('#wdaf-root')) return;
      if (NEXT_RE.test(norm(text(b) || b.value || b.getAttribute('aria-label') || ''))) snapshot().catch(() => {});
    }, true);
  }

  WD.learn = { snapshot, load, isJobPage, hook };
})();
