/* =====================================================================
 * Vista: Ingresos — fuentes de ingreso y calculadora de sueldo neto.
 * ===================================================================== */
(function () {
  'use strict';
  const { Motor: M, Formato: F, Finanzas: Fz, UI, Graficas: G } = window;
  let bruto = null;
  const ICO = { sueldo: 'briefcase', aguinaldo: 'gift', prima: 'sun', beca: 'graduation', freelance: 'laptop', otro: 'coins' };
  const FREC = { quincenal: 'Quincenal', mensual: 'Mensual', semanal: 'Semanal', anual: 'Anual', unico: 'Único / variable' };

  function render(a) {
    const est = a.estado, cfg = est.config;
    const fuentes = est.ingresos.fuentes;
    const tot = M.ingresoMensualFuentes(est);
    const sueldo = fuentes.find(f => f.tipo === 'sueldo');
    if (bruto == null) bruto = sueldo ? sueldo.bruto * (sueldo.frecuencia === 'quincenal' ? 2 : sueldo.frecuencia === 'semanal' ? 52 / 12 : 1) : 20000;
    const r = Fz.sueldoNeto(bruto, { tablaAnual: cfg.tablaISR, umaDiaria: cfg.umaDiaria, subsidioPct: cfg.subsidioPct, subsidioTope: cfg.subsidioTope, imssPct: cfg.imssPct, imssExcedentePct: cfg.imssExcedentePct, factorIntegracion: cfg.factorIntegracion });
    const anualBruto = bruto * 12;
    return `
    <div class="cabecera-vista"><button class="btn btn-primario" data-accion="nuevo-ingreso">${UI.icono('plus')}Agregar fuente de ingreso</button><button class="btn" data-accion="nuevo-movimiento" data-tipo="ingreso">${UI.icono('arrowDown')}Registrar un ingreso</button></div>
    <div class="grid">
      <div class="card s-4"><div class="kpi-label">Ingreso neto mensual estimado</div><div class="kpi-valor verde-txt">${UI.mc(tot.mensual)}</div><div class="kpi-pie">incluye prestaciones anuales prorrateadas</div></div>
      <div class="card s-4"><div class="kpi-label">Ingreso bruto anual</div><div class="kpi-valor">${UI.mc(tot.anualBruto, { dec: 0 })}</div><div class="kpi-pie">se usa para el PPR y el ISR</div></div>
      <div class="card s-4"><div class="kpi-label">Tasa marginal de ISR</div><div class="kpi-valor">${F.pct(Fz.tasaMarginalISR(tot.anualBruto, cfg.tablaISR))}</div><div class="kpi-pie">según la tabla anual de Configuración</div></div>

      <section class="card s-7">
        <div class="card-head"><h3>${UI.icono('briefcase')}Fuentes de ingreso</h3></div>
        ${fuentes.length ? `<div class="lista">${fuentes.map(f => `<div class="fila clic" data-accion="editar-ingreso" data-id="${f.id}">${UI.burbuja(ICO[f.tipo] || 'coins', 'var(--green)', 'sm')}<div class="fila-txt"><div class="fila-titulo">${UI.esc(f.nombre)}</div><div class="fila-sub">${FREC[f.frecuencia] || f.frecuencia} · bruto ${F.dinero(f.bruto)}</div></div><div class="fila-der"><div class="num verde-txt">${UI.m(f.neto)}</div><div class="fila-sub">neto</div></div></div>`).join('')}</div>`
        : UI.vacio({ icono: 'briefcase', titulo: 'Agrega tu sueldo', texto: 'Sueldo, aguinaldo, prima vacacional, beca de practicante o freelance. Sirve para el presupuesto 50/30/20 y para el PPR.', boton: 'Agregar ingreso', accion: 'nuevo-ingreso', compacto: true })}
      </section>

      <section class="card s-5">
        <div class="card-head"><h3>${UI.icono('calculator')}Sueldo neto a partir del bruto</h3></div>
        <div class="campo"><label for="ing-bruto">Sueldo bruto mensual</label><div class="input-pre"><span>$</span><input type="text" inputmode="decimal" id="ing-bruto" value="${F.numero(bruto)}"></div></div>
        <dl class="dl mt">
          <dt>Bruto mensual</dt><dd>${UI.m(r.bruto)}</dd>
          <dt>ISR (tabla mensual)</dt><dd class="rojo-txt">${UI.m(-r.isrBruto)}</dd>
          ${r.subsidio > 0 ? `<dt>Subsidio para el empleo</dt><dd class="verde-txt">${UI.m(r.subsidio)}</dd>` : ''}
          <dt>IMSS (cuota obrera aprox.)</dt><dd class="rojo-txt">${UI.m(-r.imss)}</dd>
          <dt><b>Neto mensual</b></dt><dd class="verde-txt" style="font-size:18px"><b>${UI.m(r.neto)}</b></dd>
          <dt>Neto quincenal</dt><dd>${UI.m(r.neto / 2)}</dd>
          <dt>Aguinaldo (15 días) aprox.</dt><dd>${UI.m(bruto / 30.4 * 15)}</dd>
        </dl>
        <p class="nota mt">Es una <b>estimación</b>: ISR con la tabla anual ÷ 12 y cuota obrera del IMSS aproximada (${F.pct(cfg.imssPct, 3)} + ${F.pct(cfg.imssExcedentePct)} sobre el excedente de 3 UMA). Las tablas se editan en Configuración. Tu recibo de nómina manda.</p>
        <div class="fila-flex mt"><button class="btn btn-sm" data-usar-calculo>${UI.icono('check')}Guardar como mi sueldo (quincenal)</button></div>
        <div class="nota mt">Ingreso anual ≈ ${UI.m(anualBruto, { dec: 0 })} bruto.</div>
      </section>

      <section class="card s-12">
        <div class="card-head"><h3>${UI.icono('chart')}Ingresos registrados</h3><span class="sub">últimos 6 meses por categoría</span></div>
        <div class="grafica"><canvas id="g-ing" aria-label="Ingresos de los últimos 6 meses"></canvas></div>
      </section>
    </div>`;
  }

  function despues(a, cont) {
    const est = a.estado;
    const meses = Array.from({ length: 6 }, (_, i) => M.mesDe(M.sumarMeses(M.inicioMes(a.hoy), i - 5)));
    const cats = est.categorias.filter(c => c.tipo === 'ingreso');
    const t = G.tema();
    const series = cats.map((c, i) => ({ label: c.nombre, data: meses.map(ym => est.movimientos.filter(m => m.tipo === 'ingreso' && m.categoriaId === c.id && M.mesDe(m.fecha) === ym).reduce((s, m) => s + m.monto, 0)), color: t.series[i % 8] })).filter(s => s.data.some(v => v > 0));
    if (series.length) G.barras(cont.querySelector('#g-ing'), meses.map(m => F.fecha(m + '-01', 'mesCorto')), series, { leyenda: true, apilado: true });
    else cont.querySelector('#g-ing').parentElement.innerHTML = '<div class="grafica-sin">Aún no registras ingresos.</div>';
    const inp = cont.querySelector('#ing-bruto');
    inp.addEventListener('change', () => { bruto = UI.numero(inp.value) || 0; a.render(false); });
    cont.querySelector('[data-usar-calculo]').addEventListener('click', () => {
      const cfg = est.config;
      const r = Fz.sueldoNeto(bruto, { tablaAnual: cfg.tablaISR, umaDiaria: cfg.umaDiaria, subsidioPct: cfg.subsidioPct, subsidioTope: cfg.subsidioTope, imssPct: cfg.imssPct, imssExcedentePct: cfg.imssExcedentePct, factorIntegracion: cfg.factorIntegracion });
      a.mutar(e => {
        let s = e.ingresos.fuentes.find(f => f.tipo === 'sueldo');
        if (!s) { s = { id: window.Estado.nuevoId('ing'), tipo: 'sueldo', nombre: 'Sueldo' }; e.ingresos.fuentes.push(s); }
        Object.assign(s, { bruto: Math.round(bruto / 2 * 100) / 100, neto: Math.round(r.neto / 2 * 100) / 100, frecuencia: 'quincenal' });
      }, 'Sueldo guardado');
    });
  }

  window.App.registrar('ingresos', { titulo: 'Ingresos', sub: 'Sueldo, prestaciones y calculadora bruto → neto', render, despues });
})();
