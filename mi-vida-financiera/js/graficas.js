/* =====================================================================
 * graficas.js — Envoltura de Chart.js con el tema de la app.
 * Si Chart.js no cargó (sin internet y sin copia local), muestra un aviso.
 * ===================================================================== */
(function () {
  'use strict';
  const F = window.Formato;
  let instancias = [];

  const disponible = () => typeof window.Chart !== 'undefined';
  const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

  /** Colores del tema actual. */
  function tema() {
    return {
      texto: css('--text-2'), tenue: css('--text-3'), borde: css('--border'), superficie: css('--surface'), superficie3: css('--surface-3'),
      acento: css('--accent'), verde: css('--green'), rojo: css('--red'), amarillo: css('--yellow'), azul: css('--blue'),
      series: ['--s1', '--s2', '--s3', '--s4', '--s5', '--s6', '--s7', '--s8'].map(css),
    };
  }

  function limpiar() { instancias.forEach(c => { try { c.destroy(); } catch (e) { /* nada */ } }); instancias = []; }

  function sinGrafica(canvas, msg) {
    const box = canvas.parentElement;
    box.innerHTML = `<div class="grafica-sin">${msg || 'Las gráficas necesitan internet la primera vez (Chart.js).'}</div>`;
    return null;
  }

  /** Configuración base común (ejes discretos, tooltip con formato de dinero). */
  function base(t, op) {
    op = op || {};
    const dinero = v => F.dinero(v, { dec: op.decEje != null ? op.decEje : 0, compacto: true });
    return {
      responsive: true, maintainAspectRatio: false, animation: { duration: 650, easing: 'easeOutCubic' },
      interaction: { mode: op.modo || 'index', intersect: false },
      plugins: {
        legend: { display: !!op.leyenda, position: 'bottom', labels: { color: t.texto, boxWidth: 10, boxHeight: 10, useBorderRadius: true, borderRadius: 3, padding: 14, font: { family: 'Inter', size: 12 } } },
        tooltip: {
          backgroundColor: t.superficie3, titleColor: css('--text'), bodyColor: t.texto, borderColor: css('--border-2'), borderWidth: 1,
          padding: 10, cornerRadius: 10, boxPadding: 4, usePointStyle: true, titleFont: { family: 'Inter', weight: '600' }, bodyFont: { family: 'Inter' },
          callbacks: { label: ctx => ` ${ctx.dataset.label ? ctx.dataset.label + ': ' : ''}${op.formato ? op.formato(ctx.parsed.y != null ? ctx.parsed.y : ctx.parsed) : F.dinero(ctx.parsed.y != null ? ctx.parsed.y : ctx.parsed)}` },
        },
      },
      scales: op.sinEjes ? {} : {
        x: { stacked: !!op.apilado, grid: { display: false }, border: { color: t.borde }, ticks: { color: t.tenue, font: { family: 'Inter', size: 11 }, maxRotation: 0, autoSkip: true, maxTicksLimit: op.maxX || 8 } },
        y: { stacked: !!op.apilado, beginAtZero: op.desdeCero !== false, grid: { color: t.borde }, border: { display: false }, ticks: { color: t.tenue, font: { family: 'Inter', size: 11 }, callback: op.formatoEje || dinero, maxTicksLimit: 6 } },
      },
    };
  }

  function crear(canvas, cfg) {
    if (!canvas) return null;
    if (!disponible()) return sinGrafica(canvas);
    const c = new window.Chart(canvas.getContext('2d'), cfg);
    instancias.push(c);
    return c;
  }

  /** Degradado vertical para áreas. */
  function degradado(canvas, color, alfa) {
    const ctx = canvas.getContext('2d');
    const h = canvas.parentElement ? canvas.parentElement.clientHeight || 260 : 260;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, hexA(color, alfa != null ? alfa : 0.28));
    g.addColorStop(1, hexA(color, 0));
    return g;
  }
  /** Color con transparencia (acepta #rrggbb o rgb()). */
  function hexA(color, a) {
    color = (color || '').trim();
    if (color.startsWith('#')) {
      let h = color.slice(1); if (h.length === 3) h = h.split('').map(x => x + x).join('');
      const n = parseInt(h, 16);
      return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
    }
    return color;
  }

  /** Línea con área (una o varias series). series: [{label, data, color, area, punteado}] */
  function linea(canvas, labels, series, op) {
    if (!canvas) return null;
    const t = tema();
    op = op || {};
    return crear(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: series.map(s => ({
          label: s.label, data: s.data, borderColor: s.color, backgroundColor: s.area ? (disponible() ? degradado(canvas, s.color, s.alfa) : s.color) : s.color,
          fill: s.area ? (s.fill || 'origin') : false, tension: 0.35, borderWidth: 2, pointRadius: 0, pointHoverRadius: 5,
          pointHoverBackgroundColor: s.color, pointHoverBorderColor: t.superficie, pointHoverBorderWidth: 2,
          borderDash: s.punteado ? [5, 5] : undefined, segment: s.segment, spanGaps: true, stack: s.stack,
        })),
      },
      options: base(t, op),
    });
  }

  /** Barras. series: [{label, data, color}] */
  function barras(canvas, labels, series, op) {
    if (!canvas) return null;
    const t = tema();
    op = op || {};
    const cfg = base(t, op);
    if (op.horizontal) {
      cfg.indexAxis = 'y';
      const x = cfg.scales.x, y = cfg.scales.y;
      const ticksY = { ...x.ticks, autoSkip: false }; delete ticksY.callback;
      cfg.scales = { x: { ...y, grid: { color: t.borde } }, y: { ...x, ticks: ticksY } };
      cfg.plugins.tooltip.callbacks.label = ctx => ` ${ctx.dataset.label ? ctx.dataset.label + ': ' : ''}${F.dinero(ctx.parsed.x)}`;
    }
    return crear(canvas, {
      type: 'bar',
      data: { labels, datasets: series.map(s => ({ label: s.label, data: s.data, backgroundColor: s.colores || s.color, borderRadius: 4, borderSkipped: 'start', maxBarThickness: op.grosor || 26, borderColor: t.superficie, borderWidth: op.apilado ? { top: 2 } : 0, categoryPercentage: 0.7, barPercentage: 0.85 })) },
      options: cfg,
    });
  }

  /** Dona. datos: [{label, valor, color}] */
  function dona(canvas, datos, op) {
    if (!canvas) return null;
    const t = tema();
    const cfg = base(t, { ...op, sinEjes: true, modo: 'nearest' });
    cfg.cutout = '72%';
    cfg.plugins.tooltip.callbacks.label = ctx => ` ${ctx.label}: ${F.dinero(ctx.parsed)}`;
    return crear(canvas, {
      type: 'doughnut',
      data: { labels: datos.map(d => d.label), datasets: [{ data: datos.map(d => d.valor), backgroundColor: datos.map(d => d.color), borderColor: t.superficie, borderWidth: 2, borderRadius: 4, hoverOffset: 6, spacing: 1 }] },
      options: cfg,
    });
  }

  window.Graficas = { disponible, tema, limpiar, linea, barras, dona, hexA, base, crear };
})();
