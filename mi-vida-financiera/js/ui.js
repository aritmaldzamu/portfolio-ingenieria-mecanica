/* =====================================================================
 * ui.js — Utilidades de interfaz: iconos SVG, formato con privacidad,
 * modales, confirmaciones dentro de la app, toasts, formularios y
 * animación de números.
 * ===================================================================== */
(function () {
  'use strict';
  const F = window.Formato;

  /* ---------- Iconos SVG en línea (trazo 24×24) ---------- */
  const ICONOS = {
    home: '<path d="m3 10 9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
    wallet: '<path d="M20 12V8H6a2 2 0 0 1 0-4h12v4"/><path d="M4 6v12a2 2 0 0 0 2 2h14v-4"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/>',
    layers: '<path d="m12 2 10 5-10 5L2 7z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/>',
    swap: '<path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/>',
    pie: '<path d="M21.2 15.9A10 10 0 1 1 8 2.8"/><path d="M22 12A10 10 0 0 0 12 2v10z"/>',
    target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/>',
    umbrella: '<path d="M22 12a10 10 0 0 0-20 0z"/><path d="M12 12v7a2 2 0 0 0 4 0"/><path d="M12 2v1"/>',
    trending: '<path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>',
    trendingDown: '<path d="m22 17-8.5-8.5-5 5L2 7"/><path d="M16 17h6v-6"/>',
    chart: '<path d="M3 3v18h18"/><path d="m7 14 4-4 4 4 5-6"/>',
    briefcase: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    settings: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    car: '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>',
    store: '<path d="M3 9 4.5 4h15L21 9"/><path d="M3 9h18v1a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0z"/><path d="M5 13v8h14v-8"/><path d="M10 21v-5h4v5"/>',
    plane: '<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>',
    globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    laptop: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M2 20h20"/>',
    gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5"/>',
    utensils: '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/>',
    cart: '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2 2h2l2.7 12.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L22 7H5.1"/>',
    bus: '<rect x="4" y="3" width="16" height="16" rx="2"/><path d="M4 11h16M8 15h.01M16 15h.01M6 19v2M18 19v2"/>',
    fuel: '<path d="M3 22h12M4 9h10"/><path d="M14 22V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v18"/><path d="M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 4 0V9.8a2 2 0 0 0-.6-1.4L18 5"/>',
    zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9z"/>',
    phone: '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/>',
    tv: '<rect x="2" y="7" width="20" height="15" rx="2"/><path d="m17 2-5 5-5-5"/>',
    heart: '<path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7z"/>',
    shirt: '<path d="M20.4 3.5 16 2a4 4 0 0 1-8 0L3.6 3.5a2 2 0 0 0-1.3 2.2l.6 3.5a1 1 0 0 0 1 .8H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.1a1 1 0 0 0 1-.8l.6-3.5a2 2 0 0 0-1.3-2.2z"/>',
    music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/>',
    dots: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    edit: '<path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/>',
    trash: '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5M12 15V3"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5M12 3v12"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4"/>',
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"/>',
    alert: '<path d="m21.7 18-8-14a2 2 0 0 0-3.5 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3z"/><path d="M12 9v4M12 17h.01"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
    arrowUp: '<path d="M7 17 17 7M7 7h10v10"/>',
    arrowDown: '<path d="M17 7 7 17M17 17H7V7"/>',
    arrowRight: '<path d="M5 12h14M12 5l7 7-7 7"/>',
    chevronRight: '<path d="m9 18 6-6-6-6"/>',
    chevronLeft: '<path d="m15 18-6-6 6-6"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
    sparkles: '<path d="M12 3 13.9 8.8 20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2z"/><path d="M19 3v4M17 5h4"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    landmark: '<path d="M3 22h18M6 18v-7M10 18v-7M14 18v-7M18 18v-7"/><path d="m12 2 8 5H4z"/>',
    coins: '<circle cx="8" cy="8" r="6"/><path d="M18.1 10.4A6 6 0 1 1 10.3 18"/><path d="M7 6h1v4M16.7 13.9l.7.7-2.8 2.8"/>',
    percent: '<path d="M19 5 5 19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
    filter: '<path d="M22 3H2l8 9.5V19l4 2v-8.5z"/>',
    refresh: '<path d="M21 12a9 9 0 0 0-9-9 9.8 9.8 0 0 0-6.7 2.7L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.8 9.8 0 0 0 6.7-2.7L21 16"/><path d="M16 16h5v5"/>',
    banknote: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/>',
    graduation: '<path d="M22 10 12 5 2 10l10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>',
    tag: '<path d="M12 2H2v10l9.3 9.3a2.4 2.4 0 0 0 3.4 0l6.6-6.6a2.4 2.4 0 0 0 0-3.4z"/><path d="M7 7h.01"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    calculator: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8M16 14v4M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M8 18h.01M12 18h.01"/>',
    flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22v-7"/>',
    receipt: '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8M12 17.5v-11"/>',
    eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
    eyeOff: '<path d="M9.9 4.2A10.9 10.9 0 0 1 12 4c7 0 10 8 10 8a13.2 13.2 0 0 1-1.7 2.7M6.6 6.6A13.5 13.5 0 0 0 2 12s3 8 10 8a9.7 9.7 0 0 0 5.4-1.6"/><path d="M14.1 14.1a3 3 0 1 1-4.2-4.2M2 2l20 20"/>',
    repeat: '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
    piggy: '<path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2z"/><path d="M2 9v1c0 1.1.9 2 2 2h1"/><path d="M16 11h.01"/>',
    star: '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>',
    paw: '<circle cx="11" cy="4" r="2"/><circle cx="18" cy="8" r="2"/><circle cx="20" cy="16" r="2"/><path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.8 1.2l-.5-1.4a2 2 0 0 0-1.2-1.2l-1.4-.5A3.5 3.5 0 0 1 5.5 10z"/>',
    dumbbell: '<path d="m6.5 6.5 11 11M21 21l-1-1M3 3l1 1M18 22l4-4M2 6l4-4M3 10l7-7M14 21l7-7"/>',
    wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z"/>',
    baby: '<circle cx="12" cy="8" r="5"/><path d="M3 21v-1a7 7 0 0 1 7-7h4a7 7 0 0 1 7 7v1"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    file: '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5z"/><path d="M14 2v6h6"/>',
  };
  /** Iconos elegibles para cuentas, apartados y categorías. */
  const ICONOS_ELEGIBLES = ['shield', 'car', 'home', 'store', 'plane', 'globe', 'laptop', 'gift', 'graduation', 'heart', 'piggy', 'star', 'flag', 'target', 'briefcase', 'wallet', 'landmark', 'trending', 'coins', 'banknote', 'card', 'umbrella', 'utensils', 'cart', 'bus', 'fuel', 'zap', 'phone', 'tv', 'shirt', 'music', 'book', 'paw', 'baby', 'wrench', 'dumbbell', 'receipt', 'tag', 'layers', 'dots'];
  const COLORES = ['#7c6cff', '#4aa8ff', '#2fd197', '#2dd4bf', '#f5a524', '#f97362', '#f472b6', '#a78bfa', '#c026d3', '#ef4444', '#84cc16', '#94a3b8'];

  function icono(nombre, clase) {
    const p = ICONOS[nombre] || ICONOS.dots;
    return `<span class="ico ${clase || ''}" aria-hidden="true"><svg viewBox="0 0 24 24">${p}</svg></span>`;
  }

  /** Reemplaza los <span data-ico="x"> por su SVG. */
  function pintarIconos(root) {
    (root || document).querySelectorAll('[data-ico]').forEach(el => {
      el.innerHTML = `<svg viewBox="0 0 24 24">${ICONOS[el.dataset.ico] || ''}</svg>`;
      el.classList.add('ico'); el.setAttribute('aria-hidden', 'true');
      delete el.dataset.ico;
    });
  }

  /* ---------- Helpers ---------- */
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => [...(root || document).querySelectorAll(sel)];

  /** Monto con clase .monto (para el modo privado). */
  function m(n, op) {
    op = op || {};
    const cls = op.color ? (n > 0.004 ? ' verde-txt' : n < -0.004 ? ' rojo-txt' : '') : '';
    return `<span class="monto${cls}">${F.dinero(n, op)}</span>`;
  }
  /** Número animable: <span data-contar="1234.5" data-dec="2">. */
  function mc(n, op) {
    op = op || {};
    return `<span class="monto" data-contar="${Number(n) || 0}" data-dec="${op.dec != null ? op.dec : 2}">${F.dinero(n, op)}</span>`;
  }

  function burbuja(ico, color, clase) {
    return `<span class="burbuja ${clase || ''}"${color ? ` style="--c:${esc(color)}"` : ''}>${icono(ico)}</span>`;
  }

  /** Barra de progreso. estado: 'auto' (verde→amarillo→rojo según gasto) o color. */
  function barra(pct, op) {
    op = op || {};
    const p = Math.max(0, Math.min(100, pct || 0));
    let cls = op.clase || '';
    if (op.semaforo) cls += pct >= 100 ? ' mal' : pct >= 85 ? ' medio' : ' ok';
    return `<div class="barra ${cls}" ${op.color ? `style="--c:${esc(op.color)}"` : ''} role="progressbar" aria-valuenow="${Math.round(p)}" aria-valuemin="0" aria-valuemax="100"><i data-ancho="${p}"></i></div>`;
  }

  /** Activa la animación de las barras (ancho de 0 → valor). */
  function animarBarras(root) {
    requestAnimationFrame(() => $$('.barra > i[data-ancho]', root).forEach(i => { i.style.width = i.dataset.ancho + '%'; }));
  }

  /** Cuenta los números de 0 al valor final (microanimación). */
  function animarNumeros(root) {
    const els = $$('[data-contar]', root);
    if (!els.length || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t0 = performance.now(), dur = 700;
    const datos = els.map(el => ({ el, fin: Number(el.dataset.contar), dec: Number(el.dataset.dec) }));
    function paso(t) {
      const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      for (const d of datos) d.el.textContent = F.dinero(d.fin * e, { dec: d.dec });
      if (k < 1) requestAnimationFrame(paso);
    }
    requestAnimationFrame(paso);
  }

  function vacio(op) {
    return `<div class="vacio ${op.compacto ? 'compacto' : ''}">
      <div class="anillo">${icono(op.icono || 'sparkles')}</div>
      <h4>${esc(op.titulo)}</h4>
      ${op.texto ? `<p>${op.texto}</p>` : ''}
      ${op.boton ? `<button class="btn btn-primario mt-s" data-accion="${esc(op.accion)}" ${op.datos || ''}>${icono('plus')}${esc(op.boton)}</button>` : ''}
    </div>`;
  }

  /* ---------- Toasts ---------- */
  function toast(msg, op) {
    op = op || {};
    const cont = $('#toasts');
    const el = document.createElement('div');
    el.className = 'toast' + (op.error ? ' error' : '');
    el.innerHTML = `${icono(op.error ? 'alert' : 'check')}<span>${esc(msg)}</span>${op.deshacer ? '<button class="btn btn-sm btn-fantasma">Deshacer</button>' : ''}`;
    if (op.deshacer) el.querySelector('button').onclick = () => { op.deshacer(); el.remove(); };
    cont.appendChild(el);
    setTimeout(() => { el.style.transition = 'opacity .3s'; el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, op.duracion || 3200);
  }

  /* ---------- Modales ---------- */
  const pilaModales = [];
  /**
   * Abre un modal. op: {titulo, subtitulo, icono, color, cuerpo(html), pie(html), ancho:'ancho'|'angosto', alMontar(el), alCerrar}
   */
  function modal(op) {
    const capa = document.createElement('div');
    capa.className = 'capa';
    capa.innerHTML = `<div class="modal ${op.ancho || ''}" role="dialog" aria-modal="true" aria-label="${esc(op.titulo)}">
      <div class="modal-cab">
        ${op.icono ? burbuja(op.icono, op.color) : ''}
        <div style="flex:1;min-width:0"><h3>${esc(op.titulo)}</h3>${op.subtitulo ? `<p>${op.subtitulo}</p>` : ''}</div>
        <button class="btn-icono sm" data-cerrar aria-label="Cerrar">${icono('x')}</button>
      </div>
      <div class="modal-cuerpo">${op.cuerpo || ''}</div>
      ${op.pie ? `<div class="modal-pie">${op.pie}</div>` : ''}
    </div>`;
    const anterior = document.activeElement;
    const cerrar = () => {
      capa.remove();
      const i = pilaModales.indexOf(api); if (i >= 0) pilaModales.splice(i, 1);
      if (op.alCerrar) op.alCerrar();
      if (anterior && anterior.focus) try { anterior.focus(); } catch (e) { /* nada */ }
    };
    const api = { el: capa, cerrar };
    capa.addEventListener('mousedown', e => { if (e.target === capa) cerrar(); });
    capa.querySelectorAll('[data-cerrar]').forEach(b => b.addEventListener('click', cerrar));
    $('#capa-modales').appendChild(capa);
    pilaModales.push(api);
    if (op.alMontar) op.alMontar(capa.querySelector('.modal'), api);
    const foco = capa.querySelector('[autofocus], input:not([type=hidden]):not([type=radio]):not([type=checkbox]), select, textarea, button.btn-primario');
    if (foco && window.innerWidth > 860) setTimeout(() => foco.focus(), 30);
    return api;
  }
  function cerrarModalSuperior() { const t = pilaModales[pilaModales.length - 1]; if (t) { t.cerrar(); return true; } return false; }

  /** Confirmación dentro de la app (nunca confirm() del navegador). Devuelve una promesa. */
  function confirmar(op) {
    return new Promise(res => {
      let resuelto = false;
      const fin = v => { if (!resuelto) { resuelto = true; res(v); } };
      const md = modal({
        titulo: op.titulo, icono: op.peligro ? 'alert' : 'info', color: op.peligro ? 'var(--red)' : 'var(--accent)', ancho: 'angosto',
        cuerpo: `<p class="suave">${op.mensaje || ''}</p>${op.escribir ? `<div class="campo mt"><label>Escribe <b>${esc(op.escribir)}</b> para confirmar</label><input type="text" id="conf-escribir" autocomplete="off"></div>` : ''}`,
        pie: `<button class="btn btn-fantasma" data-cerrar>Cancelar</button><button class="btn ${op.peligro ? 'btn-peligro' : 'btn-primario'}" id="conf-ok">${esc(op.textoOk || 'Confirmar')}</button>`,
        alCerrar: () => fin(false),
        alMontar(el, api) {
          const ok = el.querySelector('#conf-ok');
          const inp = el.querySelector('#conf-escribir');
          if (inp) { ok.disabled = true; inp.addEventListener('input', () => { ok.disabled = inp.value.trim().toUpperCase() !== op.escribir.toUpperCase(); }); }
          ok.addEventListener('click', () => { fin(true); api.cerrar(); });
        },
      });
      void md;
    });
  }

  /* ---------- Formularios ---------- */
  const numero = v => { if (v == null || v === '') return null; const n = parseFloat(String(v).replace(/[$,\s]/g, '')); return isNaN(n) ? null : n; };

  function inputCampo(c, v) {
    const n = esc(c.n);
    const val = v == null ? '' : v;
    const attrs = `name="${n}" id="f-${n}" ${c.req ? 'required' : ''} ${c.ph ? `placeholder="${esc(c.ph)}"` : ''} ${c.min != null ? `min="${c.min}"` : ''} ${c.max != null ? `max="${c.max}"` : ''}`;
    switch (c.t) {
      case 'money': return `<div class="input-pre"><span>$</span><input type="text" inputmode="decimal" ${attrs} value="${val === '' ? '' : esc(F.numero(val, 2).replace(/\.00$/, ''))}" autocomplete="off"></div>`;
      case 'pct': return `<div class="input-suf"><input type="number" step="${c.step || 0.01}" inputmode="decimal" ${attrs} value="${esc(val)}"><span>%</span></div>`;
      case 'number': return `<input type="number" step="${c.step || 1}" inputmode="decimal" ${attrs} value="${esc(val)}">`;
      case 'date': return `<input type="date" ${attrs} value="${esc(val)}">`;
      case 'month': return `<input type="month" ${attrs} value="${esc(val)}">`;
      case 'textarea': return `<textarea ${attrs}>${esc(val)}</textarea>`;
      case 'select': return `<select ${attrs}>${(c.op || []).map(o => o.grupo ? `<optgroup label="${esc(o.grupo)}">${o.op.map(x => `<option value="${esc(x.v)}" ${String(x.v) === String(val) ? 'selected' : ''}>${esc(x.l)}</option>`).join('')}</optgroup>` : `<option value="${esc(o.v)}" ${String(o.v) === String(val) ? 'selected' : ''}>${esc(o.l)}</option>`).join('')}</select>`;
      case 'checkbox': return `<label class="check"><input type="checkbox" class="interruptor" ${attrs} ${val ? 'checked' : ''}><span>${esc(c.texto || c.l)}</span></label>`;
      case 'icono': return `<div class="selector-iconos">${ICONOS_ELEGIBLES.map(i => `<label title="${i}"><input type="radio" name="${n}" value="${i}" ${i === val ? 'checked' : ''}><span>${icono(i)}</span></label>`).join('')}</div>`;
      case 'color': return `<div class="selector-colores">${COLORES.map(col => `<label><input type="radio" name="${n}" value="${col}" ${col === val ? 'checked' : ''}><span style="--c:${col}"></span></label>`).join('')}</div>`;
      case 'tramos': return `<div class="tramos" data-tramos="${n}">
          <div class="tramo-cab"><span>Hasta (vacío = sin límite)</span><span>Tasa anual</span><span></span></div>
          <div class="tramos-filas"></div>
          <button type="button" class="btn btn-sm btn-fantasma" data-agregar-tramo style="justify-self:start">${icono('plus')}Agregar tramo</button>
          <input type="hidden" name="${n}" value="${esc(JSON.stringify(val || [{ hasta: null, tasa: 0 }]))}">
        </div>`;
      case 'html': return c.html || '';
      default: return `<input type="text" ${attrs} value="${esc(val)}" autocomplete="off" ${c.maxlength ? `maxlength="${c.maxlength}"` : ''}>`;
    }
  }

  /** Lee los valores del formulario según la especificación de campos. */
  function leerFormulario(form, campos) {
    const v = {};
    for (const c of campos) {
      if (!c.n || c.t === 'seccion' || c.t === 'html') continue;
      if (c.t === 'checkbox') { const el = form.querySelector(`[name="${c.n}"]`); v[c.n] = !!(el && el.checked); continue; }
      if (c.t === 'icono' || c.t === 'color') { const el = form.querySelector(`[name="${c.n}"]:checked`); v[c.n] = el ? el.value : null; continue; }
      const el = form.querySelector(`[name="${c.n}"]`);
      if (!el) continue;
      if (c.t === 'tramos') { try { v[c.n] = JSON.parse(el.value); } catch (e) { v[c.n] = []; } continue; }
      if (c.t === 'money' || c.t === 'pct' || c.t === 'number') v[c.n] = numero(el.value);
      else v[c.n] = el.value;
    }
    return v;
  }

  function montarTramos(form) {
    $$('[data-tramos]', form).forEach(box => {
      const hidden = box.querySelector('input[type=hidden]');
      const filas = box.querySelector('.tramos-filas');
      let datos = [];
      try { datos = JSON.parse(hidden.value) || []; } catch (e) { datos = []; }
      if (!datos.length) datos = [{ hasta: null, tasa: 0 }];
      const sync = () => { hidden.value = JSON.stringify(datos); hidden.dispatchEvent(new Event('input', { bubbles: true })); };
      const pintar = () => {
        filas.innerHTML = datos.map((t, i) => `<div class="tramo" data-i="${i}">
          <div class="input-pre"><span>$</span><input type="text" inputmode="decimal" data-k="hasta" value="${t.hasta == null ? '' : esc(t.hasta)}" placeholder="Sin límite" aria-label="Tope del tramo ${i + 1}"></div>
          <div class="input-suf"><input type="number" step="0.01" data-k="tasa" value="${esc(t.tasa)}" aria-label="Tasa del tramo ${i + 1}"><span>%</span></div>
          <button type="button" class="btn-icono sm" data-quitar ${datos.length === 1 ? 'disabled style="opacity:.3"' : ''} aria-label="Quitar tramo">${icono('trash')}</button>
        </div>`).join('');
      };
      filas.addEventListener('input', e => {
        const fila = e.target.closest('.tramo'); if (!fila) return;
        const i = +fila.dataset.i, k = e.target.dataset.k;
        datos[i][k] = k === 'hasta' ? numero(e.target.value) : (numero(e.target.value) || 0);
        sync();
      });
      filas.addEventListener('click', e => {
        const q = e.target.closest('[data-quitar]'); if (!q || datos.length === 1) return;
        datos.splice(+q.closest('.tramo').dataset.i, 1); pintar(); sync();
      });
      box.querySelector('[data-agregar-tramo]').addEventListener('click', () => {
        const ult = datos[datos.length - 1];
        if (ult.hasta == null) ult.hasta = 25000;
        datos.push({ hasta: null, tasa: 0 }); pintar(); sync();
      });
      pintar();
    });
  }

  /**
   * Formulario en modal.
   * op: {titulo, subtitulo, icono, color, campos, valores, textoGuardar, onGuardar(vals) → true|string(error),
   *      onCambio(vals, el), extra(html arriba), eliminar: fn, ancho}
   */
  function formulario(op) {
    const vals = op.valores || {};
    const campos = op.campos;
    const cuerpo = `${op.extra || ''}<form class="form" novalidate>
      ${campos.map(c => {
        if (c.t === 'seccion') return `<div class="campo-seccion" data-campo="${esc(c.n || '')}">${esc(c.l)}</div>`;
        if (c.t === 'html' && !c.l) return `<div class="campo ${c.ancho || ''}" data-campo="${esc(c.n || '')}">${c.html}</div>`;
        return `<div class="campo ${c.ancho || ''}" data-campo="${esc(c.n)}">
          ${c.t !== 'checkbox' ? `<label for="f-${esc(c.n)}">${esc(c.l)}${c.etiqueta ? ' ' + c.etiqueta : ''}</label>` : ''}
          ${inputCampo(c, vals[c.n] != null ? vals[c.n] : c.def)}
          ${c.ayuda ? `<span class="ayuda">${c.ayuda}</span>` : ''}
        </div>`;
      }).join('')}
      <div class="error-form oculto" role="alert"></div>
      <button type="submit" hidden></button>
    </form><div data-vista-previa></div>`;
    return modal({
      titulo: op.titulo, subtitulo: op.subtitulo, icono: op.icono, color: op.color, ancho: op.ancho,
      cuerpo,
      pie: `${op.eliminar ? `<button class="btn btn-peligro izq" data-eliminar>${icono('trash')}Eliminar</button>` : ''}<button class="btn btn-fantasma" data-cerrar>Cancelar</button><button class="btn btn-primario" data-guardar>${icono('check')}${esc(op.textoGuardar || 'Guardar')}</button>`,
      alMontar(el, api) {
        const form = el.querySelector('form');
        montarTramos(form);
        const visibilidad = () => {
          const v = leerFormulario(form, campos);
          for (const c of campos) if (c.si) { const box = form.querySelector(`[data-campo="${c.n}"]`); if (box) box.classList.toggle('oculto', !c.si(v)); }
          if (op.onCambio) op.onCambio(v, el);
        };
        form.addEventListener('input', visibilidad);
        form.addEventListener('change', visibilidad);
        visibilidad();
        const errorEl = form.querySelector('.error-form');
        const guardar = async (e) => {
          if (e) e.preventDefault();
          const v = leerFormulario(form, campos);
          for (const c of campos) {
            const visible = !c.si || c.si(v);
            if (c.req && visible && (v[c.n] == null || v[c.n] === '')) { errorEl.textContent = `Falta: ${c.l}`; errorEl.classList.remove('oculto'); return; }
          }
          const r = await op.onGuardar(v, api);
          if (typeof r === 'string') { errorEl.textContent = r; errorEl.classList.remove('oculto'); return; }
          if (r !== false) api.cerrar();
        };
        form.addEventListener('submit', guardar);
        el.querySelector('[data-guardar]').addEventListener('click', guardar);
        const del = el.querySelector('[data-eliminar]');
        if (del) del.addEventListener('click', async () => { const ok = await op.eliminar(); if (ok !== false) api.cerrar(); });
        if (op.alMontar) op.alMontar(el, api);
      },
    });
  }

  /** Descarga un archivo generado en el navegador (no sale de tu equipo). */
  function descargar(nombre, contenido, tipo) {
    const blob = new Blob([contenido], { type: tipo || 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = nombre; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 500);
  }

  window.UI = {
    ICONOS, ICONOS_ELEGIBLES, COLORES, icono, pintarIconos, esc, $, $$, m, mc, burbuja, barra, animarBarras, animarNumeros,
    vacio, toast, modal, confirmar, cerrarModalSuperior, formulario, leerFormulario, numero, descargar,
    get hayModal() { return pilaModales.length > 0; },
  };
})();
