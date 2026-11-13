/* =====================================================================
 * Vista: Deudas y tarjetas de crédito (corte, pago, utilización y
 * amortización con abonos extra).
 * ===================================================================== */
(function () {
  'use strict';
  const { Motor: M, Formato: F, Finanzas: Fz, UI, Graficas: G } = window;
  const sim = { extra: 500, monto: 50000, tasa: 24, meses: 24 };

  function tarjetaCredito(a, c) {
    const cc = a.calc.cuentas[c.id];
    const cr = c.credito || {};
    const uso = cr.limite ? cc.saldo / cr.limite * 100 : 0;
    const corte = M.proximoDiaDelMes(a.hoy, Number(cr.diaCorte) || 1), pago = M.proximoDiaDelMes(a.hoy, Number(cr.diaPago) || 1);
    const dc = M.D(corte) - a.calc.dHoy, dp = M.D(pago) - a.calc.dHoy;
    return `<div class="card">
      <div class="entre"><div class="fila-flex" style="gap:12px">${UI.burbuja('card', c.color)}<div><b style="font-size:15px">${UI.esc(c.nombre)}</b>${c.ultimos4 ? ` <span class="tenue">·${UI.esc(c.ultimos4)}</span>` : ''}<div class="fila-sub">${UI.esc(c.institucion)}${cr.tasaAnual ? ' · ' + F.pct(cr.tasaAnual) + ' anual' : ''}</div></div></div><button class="btn-icono sm" data-accion="editar-cuenta" data-id="${c.id}" aria-label="Editar">${UI.icono('edit')}</button></div>
      <div class="entre mt"><div><div class="kpi-label">Saldo usado</div><div class="kpi-valor rojo-txt">${UI.mc(cc.saldo)}</div></div><div style="text-align:right"><div class="kpi-label" style="justify-content:flex-end">Disponible</div><div class="grande-num">${UI.m(Math.max(0, (cr.limite || 0) - cc.saldo), { dec: 0 })}</div></div></div>
      <div class="mt">${UI.barra(uso, { color: uso > 50 ? 'var(--red)' : uso > 30 ? 'var(--yellow)' : 'var(--green)', clase: 'gruesa' })}</div>
      <div class="entre fila-sub mt-s"><span>Utilización ${Math.round(uso)} %${uso > 30 ? ' · <b class="rojo-txt">arriba del 30 %</b>' : ''}</span><span>Límite ${UI.m(cr.limite || 0, { dec: 0 })}</span></div>
      <div class="kpis mt">
        <div class="mini-kpi"><div class="kpi-label">Fecha de corte</div><div class="kpi-valor" style="font-size:15px">${F.fecha(corte, 'sinAnio')}</div><div class="fila-sub">${F.relativo(dc)}</div></div>
        <div class="mini-kpi"><div class="kpi-label">Límite de pago</div><div class="kpi-valor" style="font-size:15px">${F.fecha(pago, 'sinAnio')}</div><div class="fila-sub ${dp <= 3 ? 'rojo-txt' : ''}">${F.relativo(dp)}</div></div>
        <div class="mini-kpi"><div class="kpi-label">Pago mínimo</div><div class="kpi-valor" style="font-size:15px">${UI.m(cr.pagoMinimo || 0, { dec: 0 })}</div></div>
      </div>
      <div class="nota-caja mt">${UI.icono('info')}<span>Pago para no generar intereses: <b class="monto">${F.dinero(cr.pagoNoIntereses || cc.saldo)}</b>. Pagar solo el mínimo te puede costar ~${F.pct(cr.tasaAnual || 0, 0)} anual.</span></div>
      <div class="fila-flex mt"><button class="btn btn-primario btn-sm" data-pagar-tarjeta="${c.id}">${UI.icono('check')}Registrar pago</button><button class="btn btn-sm" data-accion="actualizar-saldo" data-id="${c.id}">${UI.icono('refresh')}Actualizar saldo</button></div>
    </div>`;
  }

  function simulador(a, c) {
    const cc = c ? a.calc.cuentas[c.id] : null;
    const p = c && c.prestamo ? c.prestamo : null;
    const saldo = cc ? cc.saldo : sim.monto, tasa = p ? p.tasaAnual : sim.tasa;
    const pago = p ? p.pagoMensual : Fz.pagoMensual(sim.monto, sim.tasa, sim.meses);
    const base = Fz.amortizacion(saldo, tasa, sim.meses, 0, pago);
    const con = Fz.amortizacion(saldo, tasa, sim.meses, sim.extra, pago);
    const id = c ? c.id : 'libre';
    return `<div class="card ${c ? 's-12' : 's-12'}" data-sim="${id}">
      <div class="card-head"><h3>${UI.icono('calculator')}${c ? UI.esc(c.nombre) : 'Calculadora de amortización'}</h3>${c ? `<button class="btn-icono sm" data-accion="editar-cuenta" data-id="${c.id}" aria-label="Editar">${UI.icono('edit')}</button>` : ''}</div>
      <div class="grid">
        <div class="s-5 pila" style="gap:12px">
          ${c ? `<dl class="dl"><dt>Saldo actual</dt><dd class="rojo-txt">${UI.m(saldo)}</dd><dt>Tasa anual</dt><dd>${F.pct(tasa)}</dd><dt>Pago mensual</dt><dd>${UI.m(pago)}</dd><dt>Monto original</dt><dd>${UI.m(p.montoOriginal || 0, { dec: 0 })}</dd></dl>` : `
            <div class="campo"><label>Monto</label><div class="input-pre"><span>$</span><input type="text" inputmode="decimal" data-sim-k="monto" value="${F.numero(sim.monto)}"></div></div>
            <div class="form"><div class="campo mitad m-mitad"><label>Tasa anual</label><div class="input-suf"><input type="number" step="0.1" data-sim-k="tasa" value="${sim.tasa}"><span>%</span></div></div><div class="campo mitad m-mitad"><label>Plazo (meses)</label><input type="number" data-sim-k="meses" value="${sim.meses}"></div></div>
            <dl class="dl"><dt>Pago mensual</dt><dd>${UI.m(pago)}</dd></dl>`}
          <div class="campo"><label>¿Qué pasa si abono extra cada mes? <b class="num" style="color:var(--text)">${F.dinero(sim.extra, { dec: 0 })}</b></label><input type="range" min="0" max="${Math.max(5000, Math.ceil(pago * 2 / 500) * 500)}" step="100" value="${sim.extra}" data-sim-extra></div>
          <div class="kpis" style="grid-template-columns:1fr 1fr">
            <div class="mini-kpi"><div class="kpi-label">Sin abono extra</div><div class="kpi-valor" style="font-size:15px">${base.meses} meses</div><div class="fila-sub">intereses ${UI.m(base.totalInteres, { dec: 0 })}</div></div>
            <div class="mini-kpi"><div class="kpi-label">Con abono extra</div><div class="kpi-valor verde-txt" style="font-size:15px">${con.meses} meses</div><div class="fila-sub">intereses ${UI.m(con.totalInteres, { dec: 0 })}</div></div>
          </div>
          ${sim.extra > 0 ? `<div class="mensaje">${UI.icono('sparkles')}<span>Abonando <strong>${F.dinero(sim.extra, { dec: 0 })}</strong> extra al mes terminas <strong>${base.meses - con.meses} meses antes</strong> y te ahorras <strong>${F.dinero(base.totalInteres - con.totalInteres, { dec: 0 })}</strong> en intereses.</span></div>` : ''}
        </div>
        <div class="s-7"><div class="grafica"><canvas data-g-sim="${id}" aria-label="Saldo del préstamo con y sin abono extra"></canvas></div>
          <details class="mt"><summary class="suave" style="cursor:pointer">Ver tabla de amortización (${con.meses} pagos)</summary>
            <div class="tabla-wrap mt"><table class="tabla"><thead><tr><th>Mes</th><th class="der">Pago</th><th class="der">Interés</th><th class="der">Capital</th><th class="der">Saldo</th></tr></thead><tbody>${con.filas.map(f => `<tr><td>${f.mes}</td><td class="der">${UI.m(f.pago)}</td><td class="der rojo-txt">${UI.m(f.interes)}</td><td class="der">${UI.m(f.capital)}</td><td class="der">${UI.m(f.saldo)}</td></tr>`).join('')}</tbody></table></div>
          </details>
        </div>
      </div>
    </div>`;
  }

  function render(a) {
    const tarjetas = a.estado.cuentas.filter(c => c.tipo === 'credito' && !c.archivada);
    const prestamos = a.estado.cuentas.filter(c => c.tipo === 'prestamo' && !c.archivada);
    const totalT = tarjetas.reduce((s, c) => s + a.calc.cuentas[c.id].saldo, 0), totalP = prestamos.reduce((s, c) => s + a.calc.cuentas[c.id].saldo, 0);
    const lim = tarjetas.reduce((s, c) => s + (Number(c.credito && c.credito.limite) || 0), 0);
    return `
    <div class="cabecera-vista"><button class="btn btn-primario" data-accion="nueva-cuenta">${UI.icono('plus')}Agregar tarjeta o préstamo</button></div>
    <div class="grid">
      <div class="card s-4"><div class="kpi-label">Deuda total</div><div class="kpi-valor rojo-txt">${UI.mc(a.calc.deudas)}</div></div>
      <div class="card s-4"><div class="kpi-label">Tarjetas</div><div class="kpi-valor">${UI.mc(totalT)}</div><div class="kpi-pie">utilización total ${lim ? Math.round(totalT / lim * 100) : 0} %</div></div>
      <div class="card s-4"><div class="kpi-label">Préstamos</div><div class="kpi-valor">${UI.mc(totalP)}</div></div>
    </div>
    <h3 class="seccion-titulo mt">${UI.icono('card')}Tarjetas de crédito</h3>
    ${tarjetas.length ? `<div class="tarjetas" style="grid-template-columns:repeat(auto-fill,minmax(340px,1fr))">${tarjetas.map(c => tarjetaCredito(a, c)).join('')}</div>` : `<div class="card">${UI.vacio({ icono: 'card', titulo: 'Sin tarjetas registradas', texto: 'Agrega tu tarjeta con su límite, día de corte y día de pago para recibir recordatorios.', boton: 'Agregar tarjeta', accion: 'nueva-cuenta', compacto: true })}</div>`}
    <h3 class="seccion-titulo mt">${UI.icono('receipt')}Préstamos y amortización</h3>
    <div class="grid">${prestamos.map(c => simulador(a, c)).join('')}${simulador(a, null)}</div>`;
  }

  function despues(a, cont) {
    const t = G.tema();
    cont.querySelectorAll('[data-g-sim]').forEach(cv => {
      const id = cv.dataset.gSim;
      const c = id === 'libre' ? null : a.cuenta(id);
      const saldo = c ? a.calc.cuentas[id].saldo : sim.monto, tasa = c ? c.prestamo.tasaAnual : sim.tasa;
      const pago = c ? c.prestamo.pagoMensual : Fz.pagoMensual(sim.monto, sim.tasa, sim.meses);
      const b = Fz.amortizacion(saldo, tasa, sim.meses, 0, pago), x = Fz.amortizacion(saldo, tasa, sim.meses, sim.extra, pago);
      const n = Math.max(b.meses, x.meses);
      const labels = Array.from({ length: n + 1 }, (_, i) => i === 0 ? 'Hoy' : F.fecha(M.sumarMeses(a.hoy, i), 'mesCorto'));
      const serie = am => [saldo, ...Array.from({ length: n }, (_, i) => am.filas[i] ? Math.round(am.filas[i].saldo) : 0)];
      G.linea(cv, labels, [{ label: 'Sin abono extra', data: serie(b), color: t.series[7] }, { label: 'Con abono extra', data: serie(x), color: t.verde, area: true, alfa: 0.18 }], { leyenda: true });
    });
    cont.querySelectorAll('[data-sim-extra]').forEach(r => r.addEventListener('change', () => { sim.extra = Number(r.value); a.render(false); }));
    cont.querySelectorAll('[data-sim-extra]').forEach(r => r.addEventListener('input', () => { const lab = r.closest('.campo').querySelector('b'); lab.textContent = F.dinero(Number(r.value), { dec: 0 }); }));
    cont.querySelectorAll('[data-sim-k]').forEach(i => i.addEventListener('change', () => { sim[i.dataset.simK] = UI.numero(i.value) || 0; a.render(false); }));
    cont.querySelectorAll('[data-pagar-tarjeta]').forEach(b => b.addEventListener('click', () => {
      const c = a.cuenta(b.dataset.pagarTarjeta);
      window.Forms.movimiento({ tipo: 'transferencia', monto: Math.round((Number(c.credito.pagoNoIntereses) || a.calc.cuentas[c.id].saldo) * 100) / 100, cuentaId: a.estado.config.cuentaPrincipalId || '', cuentaDestinoId: c.id, nota: 'Pago ' + c.nombre });
    }));
  }

  window.App.registrar('deudas', { titulo: 'Deudas y tarjetas', sub: 'Cortes, pagos, utilización y amortización', render, despues });
})();
