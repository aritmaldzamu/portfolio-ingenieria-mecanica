/* =====================================================================
 * Vista: Cuentas y rendimientos — lista y detalle de cada cuenta.
 * ===================================================================== */
(function () {
  'use strict';
  const { Motor: M, Formato: F, UI, Graficas: G, Forms } = window;
  const app = () => window.App;

  const ORDEN_GRUPOS = [
    ['Con rendimiento', c => ['rendimiento', 'cajita', 'cetes', 'inversion'].includes(c.tipo)],
    ['Cuentas de uso diario', c => ['debito', 'efectivo'].includes(c.tipo)],
    ['Retiro', c => ['ppr', 'afore'].includes(c.tipo)],
    ['Deudas', c => M.esDeuda(c)],
  ];

  function tarjeta(a, c) {
    const cc = a.calc.cuentas[c.id];
    const t = M.TIPOS_CUENTA[c.tipo];
    const rinde = !M.esDeuda(c) && c.historialTasas.length && cc.tasaBruta > 0;
    const aps = a.estado.apartados.map(ap => ({ ap, v: a.calc.apartados[ap.id].porCuenta[c.id] || 0 })).filter(x => Math.abs(x.v) > 0.5);
    const libre = a.calc.sinAsignar[c.id];
    let cuerpo = '';
    if (c.tipo === 'credito' && c.credito) {
      const uso = c.credito.limite ? cc.saldo / c.credito.limite * 100 : 0;
      cuerpo = `<div class="mt">${UI.barra(uso, { semaforo: false, color: uso > 30 ? 'var(--red)' : 'var(--green)' })}<div class="entre fila-sub mt-s"><span>Usas ${Math.round(uso)} % de ${UI.m(c.credito.limite, { dec: 0 })}</span><span>Corte día ${c.credito.diaCorte} · pago día ${c.credito.diaPago}</span></div></div>`;
    } else if (c.tipo === 'prestamo' && c.prestamo) {
      cuerpo = `<div class="fila-sub mt">Pago ${UI.m(c.prestamo.pagoMensual)} al mes · ${F.pct(c.prestamo.tasaAnual)} anual</div>`;
    } else if (rinde) {
      cuerpo = `<div class="tcuenta-pie"><span class="chip verde">+${UI.m(cc.diario)}/día</span><span class="chip">+${UI.m(cc.mensual, { dec: 0 })}/mes</span><span class="chip">+${UI.m(cc.anual, { dec: 0 })}/año</span></div>`;
    }
    return `<a class="card tcuenta" href="#/cuentas/${c.id}" style="--c:${c.color};color:var(--text)">
      <div class="fila-flex" style="gap:12px;flex-wrap:nowrap">${UI.burbuja(t.icono, c.color)}<div class="fila-txt"><div class="fila-titulo" style="font-size:15px">${UI.esc(c.nombre)}${c.ultimos4 ? ` <span class="tenue">·${UI.esc(c.ultimos4)}</span>` : ''}</div><div class="fila-sub">${UI.esc(c.institucion)} · ${t.nombre}</div></div>
      ${rinde ? `<span class="chip acento">${F.pct(cc.tasaBruta)}</span>` : ''}</div>
      <div class="saldo ${M.esDeuda(c) ? 'rojo-txt' : ''}">${UI.m(M.esDeuda(c) ? -cc.saldo : cc.saldo)}</div>
      ${rinde ? `<div class="fila-sub">Neto ${F.pct(cc.tasaNeta)} · GAT nominal ${F.pct(cc.gatN)} · GAT real ${F.pct(cc.gatR)}</div>` : ''}
      ${rinde && c.historialTasas.length ? `<div class="fila-sub" style="white-space:normal">${Forms.describirTramos(cc.entrada.tramos)}${cc.promo ? ` · <b class="verde-txt">promo ${F.pct(cc.promo.tasa)}</b>` : ''}</div>` : ''}
      ${cuerpo}
      ${aps.length ? `<div class="reparto">${aps.map(x => `<div class="reparto-fila"><span><span class="punto" style="--c:${x.ap.color}"></span>${UI.esc(x.ap.nombre)}</span><span class="monto">${F.dinero(x.v, { dec: 0 })}</span></div>`).join('')}<div class="reparto-fila"><span><span class="punto" style="--c:var(--text-3)"></span>Sin asignar</span><span class="monto ${libre < -1 ? 'rojo-txt' : ''}">${F.dinero(libre, { dec: 0 })}</span></div></div>` : ''}
      ${rinde ? `<div class="mt-s">${Forms.ETQ_VERIFICA}</div>` : ''}
    </a>`;
  }

  function lista(a) {
    const est = a.estado, calc = a.calc;
    if (!est.cuentas.length) return `<div class="card">${UI.vacio({ icono: 'wallet', titulo: 'Agrega tu primera cuenta para empezar', texto: 'Nu, Revolut, Cetesdirecto, tu cuenta de nómina, efectivo, tarjetas… Las tasas vienen precargadas como ejemplo y las puedes editar.', boton: 'Nueva cuenta', accion: 'nueva-cuenta' })}<div class="fila-flex" style="justify-content:center"><button class="btn" data-accion="cargar-demo">${UI.icono('sparkles')}O carga datos de ejemplo</button></div></div>`;
    const activas = est.cuentas.filter(c => !c.archivada), archivadas = est.cuentas.filter(c => c.archivada);
    return `
    <div class="cabecera-vista">
      <div class="fila-flex"><button class="btn btn-primario" data-accion="nueva-cuenta">${UI.icono('plus')}Nueva cuenta</button><a class="btn" href="#/comparador">${UI.icono('percent')}¿Dónde me conviene?</a></div>
      <span class="nota">Las tasas son editables: ${Forms.ETQ_VERIFICA}</span>
    </div>
    <div class="grid">
      <div class="card s-3"><div class="kpi-label">Activos</div><div class="kpi-valor">${UI.mc(calc.activos)}</div></div>
      <div class="card s-3"><div class="kpi-label">Deudas</div><div class="kpi-valor rojo-txt">${UI.mc(calc.deudas)}</div></div>
      <div class="card s-3"><div class="kpi-label">Tasa neta promedio</div><div class="kpi-valor">${F.pct(calc.tasaPonderada)}</div><div class="kpi-pie">ponderada por saldo</div></div>
      <div class="card s-3"><div class="kpi-label"><span class="pulso"></span>Rendimiento de hoy</div><div class="kpi-valor"><span class="vivo monto" data-vivo="${calc.rendimiento.diario}" data-dec="4">$0</span></div><div class="kpi-pie">${UI.m(calc.rendimiento.anual, { dec: 0 })} al año</div></div>
    </div>
    ${ORDEN_GRUPOS.map(([titulo, fn]) => { const cs = activas.filter(fn); return cs.length ? `<h3 class="seccion-titulo mt">${titulo}</h3><div class="tarjetas">${cs.map(c => tarjeta(a, c)).join('')}</div>` : ''; }).join('')}
    ${archivadas.length ? `<h3 class="seccion-titulo mt">Archivadas</h3><div class="tarjetas" style="opacity:.6">${archivadas.map(c => tarjeta(a, c)).join('')}</div>` : ''}`;
  }

  function detalle(a, id) {
    const c = a.cuenta(id);
    if (!c) return `<div class="card">${UI.vacio({ icono: 'wallet', titulo: 'Esa cuenta ya no existe', boton: 'Ver cuentas', accion: 'ir', datos: 'data-ruta="cuentas"' })}</div>`;
    const cc = a.calc.cuentas[id];
    const t = M.TIPOS_CUENTA[c.tipo];
    const deuda = M.esDeuda(c);
    const rinde = !deuda && c.historialTasas.length;
    const movs = a.estado.movimientos.filter(m => m.cuentaId === id || m.cuentaDestinoId === id).sort((x, y) => y.fecha.localeCompare(x.fecha)).slice(0, 12);
    const aps = a.estado.apartados.map(ap => ({ ap, v: a.calc.apartados[ap.id].porCuenta[id] || 0 })).filter(x => Math.abs(x.v) > 0.5);
    const venc = c.tipo === 'cetes' ? M.proximoVencimiento(c, a.hoy) : null;
    return `
    <a class="volver" href="#/cuentas">${UI.icono('chevronLeft', 'ico-sm')}Cuentas</a>
    <div class="card card-destacada" style="--accent:${c.color}">
      <div class="entre" style="flex-wrap:wrap;align-items:flex-start">
        <div class="detalle-hero">${UI.burbuja(t.icono, c.color, 'lg')}<div><div class="kpi-label">${UI.esc(c.institucion)} · ${t.nombre}${c.ultimos4 ? ' · ·' + UI.esc(c.ultimos4) : ''}</div><div class="kpi-valor ${deuda ? 'rojo-txt' : ''}">${UI.mc(deuda ? -cc.saldo : cc.saldo)}</div>
        <div class="kpi-pie">${rinde ? `<span class="chip acento">${F.pct(cc.tasaBruta)} bruta</span><span class="chip verde">${F.pct(cc.tasaNeta)} neta</span>` : ''}${cc.promo ? `<span class="chip verde">Promo ${F.pct(cc.promo.tasa)}</span>` : ''}${venc ? `<span class="chip">Vence ${F.fecha(venc, 'media')}${c.reinvertir ? ' · reinversión' : ''}</span>` : ''}</div></div></div>
        <div class="fila-flex"><button class="btn btn-primario" data-accion="actualizar-saldo" data-id="${id}">${UI.icono('refresh')}Actualizar saldo</button>${rinde ? `<button class="btn" data-accion="editar-tasa" data-id="${id}">${UI.icono('percent')}Cambiar tasa</button>` : ''}${!deuda ? `<button class="btn" data-accion="depositar" data-cuenta="${id}">${UI.icono('layers')}Depositar a apartado</button>` : ''}<button class="btn-icono" data-accion="editar-cuenta" data-id="${id}" aria-label="Editar cuenta">${UI.icono('edit')}</button><button class="btn-icono" data-accion="archivar-cuenta" data-id="${id}" aria-label="${c.archivada ? 'Desarchivar' : 'Archivar'}" title="${c.archivada ? 'Desarchivar' : 'Archivar'}">${UI.icono(c.archivada ? 'upload' : 'download')}</button></div>
      </div>
    </div>
    <div class="grid mt">
      ${rinde ? `
      <div class="card s-3 card-sm"><div class="kpi-label">Rendimiento diario</div><div class="grande-num verde-txt">${UI.m(cc.diario)}</div></div>
      <div class="card s-3 card-sm"><div class="kpi-label">Mensual estimado</div><div class="grande-num">${UI.m(cc.mensual)}</div></div>
      <div class="card s-3 card-sm"><div class="kpi-label">Anual estimado</div><div class="grande-num">${UI.m(cc.anual)}</div></div>
      <div class="card s-3 card-sm"><div class="kpi-label">GAT nominal / real</div><div class="grande-num">${F.pct(cc.gatN)} <span class="tenue" style="font-size:14px">/ ${F.pct(cc.gatR)}</span></div></div>` : ''}
      <section class="card ${rinde ? 's-8' : 's-12'}">
        <div class="card-head"><h3>${UI.icono('chart')}Saldo en el tiempo</h3></div>
        <div class="grafica"><canvas id="g-cuenta" aria-label="Saldo de la cuenta en el tiempo"></canvas></div>
      </section>
      ${rinde ? `<section class="card s-4">
        <div class="card-head"><h3>${UI.icono('percent')}Tasa</h3>${Forms.ETQ_VERIFICA}</div>
        <p style="font-weight:550">${Forms.describirTramos(cc.entrada.tramos)}</p>
        <dl class="dl mt"><dt>Capitalización</dt><dd>${{ diaria: 'Diaria', mensual: 'Mensual', vencimiento: `Al vencimiento (${c.plazo || 28} días)`, ninguna: '—' }[cc.cap]}</dd><dt>Retención ISR</dt><dd>${c.aplicaISR ? F.pct(a.estado.config.retencionISR) + ' anual' : 'No aplica'}</dd><dt>Actualizada</dt><dd>${F.fecha(cc.tasaActualizada, 'media')}</dd></dl>
        <div class="divisor"></div>
        <div class="campo-label">Historial de tasas</div>
        <div class="lista">${[...c.historialTasas].reverse().map(h => `<div class="fila" style="padding:7px 0"><div class="fila-txt"><div class="fila-sub" style="white-space:normal;color:var(--text-2)">${Forms.describirTramos(h.tramos)}${h.promo ? ` · promo ${F.pct(h.promo.tasa)}` : ''}</div></div><div class="fila-der fila-sub">desde ${F.fecha(h.fecha, 'media')}</div></div>`).join('')}</div>
      </section>` : ''}
      ${aps.length ? `<section class="card s-5"><div class="card-head"><h3>${UI.icono('layers')}Apartados en esta cuenta</h3></div><div class="lista">${aps.map(x => `<a class="fila clic" href="#/apartados/${x.ap.id}" style="color:var(--text)">${UI.burbuja(x.ap.icono, x.ap.color, 'sm')}<div class="fila-txt"><div class="fila-titulo">${UI.esc(x.ap.nombre)}</div></div><div class="fila-der num">${UI.m(x.v)}</div></a>`).join('')}<div class="fila"><span class="burbuja sm" style="--c:var(--text-3)">${UI.icono('dots')}</span><div class="fila-txt"><div class="fila-titulo">Sin asignar</div></div><div class="fila-der num">${UI.m(a.calc.sinAsignar[id])}</div></div></div></section>` : ''}
      <section class="card ${aps.length ? 's-7' : 's-12'}">
        <div class="card-head"><h3>${UI.icono('swap')}Movimientos recientes</h3><a class="btn btn-sm btn-fantasma" href="#/movimientos">Ver todos</a></div>
        ${movs.length ? `<div class="lista">${movs.map(m => filaMov(a, m, id)).join('')}</div>` : UI.vacio({ icono: 'swap', titulo: 'Sin movimientos', compacto: true })}
      </section>
      <section class="card s-12">
        <div class="card-head"><h3>${UI.icono('refresh')}Historial de saldos</h3><span class="sub">Cada "actualizar saldo" ancla la gráfica de patrimonio a la realidad</span></div>
        <div class="tabla-wrap"><table class="tabla"><thead><tr><th>Fecha</th><th class="der">Saldo registrado</th><th></th></tr></thead><tbody>${[...c.historialSaldos].sort((x, y) => y.fecha.localeCompare(x.fecha)).map(h => `<tr><td>${F.fecha(h.fecha, 'media')}</td><td class="der">${UI.m(h.saldo)}</td><td class="der"><button class="btn-icono sm" data-accion="borrar-saldo" data-cuenta="${id}" data-id="${h.id || ''}" data-fecha="${h.fecha}" aria-label="Eliminar">${UI.icono('trash')}</button></td></tr>`).join('')}</tbody></table></div>
      </section>
    </div>`;
  }

  function filaMov(a, m, cuentaId) {
    const cat = a.categoria(m.categoriaId);
    const neutral = m.tipo === 'transferencia' && cuentaId !== m.cuentaId && cuentaId !== m.cuentaDestinoId;
    const signo = m.tipo === 'ingreso' ? 1 : m.tipo === 'gasto' ? -1 : (m.cuentaDestinoId === cuentaId ? 1 : -1);
    const monto = m.tipo === 'gasto' ? M.parteMia(m) : m.monto;
    const ico = m.tipo === 'transferencia' ? 'swap' : (cat ? cat.icono : 'dots');
    const color = m.tipo === 'transferencia' ? 'var(--blue)' : (cat ? cat.color : '#888');
    const titulo = m.nota || (m.tipo === 'transferencia' ? `${a.nombreCuenta(m.cuentaId)} → ${a.nombreCuenta(m.cuentaDestinoId)}` : (cat ? cat.nombre : 'Movimiento'));
    return `<div class="fila clic" data-accion="editar-movimiento" data-id="${m.id}">${UI.burbuja(ico, color, 'sm')}<div class="fila-txt"><div class="fila-titulo">${UI.esc(titulo)}</div><div class="fila-sub">${F.fecha(m.fecha, 'media')}${cat && m.nota ? ' · ' + UI.esc(cat.nombre) : ''}${m.papas ? ` · <span class="chip azul">${m.papas} % papás</span>` : ''}</div></div><div class="fila-der num">${neutral ? UI.m(monto) : UI.m(signo * monto, { color: true, signo: true })}</div></div>`;
  }

  function despues(a) {
    const id = a.params[0];
    if (!id || !a.cuenta(id)) return;
    const c = a.cuenta(id);
    const sim = a.calc.sims[id];
    const ini = sim.segmentos.length ? sim.segmentos[0].dia : a.calc.dHoy - 30;
    const desde = Math.max(ini, a.calc.dHoy - 365);
    const pasos = 40, labels = [], datos = [];
    for (let i = 0; i <= pasos; i++) {
      const d = Math.round(desde + (a.calc.dHoy - desde) * i / pasos);
      labels.push(F.fecha(M.ISO(d), 'sinAnio'));
      datos.push(Math.round(sim.saldoEn(d) * 100) / 100);
    }
    G.linea(document.getElementById('g-cuenta'), labels, [{ label: M.esDeuda(c) ? 'Deuda' : 'Saldo', data: datos, color: c.color, area: true }], { maxX: 7, desdeCero: false });
  }

  window.App.registrar('cuentas', {
    titulo: a => a.params[0] && a.cuenta(a.params[0]) ? a.cuenta(a.params[0]).nombre : 'Cuentas y rendimientos',
    sub: 'Saldos, tasas, GAT y cuánto genera cada cuenta',
    render: a => a.params[0] ? detalle(a, a.params[0]) : lista(a),
    despues,
  });
  window.VistaCuentas = { filaMov };

  document.addEventListener('DOMContentLoaded', () => {
    app().accion('archivar-cuenta', d => {
      const c = app().cuenta(d.id);
      app().mutar(est => { const k = est.cuentas.find(x => x.id === d.id); k.archivada = !k.archivada; }, c.archivada ? 'Cuenta desarchivada' : 'Cuenta archivada (ya no cuenta en tu patrimonio)');
    });
    app().accion('borrar-saldo', async d => {
      const c = app().cuenta(d.cuenta);
      if (c.historialSaldos.length <= 1) { UI.toast('Es el único saldo registrado; edita la cuenta o actualiza el saldo.', { error: true }); return; }
      const ok = await UI.confirmar({ titulo: 'Eliminar registro de saldo', mensaje: `Se eliminará el saldo registrado el ${F.fecha(d.fecha, 'media')}.`, peligro: true, textoOk: 'Eliminar' });
      if (ok) app().mutar(est => { const k = est.cuentas.find(x => x.id === d.cuenta); const i = k.historialSaldos.findIndex(h => (d.id ? h.id === d.id : h.fecha === d.fecha)); if (i >= 0) k.historialSaldos.splice(i, 1); }, 'Registro eliminado');
    });
  });
})();
