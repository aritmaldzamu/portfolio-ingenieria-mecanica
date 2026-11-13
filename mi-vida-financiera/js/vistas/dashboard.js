/* =====================================================================
 * Vista: Dashboard (pantalla principal)
 * ===================================================================== */
(function () {
  'use strict';
  const { Motor: M, Formato: F, UI, Graficas: G, Consejos: C } = window;

  function bienvenida() {
    return `<div class="card card-destacada" style="padding:32px">
      <div class="fila-flex" style="gap:16px;align-items:flex-start">
        ${UI.burbuja('sparkles', 'var(--accent)', 'lg')}
        <div style="flex:1;min-width:240px">
          <h2 style="font-size:22px">Bienvenido a Mi Vida Financiera</h2>
          <p class="suave mt-s" style="max-width:640px">Registra a dónde metiste tu dinero, a qué tasa y para qué (coche, casa, negocio…). La app calcula sola tus rendimientos y te dice cuánto vas a tener y cuándo. <b>Todo se queda en este dispositivo.</b></p>
          <div class="campo mt" style="max-width:320px"><label for="bienv-nombre">¿Cómo te llamas?</label><input type="text" id="bienv-nombre" value="${UI.esc(window.App.estado.config.nombre)}" placeholder="Tu nombre" autocomplete="given-name"></div>
          <div class="fila-flex mt"><button class="btn btn-primario" data-accion="nueva-cuenta">${UI.icono('plus')}Agrega tu primera cuenta</button><button class="btn" data-accion="cargar-demo">${UI.icono('sparkles')}Cargar datos de ejemplo</button><button class="btn btn-fantasma" data-accion="importar-json">${UI.icono('upload')}Importar respaldo</button></div>
        </div>
      </div>
    </div>
    <div class="grid mt">
      ${[['wallet', '1. Tus cuentas', 'Nu, Revolut, Cetes, débito, tarjetas… con su tasa (puede ser escalonada o con tope).'], ['layers', '2. Tus apartados', 'Crea "Coche", "Casa", "Mi negocio" y deposita dinero a una tasa en cualquier cuenta.'], ['sparkles', '3. Mira tu dinero trabajar', 'Rendimientos en vivo, proyecciones en lenguaje natural y alertas inteligentes.']].map(([i, t, d]) => `<div class="card s-4">${UI.burbuja(i, 'var(--accent)')}<h3 class="mt" style="font-size:15px">${t}</h3><p class="suave mt-s">${d}</p></div>`).join('')}
    </div>`;
  }

  function render(app) {
    const est = app.estado, calc = app.calc, hoy = app.hoy;
    if (!est.cuentas.length) return bienvenida();
    const serie = M.seriePatrimonio(est, calc, 12);
    const delta = serie.length > 1 ? serie[serie.length - 1].patrimonio - serie[serie.length - 2].patrimonio : 0;
    const flujo = M.flujoMes(est, M.mesDe(hoy));
    const ant = M.flujoMes(est, M.mesDe(M.sumarMeses(M.inicioMes(hoy), -1)));
    const mensajes = C.mensajesDashboard(est, calc);
    const alertas = C.alertas(est, calc);
    const pagos = C.proximosPagos(est, calc, 14);
    const pres = M.estadoPresupuesto(est, M.mesDe(hoy));
    const gp = M.gastoPromedioMensual(est, hoy);
    const fondo = est.apartados.find(a => a.esFondo);
    const fondoValor = fondo ? calc.apartados[fondo.id].valor : 0;
    const mesesCub = gp > 0 ? fondoValor / gp : 0;
    const metaMeses = Number(est.config.fondoMeses) || 6;
    const rend = calc.rendimiento;

    // --- Flujo del mes ---
    const maxF = Math.max(flujo.ingresos, flujo.gastos, Math.abs(flujo.ahorro), 1);
    const barraF = (et, v, color) => `<div><div class="entre" style="font-size:12.5px"><span class="suave">${et}</span><b class="num">${UI.m(v)}</b></div><div class="barra mt-s" style="--c:${color}"><i data-ancho="${Math.max(0, v) / maxF * 100}"></i></div></div>`;

    // --- Dona de gastos ---
    const cats = Object.entries(flujo.porCategoria).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
    const donaDatos = cats.slice(0, 7).map(([id, v]) => { const c = app.categoria(id) || {}; return { label: c.nombre || 'Otros', valor: v, color: c.color || '#94a3b8' }; });
    if (cats.length > 7) donaDatos.push({ label: 'Otras', valor: cats.slice(7).reduce((s, x) => s + x[1], 0), color: '#94a3b8' });

    // --- Metas ---
    const metas = est.metas.map(mt => ({ mt, p: M.progresoMeta(est, calc, mt) })).sort((a, b) => ({ alta: 0, media: 1, baja: 2 }[a.mt.prioridad] - { alta: 0, media: 1, baja: 2 }[b.mt.prioridad]));

    return `
    <div class="grid">
      <section class="card card-destacada s-8">
        <div class="entre" style="align-items:flex-start;flex-wrap:wrap">
          <div>
            <div class="kpi-label">${UI.icono('trending', 'ico-sm')}Patrimonio neto</div>
            <div class="kpi-valor grande">${UI.mc(calc.patrimonio)}</div>
            <div class="kpi-pie"><span class="chip ${delta >= 0 ? 'verde' : 'rojo'}">${UI.icono(delta >= 0 ? 'arrowUp' : 'arrowDown')}<span class="monto">${F.dinero(delta, { signo: true, dec: 0 })}</span></span><span>vs. fin del mes pasado</span></div>
          </div>
          <dl class="dl" style="min-width:200px">
            <dt>Activos</dt><dd>${UI.m(calc.activos)}</dd>
            <dt>Deudas</dt><dd class="rojo-txt">${UI.m(-calc.deudas)}</dd>
            <dt>Líquido</dt><dd>${UI.m(calc.liquido)}</dd>
          </dl>
        </div>
        <div class="grafica baja mt"><canvas id="g-patrimonio" aria-label="Evolución mensual del patrimonio neto"></canvas></div>
      </section>

      <section class="card s-4">
        <div class="card-head"><h3>${UI.icono('coins')}Rendimiento estimado</h3><span class="chip verde">${F.pct(calc.tasaPonderada)} neto</span></div>
        <div class="kpi-label"><span class="pulso"></span>Generado hoy (en vivo)</div>
        <div class="kpi-valor"><span class="vivo monto" data-vivo="${rend.diario}" data-dec="4">$0.0000</span></div>
        <div class="kpi-pie"><span>${UI.m(rend.diario)} al día · tu dinero trabajando mientras lees esto</span></div>
        <div class="kpis mt">
          <div class="mini-kpi"><div class="kpi-label">Este mes</div><div class="kpi-valor verde-txt">${UI.mc(rend.mes, { dec: 0 })}</div><div class="fila-sub">de ~${UI.m(rend.mensual, { dec: 0 })}</div></div>
          <div class="mini-kpi"><div class="kpi-label">Al mes</div><div class="kpi-valor">${UI.mc(rend.mensual, { dec: 0 })}</div><div class="fila-sub">proyección</div></div>
          <div class="mini-kpi"><div class="kpi-label">Al año</div><div class="kpi-valor">${UI.mc(rend.anual, { dec: 0 })}</div><div class="fila-sub">proyección</div></div>
        </div>
      </section>

      ${!(window.Sync && window.Sync.activo) ? `<section class="card s-12 card-sm"><div class="entre" style="flex-wrap:wrap"><div class="fila-flex" style="gap:12px;flex-wrap:nowrap">${UI.burbuja('refresh', 'var(--blue)', 'sm')}<div><b style="font-weight:600">Usa los mismos datos en tu celular y tu compu</b><div class="fila-sub" style="white-space:normal">Activa la sincronización con tu GitHub privado (3 pasos, una sola vez).</div></div></div><a class="btn btn-sm btn-primario" href="#/config">Activar</a></div></section>` : ''}
      ${mensajes.length ? `<section class="card s-12"><div class="card-head"><h3>${UI.icono('sparkles')}Tu dinero en palabras</h3></div><div class="mensajes">${mensajes.map(t => `<div class="mensaje">${UI.icono('sparkles')}<span>${t}</span></div>`).join('')}</div></section>` : ''}

      <section class="card s-12">
        <div class="card-head"><h3>${UI.icono('layers')}Tus apartados</h3><div class="fila-flex"><button class="btn btn-sm" data-accion="depositar">${UI.icono('plus')}Depositar</button><a class="btn btn-sm btn-fantasma" href="#/apartados">Ver todos${UI.icono('chevronRight')}</a></div></div>
        ${est.apartados.length ? `<div class="tarjetas" style="grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:12px">${est.apartados.map(a => {
          const ca = calc.apartados[a.id]; const pct = a.meta ? ca.valor / a.meta * 100 : null;
          return `<a class="card card-sm tcuenta" href="#/apartados/${a.id}" style="--c:${a.color};color:var(--text)">
            <div class="fila-flex" style="gap:10px;flex-wrap:nowrap">${UI.burbuja(a.icono, a.color, 'sm')}<div class="fila-txt"><div class="fila-titulo">${UI.esc(a.nombre)}</div><div class="fila-sub verde-txt">+${UI.m(ca.diario)} hoy</div></div></div>
            <div class="grande-num mt">${UI.m(ca.valor, { dec: 0 })}</div>
            ${pct != null ? `<div class="barra fina mt-s" style="--c:${a.color}"><i data-ancho="${Math.min(100, pct)}"></i></div><div class="fila-sub mt-s">${Math.round(pct)} % de ${UI.m(a.meta, { dec: 0 })}</div>` : `<div class="fila-sub mt-s">Ganado: ${UI.m(ca.ganado)}</div>`}
          </a>`;
        }).join('')}</div>` : UI.vacio({ icono: 'layers', titulo: 'Crea tu primer apartado', texto: 'Un apartado es un "para qué": Coche, Casa, Mi negocio… y puede tener dinero en varias cuentas.', boton: 'Nuevo apartado', accion: 'nuevo-apartado', compacto: true })}
      </section>

      <section class="card s-4">
        <div class="card-head"><h3>${UI.icono('swap')}Flujo de ${F.MESES[M.partes(hoy).m - 1]}</h3>${flujo.ingresos > 0 && flujo.ahorro >= 0 ? `<span class="chip ${flujo.tasaAhorro >= 20 ? 'verde' : 'amarillo'}">Ahorro ${Math.round(flujo.tasaAhorro)} %</span>` : flujo.ahorro < 0 ? '<span class="chip amarillo">Mes en curso</span>' : ''}</div>
        <div class="pila" style="gap:12px">
          ${barraF('Ingresos', flujo.ingresos, 'var(--green)')}
          ${barraF('Gastos (tu parte)', flujo.gastos, 'var(--red)')}
          ${barraF(flujo.ahorro >= 0 ? 'Ahorro' : 'Déficit', Math.abs(flujo.ahorro), flujo.ahorro >= 0 ? 'var(--accent)' : 'var(--yellow)')}
        </div>
        <div class="divisor"></div>
        <div class="fila-sub" style="white-space:normal">Mes anterior: ingresos ${UI.m(ant.ingresos, { dec: 0 })}, gastos ${UI.m(ant.gastos, { dec: 0 })}, ahorro <b class="${ant.ahorro >= 0 ? 'verde-txt' : 'rojo-txt'}">${ant.ingresos > 0 ? Math.round(ant.tasaAhorro) + ' %' : '—'}</b>.${flujo.papas > 0 ? ` Tus papás te apoyaron con ${UI.m(flujo.papas, { dec: 0 })} este mes.` : ''}</div>
      </section>

      <section class="card s-4">
        <div class="card-head"><h3>${UI.icono('shield')}Fondo de emergencia</h3>${fondo ? `<a class="btn btn-sm btn-fantasma" href="#/apartados/${fondo.id}">Ver</a>` : ''}</div>
        ${fondo ? `<div class="kpi-valor">${mesesCub.toFixed(1)} <span class="tenue" style="font-size:16px;font-weight:500">de ${metaMeses} meses</span></div>
          <div class="barra gruesa mt" style="--c:${mesesCub >= metaMeses ? 'var(--green)' : mesesCub >= 3 ? 'var(--yellow)' : 'var(--red)'}"><i data-ancho="${Math.min(100, mesesCub / metaMeses * 100)}"></i></div>
          <dl class="dl mt"><dt>Tienes</dt><dd>${UI.m(fondoValor, { dec: 0 })}</dd><dt>Meta (${metaMeses} × ${UI.m(gp, { dec: 0 })})</dt><dd>${UI.m(gp * metaMeses, { dec: 0 })}</dd><dt>Te falta</dt><dd>${UI.m(Math.max(0, gp * metaMeses - fondoValor), { dec: 0 })}</dd></dl>`
        : UI.vacio({ icono: 'shield', titulo: 'Marca un apartado como fondo de emergencia', texto: 'Edita un apartado y activa "Es mi fondo de emergencia".', compacto: true })}
      </section>

      <section class="card s-4">
        <div class="card-head"><h3>${UI.icono('clock')}Próximos 14 días</h3><a class="btn btn-sm btn-fantasma" href="#/calendario">Calendario</a></div>
        ${pagos.length ? `<div class="lista">${pagos.slice(0, 6).map(p => {
          const d = M.D(p.fecha) - M.D(hoy);
          const color = p.tipo === 'corte' ? 'var(--yellow)' : p.tipo === 'vencimiento' ? 'var(--green)' : 'var(--red)';
          return `<div class="fila">${UI.burbuja(p.icono, color, 'sm')}<div class="fila-txt"><div class="fila-titulo">${UI.esc(p.titulo)}</div><div class="fila-sub">${F.fecha(p.fecha, 'dia')} · ${F.relativo(d)}</div></div><div class="fila-der num">${p.signo < 0 ? UI.m(-p.monto, { color: true, dec: 0 }) : UI.m(p.monto, { dec: 0 })}</div></div>`;
        }).join('')}</div>` : UI.vacio({ icono: 'calendar', titulo: 'Nada por pagar', texto: 'Agrega recurrentes o tarjetas para verlos aquí.', compacto: true })}
      </section>

      <section class="card s-6">
        <div class="card-head"><h3>${UI.icono('pie')}Gastos por categoría</h3><span class="sub">${F.fecha(hoy, 'mes')}</span></div>
        ${donaDatos.length ? `<div class="dona-wrap">
          <div class="grafica dona"><canvas id="g-dona" aria-label="Gastos por categoría"></canvas><div class="dona-centro"><div><b class="monto">${F.dinero(flujo.gastos, { dec: 0 })}</b><span>tu parte</span></div></div></div>
          <div class="lista">${donaDatos.map(d => `<div class="fila" style="padding:7px 0"><span class="punto" style="--c:${d.color}"></span><div class="fila-txt">${UI.esc(d.label)}</div><div class="fila-der num">${UI.m(d.valor, { dec: 0 })} <span class="tenue">${Math.round(d.valor / flujo.gastos * 100)} %</span></div></div>`).join('')}</div>
        </div>` : UI.vacio({ icono: 'pie', titulo: 'Sin gastos este mes', texto: 'Registra un gasto con el botón + o escribiendo "gasté 200 en comida".', compacto: true })}
      </section>

      <section class="card s-6">
        <div class="card-head"><h3>${UI.icono('target')}Presupuesto disponible</h3><a class="btn btn-sm btn-fantasma" href="#/presupuesto">Editar</a></div>
        ${pres.filas.filter(f => f.presupuesto > 0).length ? `<div class="pila" style="gap:12px">${pres.filas.filter(f => f.presupuesto > 0).sort((a, b) => b.pct - a.pct).slice(0, 6).map(f => `
          <div><div class="entre" style="font-size:13px"><span class="fila-flex" style="gap:8px">${UI.burbuja(f.cat.icono, f.cat.color, 'sm')}${UI.esc(f.cat.nombre)}</span><span class="num ${f.restante < 0 ? 'rojo-txt' : 'suave'}">${f.restante >= 0 ? `Quedan ${UI.m(f.restante, { dec: 0 })}` : `Te pasaste ${UI.m(-f.restante, { dec: 0 })}`}</span></div>
          <div class="mt-s">${UI.barra(f.pct, { semaforo: true })}</div></div>`).join('')}
          <div class="entre fila-sub mt-s" style="white-space:normal"><span>Total: ${UI.m(pres.totalGast, { dec: 0 })} de ${UI.m(pres.totalPres, { dec: 0 })}</span><span>${UI.m(Math.max(0, pres.totalPres - pres.totalGast), { dec: 0 })} disponibles</span></div>
        </div>` : UI.vacio({ icono: 'target', titulo: 'Aún no tienes presupuesto', texto: 'Usa la plantilla 50/30/20 o define montos por categoría.', boton: 'Crear presupuesto', accion: 'ir', datos: 'data-ruta="presupuesto"', compacto: true })}
      </section>

      <section class="card s-6">
        <div class="card-head"><h3>${UI.icono('flag')}Metas</h3><a class="btn btn-sm btn-fantasma" href="#/metas">Ver todas</a></div>
        ${metas.length ? `<div class="pila" style="gap:14px">${metas.slice(0, 5).map(({ mt, p }) => `
          <div><div class="entre"><span class="fila-flex" style="gap:8px">${UI.burbuja(mt.icono || 'target', mt.color, 'sm')}<span><b style="font-weight:600">${UI.esc(mt.nombre)}</b><span class="fila-sub" style="display:block">${p.necesario != null && p.faltante > 0 ? `Necesitas ${F.dinero(p.necesario, { dec: 0 })}/mes` : p.faltante <= 0 ? '¡Meta cumplida!' : 'Sin fecha límite'}</span></span></span><span class="num">${UI.m(p.actual, { dec: 0 })} <span class="tenue">/ ${UI.m(p.objetivo, { dec: 0 })}</span></span></div>
          <div class="barra mt-s" style="--c:${mt.color}"><i data-ancho="${p.pct}"></i></div></div>`).join('')}</div>`
        : UI.vacio({ icono: 'flag', titulo: 'Sin metas todavía', texto: 'Define cuánto quieres juntar y para cuándo.', boton: 'Nueva meta', accion: 'nueva-meta', compacto: true })}
      </section>

      <section class="card s-6">
        <div class="card-head"><h3>${UI.icono('bell')}Alertas inteligentes</h3>${alertas.length ? `<span class="chip">${alertas.length}</span>` : ''}</div>
        ${alertas.length ? `<div class="pila" style="gap:8px">${alertas.slice(0, 6).map(a => `<div class="alerta ${a.nivel}" data-accion="ir" data-ruta="${a.ruta}" role="button" tabindex="0">${UI.burbuja(a.icono, null, 'sm')}<div><div class="alerta-titulo">${a.titulo}</div><div class="alerta-txt">${a.texto}</div></div></div>`).join('')}</div>`
        : UI.vacio({ icono: 'check', titulo: 'Todo en orden', texto: 'No hay nada que requiera tu atención.', compacto: true })}
      </section>
    </div>`;
  }

  function despues(app, cont) {
    const nom = cont && cont.querySelector('#bienv-nombre');
    if (nom) nom.addEventListener('change', () => { app.estado.config.nombre = nom.value.trim(); app.guardar(); app.pintarPerfil(); UI.$('#titulo').textContent = app.estado.config.nombre ? `Hola, ${app.estado.config.nombre}` : 'Inicio'; });
    if (!app.estado.cuentas.length) return;
    const serie = M.seriePatrimonio(app.estado, app.calc, 12);
    const t = G.tema();
    G.linea(document.getElementById('g-patrimonio'), serie.map(s => F.fecha(s.fecha, 'mesCorto')), [{ label: 'Patrimonio', data: serie.map(s => Math.round(s.patrimonio * 100) / 100), color: t.acento, area: true }], { desdeCero: false, maxX: 12 });
    const flujo = M.flujoMes(app.estado, M.mesDe(app.hoy));
    const cats = Object.entries(flujo.porCategoria).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
    const datos = cats.slice(0, 7).map(([id, v]) => { const c = app.categoria(id) || {}; return { label: c.nombre || 'Otros', valor: v, color: c.color || '#94a3b8' }; });
    if (cats.length > 7) datos.push({ label: 'Otras', valor: cats.slice(7).reduce((s, x) => s + x[1], 0), color: '#94a3b8' });
    if (datos.length) G.dona(document.getElementById('g-dona'), datos);
  }

  window.App.registrar('dashboard', {
    titulo: app => app.estado.config.nombre ? `Hola, ${app.estado.config.nombre}` : 'Inicio',
    sub: app => `${F.fecha(app.hoy, 'larga')} · Resumen de tu dinero`,
    render, despues,
  });
})();
