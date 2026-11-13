/* =====================================================================
 * Vista: Presupuesto mensual por categoría, plantillas y
 * acuerdo con mis papás.
 * ===================================================================== */
(function () {
  'use strict';
  const { Motor: M, Formato: F, UI, Graficas: G } = window;
  let mesSel = null;
  const GRUPOS = [['necesidad', 'Necesidades', 50], ['deseo', 'Deseos', 30], ['ahorro', 'Ahorro e inversión', 20]];

  function ingresoBase(a) {
    const p = a.estado.presupuesto;
    if (Number(p.ingreso) > 0) return Number(p.ingreso);
    const f = M.ingresoMensualFuentes(a.estado).mensual;
    if (f > 0) return f;
    const ant = M.flujoMes(a.estado, M.mesDe(M.sumarMeses(M.inicioMes(a.hoy), -1)));
    return ant.ingresos;
  }

  /** Promedio de gasto (mi parte) por categoría en los últimos 3 meses. */
  function promedioPorCategoria(a) {
    const prom = {};
    for (let i = 1; i <= 3; i++) {
      const fl = M.flujoMes(a.estado, M.mesDe(M.sumarMeses(M.inicioMes(a.hoy), -i)));
      for (const [k, v] of Object.entries(fl.porCategoria)) prom[k] = (prom[k] || 0) + v / 3;
    }
    return prom;
  }

  /** Aplica la plantilla 50/30/20 repartiendo cada grupo según tu historial. */
  function aplicar503020(a) {
    const ing = ingresoBase(a);
    const prom = promedioPorCategoria(a);
    const montos = {};
    for (const [g, , pct] of GRUPOS) {
      if (g === 'ahorro') continue;
      const cats = a.estado.categorias.filter(c => c.tipo === 'gasto' && c.grupo === g);
      const total = cats.reduce((s, c) => s + (prom[c.id] || 0), 0);
      const bolsa = ing * pct / 100;
      for (const c of cats) {
        const peso = total > 0 ? (prom[c.id] || 0) / total : 1 / cats.length;
        if (peso > 0) montos[c.id] = Math.round(bolsa * peso / 50) * 50;
      }
    }
    return montos;
  }

  function filaCat(a, f, ant) {
    return `<div class="fila" style="align-items:center;flex-wrap:wrap">
      ${UI.burbuja(f.cat.icono, f.cat.color, 'sm')}
      <div class="fila-txt" style="min-width:130px">
        <div class="fila-titulo">${UI.esc(f.cat.nombre)}</div>
        <div class="fila-sub">${UI.m(f.gastado, { dec: 0 })} gastado${f.papas ? ` · <span style="color:var(--blue)">${F.dinero(f.papas, { dec: 0 })} papás</span>` : ''} · mes ant. ${F.dinero(ant || 0, { dec: 0 })}</div>
        <div class="mt-s">${UI.barra(f.presupuesto > 0 ? f.pct : (f.gastado > 0 ? 100 : 0), { semaforo: true })}</div>
      </div>
      <div style="width:130px" class="input-pre"><span>$</span><input type="text" inputmode="decimal" data-presupuesto="${f.cat.id}" value="${f.presupuesto ? F.numero(f.presupuesto) : ''}" placeholder="0" aria-label="Presupuesto ${UI.esc(f.cat.nombre)}"></div>
      <div class="fila-der num" style="width:110px">${f.presupuesto > 0 ? (f.restante >= 0 ? `<span class="verde-txt">${UI.m(f.restante, { dec: 0 })}</span><div class="fila-sub">disponible</div>` : `<span class="rojo-txt">${UI.m(f.restante, { dec: 0 })}</span><div class="fila-sub">te pasaste</div>`) : '<span class="tenue">—</span>'}</div>
    </div>`;
  }

  function render(a) {
    const est = a.estado;
    if (!mesSel) mesSel = M.mesDe(a.hoy);
    const p = est.presupuesto;
    const ym = mesSel;
    const ymAnt = M.mesDe(M.sumarMeses(ym + '-01', -1));
    const pres = M.estadoPresupuesto(est, ym);
    const presAnt = M.estadoPresupuesto(est, ymAnt);
    const antPorCat = presAnt.flujo.porCategoria;
    const ing = ingresoBase(a);
    const montos = p.montos || {};
    const asignado = Object.values(montos).reduce((s, v) => s + (Number(v) || 0), 0) + (Number(p.ahorro) || 0);
    // Filas para todas las categorías de gasto (aunque no tengan gasto)
    const filasTodas = est.categorias.filter(c => c.tipo === 'gasto').map(cat => pres.filas.find(x => x.cat.id === cat.id) || { cat, presupuesto: Number(montos[cat.id]) || 0, gastado: 0, papas: 0, restante: Number(montos[cat.id]) || 0, pct: 0 });
    const apoyoMes = pres.flujo.papas;
    let apoyoProm = 0;
    for (let i = 1; i <= 3; i++) apoyoProm += M.flujoMes(est, M.mesDe(M.sumarMeses(ym + '-01', -i))).papas / 3;

    return `
    <div class="cabecera-vista">
      <div class="fila-flex"><button class="btn-icono" data-mes="-1" aria-label="Mes anterior">${UI.icono('chevronLeft')}</button><b style="font-size:16px;min-width:150px;text-align:center;text-transform:capitalize">${F.fecha(ym + '-01', 'mes')}</b><button class="btn-icono" data-mes="1" aria-label="Mes siguiente">${UI.icono('chevronRight')}</button></div>
      <div class="segmento" role="tablist">${[['503020', '50/30/20'], ['basecero', 'Base cero'], ['personalizado', 'Personalizado']].map(([v, l]) => `<button class="${p.plantilla === v ? 'activo' : ''}" data-plantilla="${v}">${l}</button>`).join('')}</div>
    </div>
    <div class="grid">
      <div class="card s-3"><div class="kpi-label">Presupuestado</div><div class="kpi-valor">${UI.mc(pres.totalPres)}</div><div class="kpi-pie">de un ingreso de ${UI.m(ing, { dec: 0 })}</div></div>
      <div class="card s-3"><div class="kpi-label">Gastado (tu parte)</div><div class="kpi-valor rojo-txt">${UI.mc(pres.totalGast)}</div><div class="kpi-pie">${pres.totalPres ? Math.round(pres.totalGast / pres.totalPres * 100) + ' % del presupuesto' : ''}</div></div>
      <div class="card s-3"><div class="kpi-label">Disponible</div><div class="kpi-valor ${pres.totalPres - pres.totalGast < 0 ? 'rojo-txt' : 'verde-txt'}">${UI.mc(pres.totalPres - pres.totalGast)}</div></div>
      <div class="card s-3"><div class="kpi-label">${UI.icono('users', 'ico-sm')}Apoyo de tus papás</div><div class="kpi-valor" style="color:var(--blue)">${UI.mc(apoyoMes)}</div><div class="kpi-pie">promedio ${UI.m(apoyoProm, { dec: 0 })}/mes</div></div>
    </div>

    ${p.plantilla === '503020' ? `<div class="card mt"><div class="entre" style="flex-wrap:wrap">
        <div><h3 style="font-size:15px">Plantilla 50/30/20</h3><p class="suave mt-s">50 % necesidades (${UI.m(ing * 0.5, { dec: 0 })}), 30 % deseos (${UI.m(ing * 0.3, { dec: 0 })}) y 20 % ahorro (${UI.m(ing * 0.2, { dec: 0 })}). Se reparte entre tus categorías según lo que gastaste los últimos 3 meses.</p></div>
        <button class="btn btn-primario" data-aplicar503020>${UI.icono('sparkles')}Aplicar a mis categorías</button></div>
        <div class="barra-multi mt">${GRUPOS.map(([g, , pct]) => { const real = g === 'ahorro' ? Math.max(0, ing - pres.flujo.gastos) : pres.filas.filter(x => x.cat.grupo === g).reduce((s, x) => s + x.gastado, 0); return `<i style="width:${pct}%;background:${g === 'necesidad' ? 'var(--s1)' : g === 'deseo' ? 'var(--s2)' : 'var(--s3)'};opacity:${Math.min(1, 0.35 + real / (ing * pct / 100 || 1) * 0.65)}" title="${g}"></i>`; }).join('')}</div>
        <div class="leyenda">${GRUPOS.map(([g, n, pct]) => { const real = g === 'ahorro' ? ing - pres.flujo.gastos : pres.filas.filter(x => x.cat.grupo === g).reduce((s, x) => s + x.gastado, 0); return `<span><i style="--c:${g === 'necesidad' ? 'var(--s1)' : g === 'deseo' ? 'var(--s2)' : 'var(--s3)'}"></i>${n}: <b class="monto">${F.dinero(real, { dec: 0 })}</b> de ${F.dinero(ing * pct / 100, { dec: 0 })}</span>`; }).join('')}</div>
      </div>` : ''}
    ${p.plantilla === 'basecero' ? `<div class="card mt"><div class="entre" style="flex-wrap:wrap;gap:16px">
        <div><h3 style="font-size:15px">Presupuesto base cero</h3><p class="suave mt-s">Cada peso de tu ingreso tiene un trabajo. Asigna hasta que "por asignar" llegue a $0.</p></div>
        <div class="fila-flex" style="gap:16px"><div class="campo" style="width:170px"><label for="p-ahorro">Ahorro / apartados</label><div class="input-pre"><span>$</span><input type="text" inputmode="decimal" id="p-ahorro" value="${p.ahorro ? F.numero(p.ahorro) : ''}" placeholder="0"></div></div>
        <div><div class="kpi-label">Por asignar</div><div class="kpi-valor ${Math.abs(ing - asignado) < 1 ? 'verde-txt' : ing - asignado < 0 ? 'rojo-txt' : ''}">${UI.m(ing - asignado, { dec: 0 })}</div></div></div>
      </div></div>` : ''}

    <div class="grid mt">
      <section class="card s-8">
        <div class="card-head"><h3>${UI.icono('pie')}Por categoría</h3><div class="fila-flex"><div class="campo" style="width:170px"><div class="input-pre"><span>$</span><input type="text" inputmode="decimal" id="p-ingreso" value="${p.ingreso ? F.numero(p.ingreso) : ''}" placeholder="${F.numero(ing)}" aria-label="Ingreso mensual base" title="Ingreso mensual base (vacío = automático)"></div></div></div></div>
        ${GRUPOS.map(([g, n]) => { const filas = filasTodas.filter(x => x.cat.grupo === g); return filas.length ? `<div class="campo-label mt" style="text-transform:uppercase;letter-spacing:.05em;font-size:11px">${n}</div><div class="lista">${filas.map(x => filaCat(a, x, antPorCat[x.cat.id])).join('')}</div>` : ''; }).join('')}
        <p class="nota mt">Los gastos que pagan tus papás se registran pero no cuentan contra tu presupuesto.</p>
      </section>
      <div class="s-4 pila">
        <section class="card">
          <div class="card-head"><h3>${UI.icono('users')}Acuerdo con mis papás</h3></div>
          <p class="suave" style="margin-bottom:10px">Marca qué categorías cubren ellos (total o en porcentaje). Al registrar un gasto de esa categoría se sugiere automáticamente.</p>
          <div class="lista">${est.categorias.filter(c => c.tipo === 'gasto').map(c => { const v = est.papas[c.id] || 0; return `<div class="fila" style="padding:7px 0">${UI.burbuja(c.icono, c.color, 'sm')}<div class="fila-txt"><div class="fila-titulo" style="font-size:13px">${UI.esc(c.nombre)}</div></div>
            <select data-papas="${c.id}" style="width:136px;min-height:34px;padding:5px 8px" aria-label="Cobertura de ${UI.esc(c.nombre)}">${[[0, 'Yo'], [25, 'Papás 25 %'], [50, 'Papás 50 %'], [75, 'Papás 75 %'], [100, 'Papás 100 %']].map(([x, l]) => `<option value="${x}" ${Number(v) === x ? 'selected' : ''}>${l}</option>`).join('')}${[0, 25, 50, 75, 100].includes(Number(v)) ? '' : `<option value="${v}" selected>Papás ${v} %</option>`}</select></div>`; }).join('')}</div>
        </section>
        <section class="card">
          <div class="card-head"><h3>${UI.icono('heart')}Cuánto me apoyan</h3></div>
          <div class="kpi-valor" style="color:var(--blue)">${UI.m(apoyoMes, { dec: 0 })} <span class="tenue" style="font-size:14px;font-weight:500">este mes</span></div>
          <div class="lista mt">${Object.entries(pres.flujo.papasPorCategoria).sort((x, y) => y[1] - x[1]).map(([cid, v]) => { const c = a.categoria(cid) || {}; return `<div class="fila" style="padding:6px 0"><span class="punto" style="--c:${c.color}"></span><div class="fila-txt">${UI.esc(c.nombre || 'Otros')}</div><div class="fila-der num">${UI.m(v, { dec: 0 })}</div></div>`; }).join('') || '<p class="nota">Este mes no hay gastos marcados como pagados por tus papás.</p>'}</div>
          <p class="nota mt">Promedio de los últimos 3 meses: ${UI.m(apoyoProm, { dec: 0 })} al mes. Si algún día te independizas, ese es el gasto extra que tendrás que cubrir.</p>
        </section>
      </div>
      <section class="card s-12">
        <div class="card-head"><h3>${UI.icono('chart')}Mes anterior vs. actual</h3></div>
        <div class="grafica"><canvas id="g-pres" aria-label="Gasto por categoría, mes anterior y actual"></canvas></div>
      </section>
    </div>`;
  }

  function despues(a, cont) {
    const est = a.estado;
    const ym = mesSel, ymAnt = M.mesDe(M.sumarMeses(ym + '-01', -1));
    const act = M.flujoMes(est, ym).porCategoria, ant = M.flujoMes(est, ymAnt).porCategoria;
    const cats = est.categorias.filter(c => c.tipo === 'gasto' && ((act[c.id] || 0) + (ant[c.id] || 0) > 0));
    const t = G.tema();
    G.barras(cont.querySelector('#g-pres'), cats.map(c => c.nombre), [
      { label: F.fecha(ymAnt + '-01', 'mes'), data: cats.map(c => Math.round(ant[c.id] || 0)), color: t.series[6] },
      { label: F.fecha(ym + '-01', 'mes'), data: cats.map(c => Math.round(act[c.id] || 0)), color: t.series[0] },
    ], { leyenda: true, maxX: 16 });

    cont.querySelectorAll('[data-mes]').forEach(b => b.addEventListener('click', () => { mesSel = M.mesDe(M.sumarMeses(mesSel + '-01', Number(b.dataset.mes))); a.render(false); }));
    cont.querySelectorAll('[data-plantilla]').forEach(b => b.addEventListener('click', () => a.mutar(e => { e.presupuesto.plantilla = b.dataset.plantilla; })));
    const ap = cont.querySelector('[data-aplicar503020]');
    if (ap) ap.addEventListener('click', async () => {
      const ok = await UI.confirmar({ titulo: 'Aplicar 50/30/20', mensaje: 'Se reemplazarán los montos de tus categorías por la propuesta 50/30/20. Después los puedes ajustar.', textoOk: 'Aplicar' });
      if (ok) a.mutar(e => { e.presupuesto.montos = aplicar503020(a); }, 'Plantilla 50/30/20 aplicada');
    });
    cont.querySelectorAll('[data-presupuesto]').forEach(inp => inp.addEventListener('change', () => {
      const v = UI.numero(inp.value);
      a.mutar(e => { if (v > 0) e.presupuesto.montos[inp.dataset.presupuesto] = v; else delete e.presupuesto.montos[inp.dataset.presupuesto]; if (e.presupuesto.plantilla === '503020') e.presupuesto.plantilla = 'personalizado'; });
    }));
    cont.querySelectorAll('[data-papas]').forEach(sel => sel.addEventListener('change', () => a.mutar(e => { const v = Number(sel.value); if (v > 0) e.papas[sel.dataset.papas] = v; else delete e.papas[sel.dataset.papas]; }, 'Acuerdo actualizado', { deshacer: false })));
    const ing = cont.querySelector('#p-ingreso');
    if (ing) ing.addEventListener('change', () => a.mutar(e => { e.presupuesto.ingreso = UI.numero(ing.value) || null; }));
    const aho = cont.querySelector('#p-ahorro');
    if (aho) aho.addEventListener('change', () => a.mutar(e => { e.presupuesto.ahorro = UI.numero(aho.value) || 0; }));
  }

  window.App.registrar('presupuesto', { titulo: 'Presupuesto', sub: 'Cuánto te queda por categoría y el acuerdo con tus papás', render, despues });
})();
