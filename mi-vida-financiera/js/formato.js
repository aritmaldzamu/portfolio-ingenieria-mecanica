/* =====================================================================
 * formato.js — Formato de moneda, porcentajes y fechas en español (es-MX).
 * Puro: funciona en navegador y en Node.
 * ===================================================================== */
(function (raiz) {
  'use strict';
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

  let moneda = 'MXN';
  const cache = {};
  function fmt(dec) {
    const k = moneda + dec;
    if (!cache[k]) cache[k] = new Intl.NumberFormat('es-MX', { style: 'currency', currency: moneda, minimumFractionDigits: dec, maximumFractionDigits: dec });
    return cache[k];
  }

  /** $12,345.67 — opciones: {dec, signo (+/−), compacto ($12.3 k)} */
  function dinero(n, op) {
    op = op || {};
    n = Number(n) || 0;
    if (Math.abs(n) < 0.005) n = 0;
    const dec = op.dec != null ? op.dec : 2;
    if (op.compacto && Math.abs(n) >= 10000) {
      const abs = Math.abs(n);
      const txt = abs >= 1e6 ? (abs / 1e6).toLocaleString('es-MX', { maximumFractionDigits: 2 }) + ' M' : (abs / 1e3).toLocaleString('es-MX', { maximumFractionDigits: 1 }) + ' k';
      return (n < 0 ? '−' : (op.signo && n > 0 ? '+' : '')) + '$' + txt;
    }
    const s = fmt(dec).format(Math.abs(n)).replace(/\s?(MXN|USD|EUR)$/, '');
    if (n < 0) return '−' + s;
    return (op.signo && n > 0 ? '+' : '') + s;
  }

  /** 7.25 % */
  function pct(n, dec) {
    n = Number(n) || 0;
    return n.toLocaleString('es-MX', { minimumFractionDigits: dec != null ? dec : 2, maximumFractionDigits: dec != null ? dec : 2 }) + ' %';
  }

  function numero(n, dec) { return (Number(n) || 0).toLocaleString('es-MX', { minimumFractionDigits: dec || 0, maximumFractionDigits: dec || 0 }); }

  function partes(iso) { const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number); return { y, m, d }; }

  /**
   * Fechas en formato mexicano.
   *  corta: 13/11/2026 · media: 13 nov 2026 · larga: 13 de noviembre de 2026
   *  mes: noviembre 2026 · mesCorto: nov 26 · dia: vie 13
   */
  function fecha(iso, estilo) {
    if (!iso) return '—';
    const { y, m, d } = partes(iso);
    switch (estilo) {
      case 'larga': return `${d} de ${MESES[m - 1]} de ${y}`;
      case 'media': return `${d} ${MESES_CORTOS[m - 1]} ${y}`;
      case 'sinAnio': return `${d} ${MESES_CORTOS[m - 1]}`;
      case 'mes': return `${MESES[m - 1]} ${y}`;
      case 'mesCorto': return `${MESES_CORTOS[m - 1]} ${String(y).slice(2)}`;
      case 'dia': { const dw = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); return `${DIAS[dw].slice(0, 3)} ${d}`; }
      default: return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
    }
  }

  /** "en 3 días", "hoy", "mañana", "hace 2 días" */
  function relativo(dias) {
    if (dias === 0) return 'hoy';
    if (dias === 1) return 'mañana';
    if (dias === -1) return 'ayer';
    if (dias > 1) return `en ${dias} días`;
    return `hace ${-dias} días`;
  }

  /** Duración en meses legible: "11 meses", "2 años y 3 meses". */
  function duracion(meses) {
    if (!isFinite(meses)) return 'más de 100 años';
    meses = Math.max(0, Math.round(meses));
    if (meses < 12) return `${meses} ${meses === 1 ? 'mes' : 'meses'}`;
    const a = Math.floor(meses / 12), r = meses % 12;
    return `${a} ${a === 1 ? 'año' : 'años'}${r ? ` y ${r} ${r === 1 ? 'mes' : 'meses'}` : ''}`;
  }

  /** Une una lista en español: "a, b y c". */
  function lista(xs) {
    if (xs.length <= 1) return xs.join('');
    return xs.slice(0, -1).join(', ') + ' y ' + xs[xs.length - 1];
  }

  const Formato = {
    MESES, MESES_CORTOS, DIAS, dinero, pct, numero, fecha, relativo, duracion, lista,
    setMoneda(m) { moneda = m || 'MXN'; },
    getMoneda() { return moneda; },
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = Formato;
  else raiz.Formato = Formato;
})(typeof window !== 'undefined' ? window : globalThis);
