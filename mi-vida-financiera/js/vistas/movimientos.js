/* =====================================================================
 * Vista: Movimientos (ingresos, gastos, transferencias) y recurrentes.
 * ===================================================================== */
(function () {
  'use strict';
  const { Motor: M, Formato: F, UI } = window;
  const f = { pestana: 'movimientos', mes: null, tipo: '', categoria: '', cuenta: '', texto: '', papas: false, orden: 'fecha', dir: -1, limite: 150 };

  function filtrar(a) {
    const txt = window.Parser.normalizar(f.texto);
    let lista = a.estado.movimientos.filter(m =>
      (!f.mes || M.mesDe(m.fecha) === f.mes) && (!f.tipo || m.tipo === f.tipo) && (!f.categoria || m.categoriaId === f.categoria) &&
      (!f.cuenta || m.cuentaId === f.cuenta || m.cuentaDestinoId === f.cuenta) && (!f.papas || (m.papas || 0) > 0) &&
      (!txt || window.Parser.normalizar(`${m.nota} ${(a.categoria(m.categoriaId) || {}).nombre || ''} ${a.nombreCuenta(m.cuentaId)} ${m.monto}`).includes(txt)));
    const clave = { fecha: m => m.fecha + String(m.creado || 0).padStart(16, '0'), monto: m => Number(m.monto), categoria: m => (a.categoria(m.categoriaId) || {}).nombre || '', cuenta: m => a.nombreCuenta(m.cuentaId), nota: m => m.nota || '' }[f.orden];
    lista.sort((x, y) => { const p = clave(x), q = clave(y); return (p > q ? 1 : p < q ? -1 : 0) * f.dir; });
    return lista;
  }

  function montoFirmado(m) { return m.tipo === 'ingreso' ? m.monto : m.tipo === 'gasto' ? -M.parteMia(m) : m.monto; }

  function tablaMovs(a, lista) {
    const th = (k, t, der) => `<th class="ordenable ${der ? 'der' : ''}" data-orden="${k}">${t}${f.orden === k ? (f.dir > 0 ? ' ↑' : ' ↓') : ''}</th>`;
    const vis = lista.slice(0, f.limite);
    return `<div class="solo-escritorio tabla-wrap"><table class="tabla"><thead><tr>${th('fecha', 'Fecha')}${th('nota', 'Descripción')}${th('categoria', 'Categoría')}${th('cuenta', 'Cuenta')}${th('monto', 'Monto', true)}</tr></thead><tbody>
      ${vis.map(m => {
        const cat = a.categoria(m.categoriaId);
        const v = montoFirmado(m);
        return `<tr data-accion="editar-movimiento" data-id="${m.id}" style="cursor:pointer">
          <td>${F.fecha(m.fecha, 'media')}</td>
          <td><span class="fila-flex" style="gap:8px;flex-wrap:nowrap">${UI.burbuja(m.tipo === 'transferencia' ? 'swap' : (cat ? cat.icono : 'dots'), m.tipo === 'transferencia' ? 'var(--blue)' : (cat ? cat.color : '#888'), 'sm')}<span>${UI.esc(m.nota || (m.tipo === 'transferencia' ? 'Transferencia' : (cat ? cat.nombre : '')))}${m.recurrenteId ? ` <span class="tenue" title="Recurrente">${UI.icono('repeat', 'ico-sm')}</span>` : ''}</span>${m.papas ? `<span class="chip azul">${m.papas} % papás</span>` : ''}</span></td>
          <td class="suave">${m.tipo === 'transferencia' ? '—' : UI.esc(cat ? cat.nombre : '')}</td>
          <td class="suave">${UI.esc(a.nombreCuenta(m.cuentaId))}${m.tipo === 'transferencia' ? ' → ' + UI.esc(a.nombreCuenta(m.cuentaDestinoId)) : ''}</td>
          <td class="der num">${m.tipo === 'transferencia' ? UI.m(m.monto) : UI.m(v, { color: true, signo: true })}${m.papas ? `<div class="fila-sub">de ${F.dinero(m.monto)}</div>` : ''}</td></tr>`;
      }).join('')}
    </tbody></table></div>
    <div class="solo-movil lista">${vis.map(m => window.VistaCuentas.filaMov(a, m, null)).join('')}</div>
    ${lista.length > f.limite ? `<div class="fila-flex mt" style="justify-content:center"><button class="btn" data-mas>Ver más (${lista.length - f.limite} restantes)</button></div>` : ''}`;
  }

  function recurrentes(a) {
    const rs = a.estado.recurrentes;
    if (!rs.length) return `<div class="card">${UI.vacio({ icono: 'repeat', titulo: 'Sin movimientos recurrentes', texto: 'Sueldo quincenal, renta, suscripciones… se registran solos cada vez que llega su fecha.', boton: 'Nuevo recurrente', accion: 'nuevo-recurrente' })}</div>`;
    const mens = { mensual: 1, quincenal: 2, semanal: 52 / 12, anual: 1 / 12 };
    const totIng = rs.filter(r => r.activo !== false && r.tipo === 'ingreso').reduce((s, r) => s + r.monto * (mens[r.frecuencia] || 1), 0);
    const totGas = rs.filter(r => r.activo !== false && r.tipo === 'gasto').reduce((s, r) => s + r.monto * (1 - (r.papas || 0) / 100) * (mens[r.frecuencia] || 1), 0);
    return `<div class="grid">
      <div class="card s-4"><div class="kpi-label">Ingresos fijos al mes</div><div class="kpi-valor verde-txt">${UI.mc(totIng)}</div></div>
      <div class="card s-4"><div class="kpi-label">Gastos fijos al mes (tu parte)</div><div class="kpi-valor rojo-txt">${UI.mc(totGas)}</div></div>
      <div class="card s-4"><div class="kpi-label">Libre después de fijos</div><div class="kpi-valor">${UI.mc(totIng - totGas)}</div></div>
    </div>
    <div class="card mt"><div class="card-head"><h3>${UI.icono('repeat')}Recurrentes</h3><button class="btn btn-sm" data-accion="nuevo-recurrente">${UI.icono('plus')}Nuevo</button></div>
    <div class="lista">${rs.map(r => {
      const cat = a.categoria(r.categoriaId);
      return `<div class="fila clic" data-accion="editar-recurrente" data-id="${r.id}" style="${r.activo === false ? 'opacity:.5' : ''}">${UI.burbuja(r.tipo === 'transferencia' ? 'swap' : (cat ? cat.icono : 'repeat'), r.tipo === 'ingreso' ? 'var(--green)' : (cat ? cat.color : 'var(--blue)'), 'sm')}
        <div class="fila-txt"><div class="fila-titulo">${UI.esc(r.nombre)}</div><div class="fila-sub">${{ mensual: 'Mensual', quincenal: 'Quincenal', semanal: 'Semanal', anual: 'Anual' }[r.frecuencia]} · próximo ${F.fecha(r.proxima, 'media')} · ${UI.esc(a.nombreCuenta(r.cuentaId))}${r.papas ? ` · ${r.papas} % papás` : ''}${r.activo === false ? ' · pausado' : ''}</div></div>
        <div class="fila-der num">${UI.m(r.tipo === 'ingreso' ? r.monto : -r.monto, { color: r.tipo !== 'transferencia', signo: r.tipo !== 'transferencia' })}</div></div>`;
    }).join('')}</div></div>`;
  }

  function render(a) {
    if (f.mes === null) f.mes = M.mesDe(a.hoy);
    const est = a.estado;
    const cab = `<div class="cabecera-vista">
      <div class="segmento" role="tablist"><button class="${f.pestana === 'movimientos' ? 'activo' : ''}" data-pestana="movimientos">Movimientos</button><button class="${f.pestana === 'recurrentes' ? 'activo' : ''}" data-pestana="recurrentes">Recurrentes (${est.recurrentes.length})</button></div>
      <div class="fila-flex"><button class="btn btn-primario" data-accion="nuevo-movimiento" data-tipo="gasto">${UI.icono('minus')}Gasto</button><button class="btn" data-accion="nuevo-movimiento" data-tipo="ingreso">${UI.icono('plus')}Ingreso</button><button class="btn" data-accion="nuevo-movimiento" data-tipo="transferencia">${UI.icono('swap')}Transferencia</button><button class="btn btn-fantasma" data-accion="exportar-csv">${UI.icono('download')}CSV</button></div>
    </div>`;
    if (f.pestana === 'recurrentes') return cab + recurrentes(a);
    if (!est.movimientos.length) return cab + `<div class="card">${UI.vacio({ icono: 'swap', titulo: 'Registra tu primer movimiento', texto: 'Usa el botón + o escribe en la barra de arriba: "gasté 350 en comida con nu".', boton: 'Nuevo gasto', accion: 'nuevo-movimiento', datos: 'data-tipo="gasto"' })}</div>`;
    const meses = [...new Set(est.movimientos.map(m => M.mesDe(m.fecha)))].sort().reverse();
    const lista = filtrar(a);
    let ing = 0, gas = 0, pap = 0;
    for (const m of lista) { if (m.tipo === 'ingreso') ing += m.monto; if (m.tipo === 'gasto') { gas += M.parteMia(m); pap += M.partePapas(m); } }
    return cab + `
    <div class="filtros">
      <select id="f-mes" aria-label="Mes"><option value="">Todos los meses</option>${meses.map(x => `<option value="${x}" ${x === f.mes ? 'selected' : ''}>${F.fecha(x + '-01', 'mes')}</option>`).join('')}</select>
      <select id="f-tipo" aria-label="Tipo"><option value="">Todos los tipos</option>${[['gasto', 'Gastos'], ['ingreso', 'Ingresos'], ['transferencia', 'Transferencias']].map(([v, l]) => `<option value="${v}" ${f.tipo === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
      <select id="f-cat" aria-label="Categoría"><option value="">Todas las categorías</option>${est.categorias.map(c => `<option value="${c.id}" ${f.categoria === c.id ? 'selected' : ''}>${UI.esc(c.nombre)}</option>`).join('')}</select>
      <select id="f-cta" aria-label="Cuenta"><option value="">Todas las cuentas</option>${est.cuentas.map(c => `<option value="${c.id}" ${f.cuenta === c.id ? 'selected' : ''}>${UI.esc(c.nombre)}</option>`).join('')}</select>
      <input type="search" id="f-txt" placeholder="Buscar…" value="${UI.esc(f.texto)}" aria-label="Buscar">
      <label class="check"><input type="checkbox" class="interruptor" id="f-papas" ${f.papas ? 'checked' : ''}><span>Solo papás</span></label>
    </div>
    <div class="kpis mb">
      <div class="mini-kpi"><div class="kpi-label">Ingresos</div><div class="kpi-valor verde-txt">${UI.m(ing, { dec: 0 })}</div></div>
      <div class="mini-kpi"><div class="kpi-label">Gastos (tu parte)</div><div class="kpi-valor rojo-txt">${UI.m(gas, { dec: 0 })}</div></div>
      <div class="mini-kpi"><div class="kpi-label">Pagaron tus papás</div><div class="kpi-valor" style="color:var(--blue)">${UI.m(pap, { dec: 0 })}</div></div>
    </div>
    <div class="card">${lista.length ? tablaMovs(a, lista) : UI.vacio({ icono: 'search', titulo: 'Nada con esos filtros', texto: 'Prueba cambiando el mes o quitando filtros.', compacto: true })}</div>`;
  }

  function despues(a, cont) {
    const re = () => a.render(false);
    cont.querySelectorAll('[data-pestana]').forEach(b => b.addEventListener('click', () => { f.pestana = b.dataset.pestana; re(); }));
    const on = (sel, k, ev) => { const el = cont.querySelector(sel); if (el) el.addEventListener(ev || 'change', () => { f[k] = el.type === 'checkbox' ? el.checked : el.value; f.limite = 150; re(); }); };
    on('#f-mes', 'mes'); on('#f-tipo', 'tipo'); on('#f-cat', 'categoria'); on('#f-cta', 'cuenta'); on('#f-papas', 'papas');
    const txt = cont.querySelector('#f-txt');
    if (txt) {
      let t; txt.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { f.texto = txt.value; re(); const n = document.getElementById('f-txt'); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }, 250); });
    }
    cont.querySelectorAll('[data-orden]').forEach(th => th.addEventListener('click', () => { if (f.orden === th.dataset.orden) f.dir *= -1; else { f.orden = th.dataset.orden; f.dir = th.dataset.orden === 'fecha' || th.dataset.orden === 'monto' ? -1 : 1; } re(); }));
    const mas = cont.querySelector('[data-mas]'); if (mas) mas.addEventListener('click', () => { f.limite += 200; re(); });
  }

  window.App.registrar('movimientos', { titulo: 'Movimientos', sub: 'Ingresos, gastos, transferencias y recurrentes', render, despues });
})();
