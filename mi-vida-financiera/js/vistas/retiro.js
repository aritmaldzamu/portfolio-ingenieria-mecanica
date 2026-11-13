/* =====================================================================
 * Vista: PPR y retiro — simulador con beneficio fiscal
 * (art. 151 fracc. V LISR) y registro de Afore.
 * ===================================================================== */
(function () {
  'use strict';
  const { Motor: M, Formato: F, Finanzas: Fz, UI, Graficas: G } = window;

  /** Simulación año por año: PPR (devolución reinvertida) vs. ahorro normal. */
  function simular(a) {
    const est = a.estado, cfg = est.config, p = est.ppr;
    const edad = Number(cfg.edad) || 23, retiro = Number(p.edadRetiro) || 65;
    const anios = Math.max(1, retiro - edad);
    const ingreso = Number(p.ingresoAnual) || M.ingresoMensualFuentes(est).anualBruto || 0;
    const aport = (Number(p.aportacionMensual) || 0) * 12;
    const ded = Fz.deduccionPPR(aport, ingreso, cfg.umaDiaria);
    const tasaMarg = p.tasaMarginal != null && p.tasaMarginal !== '' ? Number(p.tasaMarginal) : Fz.tasaMarginalISR(ingreso, cfg.tablaISR);
    const devol = p.tasaMarginal != null && p.tasaMarginal !== '' ? ded.deducible * tasaMarg / 100 : Fz.devolucionISR(ingreso, ded.deducible, cfg.tablaISR);
    const r = Number(p.rendimiento) || 0;
    const rNormal = Fz.tasaNeta(r, cfg.retencionISR);
    const fa = x => Math.pow(1 + Fz.tasaMensualEquivalente(x, 'mensual'), 12);
    const serie = [];
    let vPPR = 0, vNormal = 0, aportado = 0, devueltos = 0;
    for (let y = 0; y <= anios; y++) {
      serie.push({ edad: edad + y, ppr: vPPR, normal: vNormal, aportado, real: Fz.aValorReal(vPPR, cfg.inflacion, y) });
      // Aportaciones mensuales durante el año
      vPPR = Fz.valorFuturo(vPPR, aport / 12, r, 12, 'mensual').total;
      vNormal = Fz.valorFuturo(vNormal, aport / 12, rNormal, 12, 'mensual').total;
      aportado += aport;
      // La devolución del SAT llega en abril del año siguiente y se reinvierte en el PPR
      if (y < anios) { vPPR += devol; devueltos += devol; }
      void fa;
    }
    return { edad, retiro, anios, ingreso, aport, ded, tasaMarg, devol, r, rNormal, serie, final: serie[serie.length - 1], devueltos };
  }

  function render(a) {
    const est = a.estado, cfg = est.config, p = est.ppr;
    const s = simular(a);
    const afoCuenta = est.cuentas.find(c => c.tipo === 'afore' && !c.archivada);
    const af = est.afore;
    const saldoAfore = afoCuenta ? a.calc.cuentas[afoCuenta.id].saldo : Number(af.saldo) || 0;
    const tasaAfore = afoCuenta ? a.calc.cuentas[afoCuenta.id].tasaBruta : Number(af.rendimiento) || 0;
    const proyAfore = Fz.valorFuturo(saldoAfore, Number(af.aportacionesVoluntarias) || 0, tasaAfore, s.anios * 12, 'mensual');
    const inp = (k, v, suf, pre, step) => `<div class="${pre ? 'input-pre' : suf ? 'input-suf' : ''}">${pre ? '<span>$</span>' : ''}<input type="${pre ? 'text' : 'number'}" inputmode="decimal" ${step ? `step="${step}"` : ''} data-ppr="${k}" value="${v == null ? '' : (pre ? F.numero(v) : v)}">${suf ? `<span>${suf}</span>` : ''}</div>`;
    return `
    <div class="grid">
      <section class="card s-4">
        <div class="card-head"><h3>${UI.icono('umbrella')}Simulador de PPR</h3></div>
        <div class="form">
          <div class="campo"><label>Aportación mensual</label>${inp('aportacionMensual', p.aportacionMensual, null, true)}</div>
          <div class="campo mitad m-mitad"><label>Rendimiento esperado</label>${inp('rendimiento', p.rendimiento, '%', false, 0.1)}</div>
          <div class="campo mitad m-mitad"><label>Edad actual</label><input type="number" data-cfg-edad value="${cfg.edad}"></div>
          <div class="campo mitad m-mitad"><label>Edad de retiro</label>${inp('edadRetiro', p.edadRetiro)}</div>
          <div class="campo mitad m-mitad"><label>Tasa marginal ISR</label>${inp('tasaMarginal', p.tasaMarginal, '%', false, 0.01)}<span class="ayuda">Vacío = tabla (${F.pct(s.tasaMarg)})</span></div>
          <div class="campo"><label>Ingreso anual acumulable</label>${inp('ingresoAnual', p.ingresoAnual, null, true)}<span class="ayuda">Vacío = tus fuentes de ingreso (${F.dinero(M.ingresoMensualFuentes(est).anualBruto, { dec: 0 })})</span></div>
        </div>
      </section>
      <section class="card s-8">
        <div class="card-head"><h3>${UI.icono('chart')}Crecimiento a los ${s.retiro} años</h3><span class="sub">PPR (con devolución reinvertida) vs. ahorrar lo mismo sin beneficio fiscal</span></div>
        <div class="kpis">
          <div class="mini-kpi"><div class="kpi-label">PPR a los ${s.retiro}</div><div class="kpi-valor verde-txt">${UI.m(s.final.ppr, { dec: 0, compacto: true })}</div><div class="fila-sub">${UI.m(s.final.real, { dec: 0, compacto: true })} en pesos de hoy</div></div>
          <div class="mini-kpi"><div class="kpi-label">Sin beneficio</div><div class="kpi-valor">${UI.m(s.final.normal, { dec: 0, compacto: true })}</div><div class="fila-sub">a ${F.pct(s.rNormal)} neto</div></div>
          <div class="mini-kpi"><div class="kpi-label">Diferencia</div><div class="kpi-valor" style="color:var(--accent-2)">${UI.m(s.final.ppr - s.final.normal, { dec: 0, compacto: true })}</div><div class="fila-sub">aportas ${UI.m(s.final.aportado, { dec: 0, compacto: true })}</div></div>
        </div>
        <div class="grafica mt"><canvas id="g-ppr" aria-label="Crecimiento del PPR contra ahorro normal"></canvas></div>
      </section>

      <section class="card s-6">
        <div class="card-head"><h3>${UI.icono('receipt')}Beneficio fiscal (art. 151 fracc. V LISR)</h3></div>
        <dl class="dl">
          <dt>Aportas al año</dt><dd>${UI.m(s.aport, { dec: 0 })}</dd>
          <dt>Tope 10 % de tus ingresos</dt><dd>${UI.m(s.ded.topeIngreso, { dec: 0 })}</dd>
          <dt>Tope 5 UMA anuales (UMA ${F.dinero(cfg.umaDiaria)})</dt><dd>${UI.m(s.ded.topeUMA, { dec: 0 })}</dd>
          <dt><b>Deducible</b></dt><dd><b>${UI.m(s.ded.deducible, { dec: 0 })}</b></dd>
          <dt>Tu tasa marginal de ISR</dt><dd>${F.pct(s.tasaMarg)}</dd>
          <dt><b>Devolución estimada del SAT</b></dt><dd class="verde-txt"><b>${UI.m(s.devol, { dec: 0 })}</b> al año</dd>
        </dl>
        ${s.aport > s.ded.limite ? `<div class="nota-caja aviso mt">${UI.icono('alert')}<span>Aportas ${F.dinero(s.aport - s.ded.limite, { dec: 0 })} más de lo deducible. Ese excedente no genera devolución.</span></div>` : ''}
        <div class="mensaje mt">${UI.icono('sparkles')}<span>Por cada <strong>$1,000</strong> que pones en el PPR, el SAT te regresa ~<strong>${F.dinero(s.ded.deducible > 0 ? s.devol / s.ded.deducible * 1000 : 0, { dec: 0 })}</strong>. Si reinviertes la devolución, a los ${s.retiro} años son ${UI.m(s.final.ppr - s.final.normal, { dec: 0 })} extra.</span></div>
        <p class="nota mt">Estimación: la devolución real depende de tu declaración anual. Los valores de UMA y la tabla del ISR se editan en Configuración.</p>
      </section>
      <section class="card s-6">
        <div class="nota-caja peligro">${UI.icono('alert')}<span><b>Importante:</b> si retiras tu PPR antes de los 65 años <b>pierdes el beneficio fiscal</b>: lo retirado se considera ingreso y pagas ISR, y la institución te retiene <b>20 %</b> al momento del retiro. Úsalo solo para dinero de largo plazo.</span></div>
        <div class="card-head mt"><h3>${UI.icono('shield')}Mi Afore</h3>${afoCuenta ? `<a class="btn btn-sm btn-fantasma" href="#/cuentas/${afoCuenta.id}">Ver cuenta</a>` : ''}</div>
        <div class="form">
          <div class="campo mitad m-mitad"><label>Saldo</label>${afoCuenta ? `<div class="grande-num">${UI.m(saldoAfore)}</div><span class="ayuda">De tu cuenta "${UI.esc(afoCuenta.nombre)}"</span>` : `<div class="input-pre"><span>$</span><input type="text" inputmode="decimal" data-afore="saldo" value="${F.numero(af.saldo || 0)}"></div>`}</div>
          <div class="campo mitad m-mitad"><label>Aportaciones voluntarias / mes</label><div class="input-pre"><span>$</span><input type="text" inputmode="decimal" data-afore="aportacionesVoluntarias" value="${F.numero(af.aportacionesVoluntarias || 0)}"></div></div>
          ${afoCuenta ? '' : `<div class="campo mitad m-mitad"><label>Rendimiento anual</label><div class="input-suf"><input type="number" step="0.1" data-afore="rendimiento" value="${af.rendimiento}"><span>%</span></div></div>`}
        </div>
        <div class="mensaje mt">${UI.icono('sparkles')}<span>Con ${F.pct(tasaAfore)} y ${F.dinero(af.aportacionesVoluntarias || 0, { dec: 0 })}/mes de voluntarias, a los ${s.retiro} tu Afore tendría ~<strong>${F.dinero(proyAfore.total, { dec: 0 })}</strong> (${F.dinero(Fz.aValorReal(proyAfore.total, cfg.inflacion, s.anios), { dec: 0 })} en pesos de hoy), sin contar las aportaciones obligatorias de tu patrón.</span></div>
      </section>
    </div>`;
  }

  function despues(a, cont) {
    const s = simular(a);
    const t = G.tema();
    G.linea(cont.querySelector('#g-ppr'), s.serie.map(x => x.edad + ' años'), [
      { label: 'PPR', data: s.serie.map(x => Math.round(x.ppr)), color: t.verde, area: true },
      { label: 'Sin beneficio fiscal', data: s.serie.map(x => Math.round(x.normal)), color: t.series[0] },
      { label: 'Aportado', data: s.serie.map(x => Math.round(x.aportado)), color: t.tenue, punteado: true },
    ], { leyenda: true, maxX: 9 });
    cont.querySelectorAll('[data-ppr]').forEach(i => i.addEventListener('change', () => a.mutar(e => { const v = UI.numero(i.value); e.ppr[i.dataset.ppr] = v; })));
    cont.querySelectorAll('[data-afore]').forEach(i => i.addEventListener('change', () => a.mutar(e => { e.afore[i.dataset.afore] = UI.numero(i.value) || 0; e.afore.actualizado = a.hoy; })));
    const ed = cont.querySelector('[data-cfg-edad]');
    if (ed) ed.addEventListener('change', () => a.mutar(e => { e.config.edad = UI.numero(ed.value) || 23; }));
  }

  window.App.registrar('retiro', { titulo: 'PPR y retiro', sub: 'Simulador con beneficio fiscal y tu Afore', render, despues });
})();
