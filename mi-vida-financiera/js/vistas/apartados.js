/* =====================================================================
 * Vista: Apartados (el corazón de la plataforma) — lista y detalle.
 * ===================================================================== */
(function () {
  'use strict';
  const { Motor: M, Formato: F, UI, Graficas: G, Consejos: C } = window;
  const app = () => window.App;
  let graficaProy = null;

  /* ---------- Lista ---------- */
  function lista(a) {
    const est = a.estado, calc = a.calc;
    if (!est.apartados.length) return `<div class="card">${UI.vacio({ icono: 'layers', titulo: 'Crea tu primer apartado', texto: 'Los apartados son el "para qué" de tu dinero: Coche, Casa, Fondo de emergencia, Mi negocio, Irme a trabajar fuera… Cada uno puede tener dinero en varias cuentas y la app calcula cuánto genera.', boton: 'Nuevo apartado', accion: 'nuevo-apartado' })}</div>`;
    let total = 0, ganado = 0, diario = 0;
    for (const ap of est.apartados) { const c = calc.apartados[ap.id]; total += c.valor; ganado += c.ganado; diario += c.diario; }
    const cuentasConDinero = est.cuentas.filter(c => !c.archivada && !M.esDeuda(c) && (Math.abs(calc.cuentas[c.id].saldo) > 0.5));
    const sinAsignar = cuentasConDinero.reduce((s, c) => s + Math.max(0, calc.sinAsignar[c.id] || 0), 0);
    return `
    <div class="cabecera-vista">
      <div class="fila-flex"><button class="btn btn-primario" data-accion="depositar">${UI.icono('plus')}Depositar</button><button class="btn" data-accion="depositar" data-tipo="traspaso">${UI.icono('swap')}Mover entre apartados</button></div>
      <button class="btn btn-fantasma" data-accion="nuevo-apartado">${UI.icono('layers')}Nuevo apartado</button>
    </div>
    <div class="grid">
      <div class="card s-3"><div class="kpi-label">En apartados</div><div class="kpi-valor">${UI.mc(total)}</div><div class="kpi-pie">${est.apartados.length} apartados</div></div>
      <div class="card s-3"><div class="kpi-label">Ganado hasta hoy</div><div class="kpi-valor verde-txt">${UI.mc(ganado)}</div><div class="kpi-pie">en rendimientos</div></div>
      <div class="card s-3"><div class="kpi-label"><span class="pulso"></span>Generado hoy</div><div class="kpi-valor"><span class="vivo monto" data-vivo="${diario}" data-dec="4">$0</span></div><div class="kpi-pie">${UI.m(diario)} al día · ${UI.m(diario * 365 / 12, { dec: 0 })} al mes</div></div>
      <div class="card s-3"><div class="kpi-label">Sin asignar</div><div class="kpi-valor">${UI.mc(sinAsignar)}</div><div class="kpi-pie">dinero en cuentas sin "para qué"</div></div>
    </div>
    <div class="tarjetas mt">${est.apartados.map(ap => tarjeta(a, ap)).join('')}</div>
    <section class="card mt">
      <div class="card-head"><h3>${UI.icono('wallet')}¿De quién es el dinero de cada cuenta?</h3><span class="sub">Apartados por cuenta y lo que queda sin asignar</span></div>
      <div class="pila" style="gap:16px">${cuentasConDinero.map(c => {
        const saldo = calc.cuentas[c.id].saldo;
        const partes = est.apartados.map(ap => ({ ap, v: calc.apartados[ap.id].porCuenta[c.id] || 0 })).filter(x => x.v > 0.5);
        const libre = calc.sinAsignar[c.id] || 0;
        const base = Math.max(saldo, partes.reduce((s, x) => s + x.v, 0), 1);
        return `<div>
          <div class="entre"><span class="fila-flex" style="gap:8px">${UI.burbuja(M.TIPOS_CUENTA[c.tipo].icono, c.color, 'sm')}<b style="font-weight:600">${UI.esc(c.nombre)}</b></span><span class="num">${UI.m(saldo)}</span></div>
          <div class="barra-multi mt-s">${partes.map(x => `<i style="width:${x.v / base * 100}%;background:${x.ap.color}" title="${UI.esc(x.ap.nombre)}"></i>`).join('')}${libre > 0.5 ? `<i style="width:${libre / base * 100}%;background:var(--surface-3)" title="Sin asignar"></i>` : ''}</div>
          <div class="leyenda">${partes.map(x => `<span><i style="--c:${x.ap.color}"></i>${UI.esc(x.ap.nombre)} <b class="monto">${F.dinero(x.v, { dec: 0 })}</b></span>`).join('')}<span><i style="--c:var(--text-3)"></i>Sin asignar <b class="monto ${libre < -1 ? 'rojo-txt' : ''}">${F.dinero(libre, { dec: 0 })}</b></span></div>
        </div>`;
      }).join('')}</div>
    </section>`;
  }

  function tarjeta(a, ap) {
    const calc = a.calc;
    const ca = calc.apartados[ap.id];
    const proy = C.proyeccionApartado(a.estado, calc, ap);
    const pct = ap.meta ? ca.valor / ap.meta * 100 : null;
    const cuentas = Object.entries(ca.porCuenta).filter(([, v]) => v > 0.5);
    return `<a class="card tcuenta" href="#/apartados/${ap.id}" style="--c:${ap.color};color:var(--text)">
      <div class="fila-flex" style="gap:12px;flex-wrap:nowrap">${UI.burbuja(ap.icono, ap.color)}<div class="fila-txt"><div class="fila-titulo" style="font-size:15px">${UI.esc(ap.nombre)}${ap.esFondo ? ' <span class="chip verde" style="margin-left:4px">Emergencia</span>' : ''}</div><div class="fila-sub">${ap.fechaMeta ? 'Meta: ' + F.fecha(ap.fechaMeta, 'media') : 'Sin fecha meta'}</div></div></div>
      <div class="saldo">${UI.m(ca.valor)}</div>
      <div class="fila-flex" style="gap:6px"><span class="chip verde">+${UI.m(ca.ganado)} ganado</span><span class="chip">${F.pct(ca.tasa)} neto</span><span class="chip">+${UI.m(ca.diario)}/día</span></div>
      ${pct != null ? `<div class="mt">${UI.barra(pct, { color: ap.color })}<div class="entre fila-sub mt-s"><span>${Math.round(pct)} % de ${UI.m(ap.meta, { dec: 0 })}</span><span>Faltan ${UI.m(Math.max(0, ap.meta - ca.valor), { dec: 0 })}</span></div></div>` : ''}
      ${cuentas.length ? `<div class="reparto">${cuentas.map(([cid, v]) => { const c = a.cuenta(cid); return `<div class="reparto-fila"><span><span class="punto" style="--c:${c ? c.color : '#888'}"></span>${UI.esc(c ? c.nombre : '—')}</span><span class="monto">${F.dinero(v, { dec: 0 })}</span></div>`; }).join('')}</div>` : '<div class="fila-sub mt">Aún sin dinero. Haz tu primer depósito.</div>'}
      <div class="nota mt" style="line-height:1.5">${proy.lineas[0]}</div>
    </a>`;
  }

  /* ---------- Detalle ---------- */
  function detalle(a, id) {
    const ap = a.apartado(id);
    if (!ap) return `<div class="card">${UI.vacio({ icono: 'layers', titulo: 'Ese apartado ya no existe', boton: 'Ver apartados', accion: 'ir', datos: 'data-ruta="apartados"' })}</div>`;
    const calc = a.calc;
    const ca = calc.apartados[ap.id];
    const proy = C.proyeccionApartado(a.estado, calc, ap);
    const maxSlider = Math.max(10000, Math.ceil(proy.pmt * 3 / 1000) * 1000);
    const flujos = a.estado.flujosApartado.filter(f => f.apartadoId === ap.id || f.apartadoDestinoId === ap.id).sort((x, y) => y.fecha.localeCompare(x.fecha) || (y.creado || 0) - (x.creado || 0));
    const lotesPorRef = new Map(ca.lotes.map(l => [l.ref, l]));
    return `
    <a class="volver" href="#/apartados">${UI.icono('chevronLeft', 'ico-sm')}Apartados</a>
    <div class="card card-destacada" style="--accent:${ap.color}">
      <div class="entre" style="flex-wrap:wrap;align-items:flex-start">
        <div class="detalle-hero">${UI.burbuja(ap.icono, ap.color, 'lg')}<div><div class="kpi-label">${UI.esc(ap.nombre)}${ap.esFondo ? ' · fondo de emergencia' : ''}</div><div class="kpi-valor">${UI.mc(ca.valor)}</div>
          <div class="kpi-pie"><span class="chip verde">+${UI.m(ca.ganado)} ganado</span><span class="chip">${F.pct(ca.tasa)} neto ponderado</span>${ap.meta ? `<span class="chip acento">Meta ${UI.m(ap.meta, { dec: 0 })}${ap.fechaMeta ? ' · ' + F.fecha(ap.fechaMeta, 'media') : ''}</span>` : ''}</div></div></div>
        <div class="fila-flex"><button class="btn btn-primario" data-accion="depositar" data-apartado="${ap.id}">${UI.icono('plus')}Depositar</button><button class="btn" data-accion="depositar" data-apartado="${ap.id}" data-tipo="retiro">${UI.icono('minus')}Retirar</button><button class="btn" data-accion="depositar" data-apartado="${ap.id}" data-tipo="traspaso">${UI.icono('swap')}Mover</button><button class="btn-icono" data-accion="editar-apartado" data-id="${ap.id}" aria-label="Editar apartado">${UI.icono('edit')}</button></div>
      </div>
      ${ap.meta ? `<div class="mt">${UI.barra(ca.valor / ap.meta * 100, { color: ap.color, clase: 'gruesa' })}</div>` : ''}
      ${ap.nota ? `<p class="nota mt">${UI.esc(ap.nota)}</p>` : ''}
    </div>

    <div class="grid mt">
      <div class="card s-3 card-sm"><div class="kpi-label">Cuánto puse</div><div class="grande-num">${UI.m(ca.aportado)}</div></div>
      <div class="card s-3 card-sm"><div class="kpi-label">Ganado hasta hoy</div><div class="grande-num verde-txt">${UI.m(ca.ganado)}</div></div>
      <div class="card s-3 card-sm"><div class="kpi-label"><span class="pulso"></span>Generado hoy</div><div class="grande-num"><span class="vivo monto" data-vivo="${ca.diario}" data-dec="4">$0</span></div></div>
      <div class="card s-3 card-sm"><div class="kpi-label">Gano al día / mes / año</div><div class="grande-num" style="font-size:16px;margin-top:4px">${UI.m(ca.diario)} · ${UI.m(ca.mensual, { dec: 0 })} · ${UI.m(ca.anual, { dec: 0 })}</div></div>

      <section class="card s-8">
        <div class="card-head"><h3>${UI.icono('chart')}Aportaciones vs. rendimientos</h3><span class="sub">historia real y proyección (punteada)</span></div>
        <div class="grafica alta"><canvas id="g-apartado" aria-label="Aportaciones y rendimientos acumulados"></canvas></div>
      </section>
      <section class="card s-4">
        <div class="card-head"><h3>${UI.icono('sparkles')}¿Y si ahorro más?</h3></div>
        <label class="campo-label" for="slider-pmt">Ahorro mensual: <b class="num" id="pmt-txt" style="color:var(--text);font-size:16px">${F.dinero(proy.pmt, { dec: 0 })}</b></label>
        <input type="range" id="slider-pmt" min="0" max="${maxSlider}" step="100" value="${proy.pmt}" aria-label="Ahorro mensual">
        <div class="entre fila-sub"><span>$0</span><span>${F.dinero(maxSlider, { dec: 0 })}</span></div>
        <div class="mensajes mt" id="msj-proy">${proy.lineas.map(l => `<div class="mensaje">${UI.icono('sparkles')}<span>${l}</span></div>`).join('')}</div>
      </section>

      <section class="card s-5">
        <div class="card-head"><h3>${UI.icono('wallet')}Dónde está el dinero</h3></div>
        ${Object.keys(ca.porCuenta).length ? `<div class="lista">${Object.entries(ca.porCuenta).filter(([, v]) => Math.abs(v) > 0.5).map(([cid, v]) => { const c = a.cuenta(cid); const cc = calc.cuentas[cid]; return `<a class="fila clic" href="#/cuentas/${cid}" style="color:var(--text)">${UI.burbuja(M.TIPOS_CUENTA[c.tipo].icono, c.color, 'sm')}<div class="fila-txt"><div class="fila-titulo">${UI.esc(c.nombre)}</div><div class="fila-sub">${F.pct(cc.tasaNeta)} neto · ${Math.round(v / ca.valor * 100)} % del apartado</div></div><div class="fila-der num">${UI.m(v)}</div></a>`; }).join('')}</div>`
        : UI.vacio({ icono: 'wallet', titulo: 'Sin dinero todavía', texto: 'Registra tu primer depósito y elige la cuenta y la tasa.', boton: 'Depositar', accion: 'depositar', datos: `data-apartado="${ap.id}"`, compacto: true })}
      </section>

      <section class="card s-7">
        <div class="card-head"><h3>${UI.icono('receipt')}Depósitos y movimientos</h3><span class="sub">cada depósito guarda su tasa</span></div>
        ${flujos.length ? `<div class="tabla-wrap"><table class="tabla"><thead><tr><th>Fecha</th><th>Movimiento</th><th class="der">Monto</th><th class="der">Tasa</th><th class="der">Valor hoy</th><th class="der">Ganado</th><th></th></tr></thead><tbody>
          ${flujos.map(f => {
            const l = lotesPorRef.get(f);
            const entra = f.tipo === 'deposito' || f.apartadoDestinoId === ap.id;
            const desc = f.tipo === 'deposito' ? `Depósito en ${UI.esc(a.nombreCuenta(f.cuentaId))}` : f.tipo === 'retiro' ? `Retiro de ${UI.esc(a.nombreCuenta(f.cuentaId))}` : (entra ? `Desde ${UI.esc((a.apartado(f.apartadoId) || {}).nombre || 'otro apartado')}` : `Hacia ${UI.esc((a.apartado(f.apartadoDestinoId) || {}).nombre || 'otro apartado')}`);
            const lote = ca.lotes.find(x => x.ref === f && (entra ? x.monto > 0 : x.monto < 0)) || l;
            return `<tr><td>${F.fecha(f.fecha, 'media')}</td><td>${desc}</td><td class="der ${entra ? 'verde-txt' : 'rojo-txt'}">${UI.m(entra ? f.monto : -f.monto, { signo: true })}</td><td class="der">${f.tipo === 'deposito' && f.tasa != null ? F.pct(f.tasa) : '—'}</td><td class="der">${lote && entra ? UI.m(lote.valor) : '—'}</td><td class="der verde-txt">${lote && entra ? UI.m(lote.ganado) : '—'}</td><td><button class="btn-icono sm" data-accion="borrar-flujo" data-id="${f.id}" aria-label="Eliminar">${UI.icono('trash')}</button></td></tr>`;
          }).join('')}
        </tbody></table></div>` : UI.vacio({ icono: 'receipt', titulo: 'Sin movimientos', texto: 'Aquí verás cada depósito con la tasa con la que lo hiciste y cuánto lleva ganado.', compacto: true })}
      </section>
    </div>`;
  }

  function pintarGrafica(a, ap, proy) {
    const t = G.tema();
    const labels = proy.serie.map(s => s.hoy ? 'Hoy' : F.fecha(s.fecha, 'mesCorto'));
    const iHoy = proy.serie.findIndex(s => s.hoy);
    const seg = { borderDash: ctx => ctx.p0DataIndex >= iHoy ? [5, 5] : undefined };
    const canvas = document.getElementById('g-apartado');
    graficaProy = G.linea(canvas, labels, [
      { label: 'Aportaciones', data: proy.serie.map(s => Math.round(s.aportado)), color: ap.color, area: true, alfa: 0.35, fill: 'origin', segment: seg, stack: 'a' },
      { label: 'Rendimientos', data: proy.serie.map(s => Math.round(s.rendimiento * 100) / 100), color: t.verde, area: true, alfa: 0.45, fill: '-1', segment: seg, stack: 'a' },
    ], { leyenda: true, apilado: true, maxX: 10 });
  }

  function despues(a, cont) {
    const id = a.params[0];
    if (!id) return;
    const ap = a.apartado(id);
    if (!ap) return;
    const proy = C.proyeccionApartado(a.estado, a.calc, ap);
    pintarGrafica(a, ap, proy);
    const slider = cont.querySelector('#slider-pmt');
    if (!slider) return;
    slider.addEventListener('input', () => {
      const pmt = Number(slider.value);
      const p = C.proyeccionApartado(a.estado, a.calc, ap, pmt);
      cont.querySelector('#pmt-txt').textContent = F.dinero(pmt, { dec: 0 });
      cont.querySelector('#msj-proy').innerHTML = p.lineas.map(l => `<div class="mensaje">${UI.icono('sparkles')}<span>${l}</span></div>`).join('');
      if (graficaProy && p.serie.length === graficaProy.data.labels.length) {
        graficaProy.data.datasets[0].data = p.serie.map(s => Math.round(s.aportado));
        graficaProy.data.datasets[1].data = p.serie.map(s => Math.round(s.rendimiento * 100) / 100);
        graficaProy.update('none');
      } else if (window.Chart) {
        G.limpiar(); pintarGrafica(a, ap, p);
      }
    });
  }

  window.App.registrar('apartados', {
    titulo: a => a.params[0] && a.apartado(a.params[0]) ? a.apartado(a.params[0]).nombre : 'Apartados',
    sub: 'El "para qué" de tu dinero y cuánto te genera',
    render: a => a.params[0] ? detalle(a, a.params[0]) : lista(a),
    despues,
  });

  document.addEventListener('DOMContentLoaded', () => {
    app().accion('borrar-flujo', async d => {
      const a = app();
      const f = a.estado.flujosApartado.find(x => x.id === d.id);
      if (!f) return;
      const ok = await UI.confirmar({ titulo: 'Eliminar movimiento del apartado', peligro: true, mensaje: `Se eliminará este ${f.tipo} de ${F.dinero(f.monto)} del ${F.fecha(f.fecha, 'media')}. Los saldos se recalculan.`, textoOk: 'Eliminar' });
      if (ok) a.mutar(est => { est.flujosApartado = est.flujosApartado.filter(x => x.id !== d.id); }, 'Movimiento eliminado');
    });
  });
})();
