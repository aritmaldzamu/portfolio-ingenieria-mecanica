/* =====================================================================
 * Vista: Calendario financiero mensual.
 * ===================================================================== */
(function () {
  'use strict';
  const { Motor: M, Formato: F, UI } = window;
  let mes = null, diaSel = null;
  const COLOR = { pago: 'var(--red)', recurrente: 'var(--red)', corte: 'var(--yellow)', vencimiento: 'var(--green)', ingreso: 'var(--green)', meta: 'var(--accent)', hecho: 'var(--text-3)' };
  const NOMBRE = { pago: 'Pago', recurrente: 'Recurrente', corte: 'Corte', vencimiento: 'Vencimiento', ingreso: 'Ingreso', meta: 'Meta', hecho: 'Registrado' };

  function eventosMes(a, ym) {
    const ini = ym + '-01', fin = M.finMes(ini);
    const futuros = M.eventos(a.estado, a.calc, a.hoy > ini ? a.hoy : ini, fin);
    // Pasado del mes: recurrentes ya registrados y vencimientos/cortes pasados
    const pasados = [];
    if (a.hoy > ini) {
      const hastaAyer = M.sumarDias(a.hoy, -1) < fin ? M.sumarDias(a.hoy, -1) : fin;
      for (const m of a.estado.movimientos) if (m.recurrenteId && m.fecha >= ini && m.fecha <= hastaAyer) pasados.push({ fecha: m.fecha, tipo: m.tipo === 'ingreso' ? 'ingreso' : 'hecho', titulo: m.nota || 'Recurrente', monto: m.monto, signo: m.tipo === 'ingreso' ? 1 : -1, hecho: true });
      for (const c of a.estado.cuentas) if (c.tipo === 'credito' && c.credito && !c.archivada) {
        for (const [d, t] of [[c.credito.diaCorte, 'corte'], [c.credito.diaPago, 'pago']]) { const f = M.proximoDiaDelMes(ini, Number(d) || 1); if (f <= hastaAyer) pasados.push({ fecha: f, tipo: t, titulo: `${t === 'corte' ? 'Corte' : 'Pago'} ${c.nombre}`, monto: 0, signo: 0, hecho: true }); }
      }
    }
    return [...pasados, ...futuros].sort((x, y) => x.fecha.localeCompare(y.fecha));
  }

  function render(a) {
    if (!mes) mes = M.mesDe(a.hoy);
    if (!diaSel) diaSel = a.hoy;
    const ini = mes + '-01';
    const { y, m } = M.partes(ini);
    const dias = M.diasEnMes(y, m);
    const primerDow = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7; // lunes = 0
    const evs = eventosMes(a, mes);
    const porDia = {};
    for (const e of evs) (porDia[e.fecha] = porDia[e.fecha] || []).push(e);
    const celdas = [];
    for (let i = 0; i < primerDow; i++) celdas.push('<div class="cal-dia fuera" aria-hidden="true"></div>');
    for (let d = 1; d <= dias; d++) {
      const f = `${mes}-${String(d).padStart(2, '0')}`;
      const es = porDia[f] || [];
      celdas.push(`<div class="cal-dia ${f === a.hoy ? 'hoy' : ''} ${f === diaSel ? 'sel' : ''}" data-dia="${f}" role="button" tabindex="0" aria-label="${F.fecha(f, 'larga')}, ${es.length} eventos">
        <span class="cal-num">${d}</span>
        ${es.slice(0, 3).map(e => `<span class="cal-ev" style="--c:${COLOR[e.tipo]}">${UI.esc(e.titulo)}</span>`).join('')}
        ${es.length > 3 ? `<span class="cal-mas">+${es.length - 3} más</span>` : ''}
        <span class="cal-puntos">${es.slice(0, 4).map(e => `<i style="--c:${COLOR[e.tipo]}"></i>`).join('')}</span>
      </div>`);
    }
    const sel = porDia[diaSel] || [];
    const salidas = evs.filter(e => e.signo < 0 && !e.hecho).reduce((s, e) => s + e.monto, 0);
    const entradas = evs.filter(e => e.signo > 0 && !e.hecho).reduce((s, e) => s + e.monto, 0);
    return `
    <div class="cabecera-vista">
      <div class="fila-flex"><button class="btn-icono" data-cal="-1" aria-label="Mes anterior">${UI.icono('chevronLeft')}</button><b style="font-size:16px;min-width:150px;text-align:center;text-transform:capitalize">${F.fecha(ini, 'mes')}</b><button class="btn-icono" data-cal="1" aria-label="Mes siguiente">${UI.icono('chevronRight')}</button><button class="btn btn-sm btn-fantasma" data-cal="0">Hoy</button></div>
      <div class="leyenda" style="margin:0">${Object.entries(NOMBRE).map(([k, n]) => `<span><i style="--c:${COLOR[k]}"></i>${n}</span>`).join('')}</div>
    </div>
    <div class="grid">
      <section class="card s-8">
        <div class="cal">${['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => `<div class="cal-cab">${d}</div>`).join('')}${celdas.join('')}</div>
      </section>
      <div class="s-4 pila">
        <section class="card">
          <div class="card-head"><h3>${UI.icono('calendar')}${F.fecha(diaSel, 'larga')}</h3></div>
          ${sel.length ? `<div class="lista">${sel.map(e => `<div class="fila">${UI.burbuja(e.icono || 'calendar', COLOR[e.tipo], 'sm')}<div class="fila-txt"><div class="fila-titulo">${UI.esc(e.titulo)}</div><div class="fila-sub">${NOMBRE[e.tipo]}${e.hecho ? ' · ya registrado' : ''}</div></div><div class="fila-der num">${e.monto ? (e.signo ? UI.m(e.signo * e.monto, { color: true, dec: 0 }) : UI.m(e.monto, { dec: 0 })) : ''}</div></div>`).join('')}</div>` : '<p class="nota">Nada programado este día.</p>'}
        </section>
        <section class="card">
          <div class="card-head"><h3>${UI.icono('clock')}Lo que falta del mes</h3></div>
          <dl class="dl"><dt>Entradas programadas</dt><dd class="verde-txt">${UI.m(entradas, { dec: 0 })}</dd><dt>Salidas programadas</dt><dd class="rojo-txt">${UI.m(-salidas, { dec: 0 })}</dd></dl>
          <div class="lista mt">${evs.filter(e => !e.hecho).slice(0, 8).map(e => `<div class="fila" style="padding:7px 0"><span class="punto" style="--c:${COLOR[e.tipo]}"></span><div class="fila-txt"><div class="fila-titulo" style="font-size:13px">${UI.esc(e.titulo)}</div><div class="fila-sub">${F.fecha(e.fecha, 'dia')}</div></div><div class="fila-der num">${e.monto ? UI.m(e.signo ? e.signo * e.monto : e.monto, { color: !!e.signo, dec: 0 }) : ''}</div></div>`).join('') || '<p class="nota">Nada más este mes.</p>'}</div>
        </section>
      </div>
    </div>`;
  }

  function despues(a, cont) {
    cont.querySelectorAll('[data-cal]').forEach(b => b.addEventListener('click', () => {
      const n = Number(b.dataset.cal);
      if (n === 0) { mes = M.mesDe(a.hoy); diaSel = a.hoy; } else { mes = M.mesDe(M.sumarMeses(mes + '-01', n)); diaSel = mes + '-01'; }
      a.render(false);
    }));
    cont.querySelectorAll('[data-dia]').forEach(d => {
      const ir = () => { diaSel = d.dataset.dia; a.render(false); };
      d.addEventListener('click', ir);
      d.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ir(); } });
    });
  }

  window.App.registrar('calendario', { titulo: 'Calendario financiero', sub: 'Pagos, cortes, vencimientos y días de pago', render, despues });
})();
