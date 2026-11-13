/* =====================================================================
 * Vista: Comparador de cuentas — "Si tengo $X, ¿dónde me conviene?"
 * ===================================================================== */
(function () {
  'use strict';
  const { Formato: F, Finanzas: Fz, UI, Graficas: G, Consejos: C, Forms } = window;
  const estadoUI = { monto: null, existente: true };
  const PLAZOS = [1, 3, 6, 12];

  function resultados(a) {
    const monto = estadoUI.monto;
    const ops = C.opcionesRendimiento(a.estado, a.calc, estadoUI.existente);
    if (!ops.length) return UI.vacio({ icono: 'percent', titulo: 'No hay opciones para comparar', texto: 'Agrega cuentas con rendimiento u opciones externas (ej. Klar, Stori, Hey Banco).', boton: 'Agregar opción', accion: 'nueva-opcion' });
    const filas = ops.map(op => {
      const g = PLAZOS.map(m => Fz.gananciaOpcion(monto, op, m));
      return { op, tasa: g[0].tasa, neta: g[0].neta, gat: Fz.gatNominal(g[0].neta, op.capitalizacion, op.plazo), g };
    }).sort((x, y) => y.g[3].ganancia - x.g[3].ganancia);
    const mejor = filas[0];
    const dist = Fz.distribucionOptima(monto, ops);
    const extraDist = dist.interesAnual - mejor.g[3].ganancia;
    return `
    <div class="grid">
      <section class="card s-12">
        <div class="card-head"><h3>${UI.icono('percent')}Comparación para ${UI.m(monto, { dec: 0 })}</h3>${Forms.ETQ_VERIFICA}</div>
        <div class="tabla-wrap"><table class="tabla"><thead><tr><th>Opción</th><th class="der">Tasa marginal</th><th class="der">Neta</th><th class="der">GAT neta</th>${PLAZOS.map(m => `<th class="der">${m} ${m === 1 ? 'mes' : 'meses'}</th>`).join('')}</tr></thead><tbody>
          ${filas.map((f, i) => `<tr class="${i === 0 ? 'destacada' : ''}"><td><span class="fila-flex" style="gap:8px;flex-wrap:nowrap"><span class="punto" style="--c:${f.op.color || 'var(--text-3)'}"></span><b style="font-weight:600">${UI.esc(f.op.nombre)}</b>${f.op.propia ? '<span class="chip">mía</span>' : `<button class="btn-icono sm" data-accion="editar-opcion" data-id="${f.op.id}" aria-label="Editar opción">${UI.icono('edit')}</button>`}${i === 0 ? '<span class="chip verde">mejor</span>' : ''}</span>${f.op.saldoExistente ? `<div class="fila-sub">ya tienes ${F.dinero(f.op.saldoExistente, { dec: 0 })}</div>` : ''}</td>
            <td class="der">${F.pct(f.tasa)}</td><td class="der">${F.pct(f.neta)}</td><td class="der">${F.pct(f.gat)}</td>${f.g.map(x => `<td class="der verde-txt">${UI.m(x.ganancia)}</td>`).join('')}</tr>`).join('')}
        </tbody></table></div>
        <p class="nota mt">Ganancias netas (después de la retención de ISR cuando aplica). La "tasa marginal" considera los topes y lo que ya tienes en cada cuenta: es lo que ganaría el siguiente peso que deposites.</p>
      </section>
      <section class="card s-7">
        <div class="card-head"><h3>${UI.icono('chart')}Ganancia a 12 meses</h3></div>
        <div class="grafica"><canvas id="g-comp" aria-label="Ganancia a 12 meses por opción"></canvas></div>
      </section>
      <section class="card s-5">
        <div class="card-head"><h3>${UI.icono('sparkles')}Distribución óptima</h3></div>
        <p class="suave" style="margin-bottom:12px">Llenando primero el tramo de mayor tasa y respetando los topes:</p>
        <div class="lista">${dist.asignaciones.sort((x, y) => y.monto - x.monto).map(x => { const op = ops.find(o => o.id === x.id); return `<div class="fila"><span class="punto" style="--c:${op && op.color || 'var(--text-3)'}"></span><div class="fila-txt"><div class="fila-titulo">${UI.esc(x.nombre)}</div><div class="fila-sub">${F.pct(x.tasaPromedio)} efectiva · ${UI.m(x.interes, { dec: 0 })}/año</div></div><div class="fila-der num"><b>${UI.m(x.monto, { dec: 0 })}</b></div></div>`; }).join('')}</div>
        ${dist.noAsignado > 1 ? `<div class="nota-caja aviso mt">${UI.icono('alert')}<span>${UI.m(dist.noAsignado, { dec: 0 })} no caben en ningún tramo con rendimiento.</span></div>` : ''}
        <div class="mensaje mt">${UI.icono('sparkles')}<span>Así ganarías ~<strong>${F.dinero(dist.interesAnual, { dec: 0 })}</strong> al año${extraDist > 1 ? `, <strong>${F.dinero(extraDist, { dec: 0 })}</strong> más que poniéndolo todo en ${UI.esc(mejor.op.nombre)}` : ''}.</span></div>
      </section>
    </div>`;
  }

  function render(a) {
    if (estadoUI.monto == null) {
      const libre = Object.values(a.calc.sinAsignar).reduce((s, v) => s + Math.max(0, v), 0);
      estadoUI.monto = Math.max(10000, Math.round(Math.min(libre, 100000) / 1000) * 1000);
    }
    return `
    <div class="card">
      <div class="fila-flex" style="gap:16px;align-items:flex-end">
        <div class="campo" style="flex:1 1 220px;max-width:320px"><label for="comp-monto">Si tengo…</label><div class="input-pre"><span>$</span><input type="text" inputmode="decimal" id="comp-monto" value="${F.numero(estadoUI.monto)}"></div></div>
        <label class="check" style="flex:1 1 260px"><input type="checkbox" class="interruptor" id="comp-exist" ${estadoUI.existente ? 'checked' : ''}><span>Considerar lo que ya tengo en cada cuenta (topes)</span></label>
        <div class="fila-flex"><button class="btn" data-accion="nueva-opcion">${UI.icono('plus')}Agregar opción para comparar</button></div>
      </div>
      <div class="fila-flex mt-s">${[5000, 10000, 25000, 50000, 100000].map(v => `<button class="btn btn-sm btn-fantasma" data-monto-rapido="${v}">${F.dinero(v, { dec: 0 })}</button>`).join('')}</div>
    </div>
    <div id="comp-res" class="mt">${resultados(a)}</div>
    ${a.estado.opcionesComparador.length ? `<section class="card mt"><div class="card-head"><h3>${UI.icono('layers')}Opciones que aún no tienes</h3></div><div class="lista">${a.estado.opcionesComparador.map(o => `<div class="fila clic" data-accion="editar-opcion" data-id="${o.id}">${UI.burbuja('percent', 'var(--text-3)', 'sm')}<div class="fila-txt"><div class="fila-titulo">${UI.esc(o.nombre)}</div><div class="fila-sub">${Forms.describirTramos(o.tramos)}${o.promo ? ` · promo ${F.pct(o.promo.tasa)} por ${o.promo.dias} días` : ''}</div></div>${UI.icono('chevronRight')}</div>`).join('')}</div></section>` : ''}`;
  }

  function grafica(a) {
    const ops = C.opcionesRendimiento(a.estado, a.calc, estadoUI.existente);
    const filas = ops.map(op => ({ op, g: Fz.gananciaOpcion(estadoUI.monto, op, 12).ganancia })).sort((x, y) => y.g - x.g);
    const t = G.tema();
    G.barras(document.getElementById('g-comp'), filas.map(f => f.op.nombre), [{ label: 'Ganancia neta 12 meses', data: filas.map(f => Math.round(f.g * 100) / 100), colores: filas.map((f, i) => i === 0 ? t.verde : (f.op.color || t.series[0])) }], { horizontal: true, grosor: 22 });
  }

  function despues(a, cont) {
    grafica(a);
    const inp = cont.querySelector('#comp-monto');
    const recalcular = () => {
      G.limpiar();
      cont.querySelector('#comp-res').innerHTML = resultados(a);
      UI.pintarIconos(cont);
      grafica(a);
    };
    let t;
    inp.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { estadoUI.monto = UI.numero(inp.value) || 0; recalcular(); }, 200); });
    cont.querySelector('#comp-exist').addEventListener('change', e => { estadoUI.existente = e.target.checked; recalcular(); });
    cont.querySelectorAll('[data-monto-rapido]').forEach(b => b.addEventListener('click', () => { estadoUI.monto = Number(b.dataset.montoRapido); inp.value = F.numero(estadoUI.monto); recalcular(); }));
  }

  window.App.registrar('comparador', { titulo: 'Comparador de cuentas', sub: '¿Dónde me conviene poner mi dinero?', render, despues });
})();
