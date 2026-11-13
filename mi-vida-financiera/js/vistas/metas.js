/* =====================================================================
 * Vista: Metas de ahorro.
 * ===================================================================== */
(function () {
  'use strict';
  const { Motor: M, Formato: F, Finanzas: Fz, UI } = window;
  const PRIOR = { alta: ['Alta', 'rojo'], media: ['Media', 'amarillo'], baja: ['Baja', ''] };

  function render(a) {
    const est = a.estado, calc = a.calc;
    const gp = M.gastoPromedioMensual(est, a.hoy);
    const ahorroProm = M.ahorroPromedioMensual(est, a.hoy);
    const cab = `<div class="cabecera-vista"><button class="btn btn-primario" data-accion="nueva-meta">${UI.icono('plus')}Nueva meta</button>
      <label class="fila-flex suave" style="gap:8px">Fondo de emergencia =
        <select id="fondo-meses" style="width:auto;min-height:34px;padding:5px 10px">${[3, 4, 5, 6].map(n => `<option value="${n}" ${Number(est.config.fondoMeses) === n ? 'selected' : ''}>${n} meses</option>`).join('')}</select>
        × ${UI.m(gp, { dec: 0 })} de gasto promedio</label></div>`;
    if (!est.metas.length) return cab + `<div class="card">${UI.vacio({ icono: 'target', titulo: 'Define tu primera meta', texto: 'Ejemplos: Fondo de emergencia, Capital para mi negocio, Mudanza / trabajar fuera de México, Laptop / herramientas.', boton: 'Nueva meta', accion: 'nueva-meta' })}</div>`;
    const datos = est.metas.map(mt => ({ mt, p: M.progresoMeta(est, calc, mt) })).sort((x, y) => ['alta', 'media', 'baja'].indexOf(x.mt.prioridad) - ['alta', 'media', 'baja'].indexOf(y.mt.prioridad));
    const totalObj = datos.reduce((s, d) => s + d.p.objetivo, 0), totalAct = datos.reduce((s, d) => s + d.p.actual, 0);
    const necesarioTotal = datos.reduce((s, d) => s + (d.p.necesario || 0), 0);
    return cab + `
    <div class="grid">
      <div class="card s-4"><div class="kpi-label">Ahorrado para metas</div><div class="kpi-valor">${UI.mc(totalAct)}</div><div class="kpi-pie">de ${UI.m(totalObj, { dec: 0 })} (${totalObj ? Math.round(totalAct / totalObj * 100) : 0} %)</div></div>
      <div class="card s-4"><div class="kpi-label">Necesitas al mes (todas)</div><div class="kpi-valor">${UI.mc(necesarioTotal, { dec: 0 })}</div><div class="kpi-pie">para llegar a tiempo a cada fecha</div></div>
      <div class="card s-4"><div class="kpi-label">Tu ahorro promedio</div><div class="kpi-valor ${ahorroProm >= necesarioTotal ? 'verde-txt' : 'rojo-txt'}">${UI.mc(ahorroProm, { dec: 0 })}</div><div class="kpi-pie">${ahorroProm >= necesarioTotal ? 'Te alcanza para todas tus metas' : `Te faltan ${F.dinero(necesarioTotal - ahorroProm, { dec: 0 })}/mes; prioriza`}</div></div>
    </div>
    <div class="tarjetas mt">${datos.map(({ mt, p }) => {
      const ap = mt.vinculo === 'apartado' ? a.apartado(mt.vinculoId) : null;
      const cu = mt.vinculo === 'cuenta' ? a.cuenta(mt.vinculoId) : null;
      const pmt = ap ? M.aportacionApartado(est, ap.id, a.hoy) : 0;
      const llega = pmt > 0 && p.faltante > 0 ? Fz.mesesParaMeta(p.actual, pmt, p.tasa, p.objetivo, 'diaria') : null;
      const [pn, pc] = PRIOR[mt.prioridad] || PRIOR.media;
      return `<div class="card tcuenta" data-accion="editar-meta" data-id="${mt.id}" style="--c:${mt.color}">
        <div class="fila-flex" style="gap:12px;flex-wrap:nowrap">${UI.burbuja(mt.icono || 'target', mt.color)}<div class="fila-txt"><div class="fila-titulo" style="font-size:15px">${UI.esc(mt.nombre)}</div><div class="fila-sub">${ap ? 'Apartado: ' + UI.esc(ap.nombre) : cu ? 'Cuenta: ' + UI.esc(cu.nombre) : 'Se actualiza a mano'}${mt.fechaLimite ? ' · ' + F.fecha(mt.fechaLimite, 'media') : ''}</div></div><span class="chip ${pc}">${pn}</span></div>
        <div class="saldo">${UI.m(p.actual, { dec: 0 })} <span class="tenue" style="font-size:15px;font-weight:500">/ ${UI.m(p.objetivo, { dec: 0 })}</span></div>
        ${UI.barra(p.pct, { color: mt.color, clase: 'gruesa' })}
        <div class="entre fila-sub mt-s"><span>${Math.round(p.pct)} %</span><span>Faltan ${UI.m(p.faltante, { dec: 0 })}</span></div>
        ${mt.auto === 'fondo' ? `<div class="nota mt">Meta automática: ${est.config.fondoMeses} meses × tu gasto promedio real (${F.dinero(gp, { dec: 0 })}).</div>` : ''}
        <div class="mensajes mt">
          ${p.faltante <= 0 ? `<div class="mensaje">${UI.icono('check')}<span>¡Meta cumplida! 🎯</span></div>`.replace(' 🎯', '') :
            p.necesario != null ? `<div class="mensaje">${UI.icono('sparkles')}<span>Necesitas ahorrar <strong>${F.dinero(p.necesario, { dec: 0 })} al mes</strong> para llegar a tiempo${p.tasa > 0 ? ` (ya considera ${F.pct(p.tasa)} de rendimiento)` : ''}.</span></div>` : ''}
          ${llega != null && isFinite(llega) ? `<div class="nota">Al ritmo actual (${F.dinero(pmt, { dec: 0 })}/mes) llegas en ${F.duracion(llega)}, en ${F.fecha(M.sumarMeses(a.hoy, llega), 'mes')}.</div>` : ''}
        </div>
      </div>`;
    }).join('')}</div>`;
  }

  function despues(a, cont) {
    const sel = cont.querySelector('#fondo-meses');
    if (sel) sel.addEventListener('change', () => a.mutar(e => { e.config.fondoMeses = Number(sel.value); }, 'Meta del fondo actualizada', { deshacer: false }));
  }

  window.App.registrar('metas', { titulo: 'Metas de ahorro', sub: 'Cuánto necesitas al mes para llegar a tiempo', render, despues });
})();
