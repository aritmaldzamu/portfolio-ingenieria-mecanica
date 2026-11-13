/* =====================================================================
 * Vista: Proyecciones y escenarios (nominal y real), "¿qué pasa si…?"
 * y calculadora de interés compuesto libre.
 * ===================================================================== */
(function () {
  'use strict';
  const { Motor: M, Formato: F, Finanzas: Fz, UI, Graficas: G } = window;
  const qs = { ahorro: null, extra: 2000, sueldo: null, categoria: 'cat_comida', recorte: 20 };
  const calc = { capital: 10000, aporte: 2000, tasa: 8, anios: 10, cap: 'mensual' };

  function base(a) {
    const ahorro = qs.ahorro != null ? qs.ahorro : Math.max(0, Math.round(M.ahorroPromedioMensual(a.estado, a.hoy) / 100) * 100);
    return { pat: a.calc.patrimonio, ahorro, tasa: a.calc.tasaPonderada };
  }
  const vf = (pv, pmt, tasa, anios) => Fz.valorFuturo(pv, pmt, tasa, anios * 12, 'mensual').total;

  function render(a) {
    const est = a.estado, cfg = est.config;
    const b = base(a);
    const esc = [['Conservador', cfg.escenarios.conservador], ['Base (tus cuentas)', b.tasa], ['Optimista', cfg.escenarios.optimista]];
    // ¿Qué pasa si…?
    const ingresoAct = M.ingresoMensualFuentes(est).mensual || M.flujoMes(est, M.mesDe(M.sumarMeses(M.inicioMes(a.hoy), -1))).ingresos;
    const gastoCat = (() => { let s = 0; for (let i = 1; i <= 3; i++) s += (M.flujoMes(est, M.mesDe(M.sumarMeses(M.inicioMes(a.hoy), -i))).porCategoria[qs.categoria] || 0) / 3; return s; })();
    const escenariosQ = [
      ['Como vas', b.ahorro],
      [`Ahorrar ${F.dinero(qs.extra, { dec: 0 })} más`, b.ahorro + (qs.extra || 0)],
      [`Sueldo de ${F.dinero(qs.sueldo || ingresoAct, { dec: 0 })} neto`, b.ahorro + ((qs.sueldo || ingresoAct) - ingresoAct)],
      [`Recortar ${qs.recorte} % de ${(a.categoria(qs.categoria) || {}).nombre || ''}`, b.ahorro + gastoCat * (qs.recorte || 0) / 100],
    ];
    const cc = Fz.valorFuturo(calc.capital, calc.aporte, calc.tasa, calc.anios * 12, calc.cap);
    return `
    <div class="grid">
      <section class="card s-12">
        <div class="card-head"><h3>${UI.icono('trending')}Proyección de patrimonio</h3>
          <div class="fila-flex"><label class="suave" for="pr-ahorro">Ahorro mensual</label><div class="input-pre" style="width:150px"><span>$</span><input type="text" inputmode="decimal" id="pr-ahorro" value="${F.numero(b.ahorro)}"></div></div></div>
        <p class="suave" style="margin-bottom:14px">Partiendo de tu patrimonio actual (${UI.m(b.pat, { dec: 0 })}) y ahorrando ${UI.m(b.ahorro, { dec: 0 })} al mes. El escenario base usa el rendimiento promedio ponderado de tus cuentas (${F.pct(b.tasa)} neto). Inflación esperada: ${F.pct(cfg.inflacion)}.</p>
        <div class="tabla-wrap"><table class="tabla"><thead><tr><th>Escenario</th><th class="der">Tasa</th><th class="der">1 año</th><th class="der">5 años</th><th class="der">10 años</th><th class="der">10 años (pesos de hoy)</th></tr></thead><tbody>
          ${esc.map(([n, t], i) => `<tr class="${i === 1 ? 'destacada' : ''}"><td><b style="font-weight:600">${n}</b></td><td class="der">${i === 1 ? F.pct(t) : `<div class="input-suf" style="width:96px;margin-left:auto"><input type="number" step="0.1" data-escenario="${i === 0 ? 'conservador' : 'optimista'}" value="${t}" style="min-height:32px;padding:4px 26px 4px 8px"><span>%</span></div>`}</td>${[1, 5, 10].map(y => `<td class="der">${UI.m(vf(b.pat, b.ahorro, t, y), { dec: 0 })}</td>`).join('')}<td class="der suave">${UI.m(Fz.aValorReal(vf(b.pat, b.ahorro, t, 10), cfg.inflacion, 10), { dec: 0 })}</td></tr>`).join('')}
        </tbody></table></div>
        <div class="grafica alta mt"><canvas id="g-proy" aria-label="Proyección de patrimonio a 10 años"></canvas></div>
      </section>

      <section class="card s-7">
        <div class="card-head"><h3>${UI.icono('sparkles')}¿Qué pasa si…?</h3></div>
        <div class="form">
          <div class="campo tercio m-mitad"><label>Subo mi ahorro</label><div class="input-pre"><span>$</span><input type="text" inputmode="decimal" data-qs="extra" value="${F.numero(qs.extra)}"></div></div>
          <div class="campo tercio m-mitad"><label>Nuevo sueldo neto/mes</label><div class="input-pre"><span>$</span><input type="text" inputmode="decimal" data-qs="sueldo" value="${qs.sueldo ? F.numero(qs.sueldo) : ''}" placeholder="${F.numero(ingresoAct)}"></div></div>
          <div class="campo tercio"><label>Recorto una categoría</label><div class="fila-flex" style="gap:6px;flex-wrap:nowrap"><select data-qs-cat style="flex:1">${est.categorias.filter(c => c.tipo === 'gasto').map(c => `<option value="${c.id}" ${c.id === qs.categoria ? 'selected' : ''}>${UI.esc(c.nombre)}</option>`).join('')}</select><div class="input-suf" style="width:84px"><input type="number" data-qs="recorte" value="${qs.recorte}"><span>%</span></div></div></div>
        </div>
        <div class="tabla-wrap mt"><table class="tabla"><thead><tr><th>Escenario</th><th class="der">Ahorro/mes</th><th class="der">1 año</th><th class="der">5 años</th><th class="der">10 años</th><th class="der">10 años real</th></tr></thead><tbody>
          ${escenariosQ.map(([n, ah], i) => { const d = vf(b.pat, ah, b.tasa, 10) - vf(b.pat, b.ahorro, b.tasa, 10); return `<tr class="${i === 0 ? '' : ''}"><td>${UI.esc(n)}</td><td class="der">${UI.m(ah, { dec: 0 })}</td>${[1, 5, 10].map(y => `<td class="der">${UI.m(vf(b.pat, ah, b.tasa, y), { dec: 0, compacto: true })}</td>`).join('')}<td class="der suave">${UI.m(Fz.aValorReal(vf(b.pat, ah, b.tasa, 10), cfg.inflacion, 10), { dec: 0, compacto: true })}${i > 0 && Math.abs(d) > 1 ? `<div class="fila-sub ${d > 0 ? 'verde-txt' : 'rojo-txt'}">${F.dinero(d, { dec: 0, signo: true, compacto: true })} nominal</div>` : ''}</td></tr>`; }).join('')}
        </tbody></table></div>
        <p class="nota mt">"Recortar" usa tu gasto promedio de los últimos 3 meses en esa categoría (${F.dinero(gastoCat, { dec: 0 })}/mes).</p>
      </section>

      <section class="card s-5">
        <div class="card-head"><h3>${UI.icono('calculator')}Interés compuesto</h3></div>
        <div class="form">
          <div class="campo mitad m-mitad"><label>Capital inicial</label><div class="input-pre"><span>$</span><input type="text" inputmode="decimal" data-cc="capital" value="${F.numero(calc.capital)}"></div></div>
          <div class="campo mitad m-mitad"><label>Aportación mensual</label><div class="input-pre"><span>$</span><input type="text" inputmode="decimal" data-cc="aporte" value="${F.numero(calc.aporte)}"></div></div>
          <div class="campo tercio m-mitad"><label>Tasa anual</label><div class="input-suf"><input type="number" step="0.1" data-cc="tasa" value="${calc.tasa}"><span>%</span></div></div>
          <div class="campo tercio m-mitad"><label>Años</label><input type="number" data-cc="anios" value="${calc.anios}"></div>
          <div class="campo tercio"><label>Capitalización</label><select data-cc-cap><option value="diaria" ${calc.cap === 'diaria' ? 'selected' : ''}>Diaria</option><option value="mensual" ${calc.cap === 'mensual' ? 'selected' : ''}>Mensual</option></select></div>
        </div>
        <dl class="dl mt"><dt>Tendrás</dt><dd class="verde-txt" style="font-size:18px">${UI.m(cc.total, { dec: 0 })}</dd><dt>Aportaste</dt><dd>${UI.m(cc.aportado, { dec: 0 })}</dd><dt>Intereses ganados</dt><dd>${UI.m(cc.rendimiento, { dec: 0 })}</dd><dt>En pesos de hoy</dt><dd>${UI.m(Fz.aValorReal(cc.total, cfg.inflacion, calc.anios), { dec: 0 })}</dd></dl>
        <div class="grafica baja mt"><canvas id="g-cc" aria-label="Aportado vs intereses"></canvas></div>
      </section>
    </div>`;
  }

  function despues(a, cont) {
    const t = G.tema(), cfg = a.estado.config;
    const b = base(a);
    const anios = Array.from({ length: 11 }, (_, i) => i);
    G.linea(cont.querySelector('#g-proy'), anios.map(y => y === 0 ? 'Hoy' : `${y} ${y === 1 ? 'año' : 'años'}`), [
      { label: 'Optimista', data: anios.map(y => Math.round(vf(b.pat, b.ahorro, cfg.escenarios.optimista, y))), color: t.series[2] },
      { label: 'Base', data: anios.map(y => Math.round(vf(b.pat, b.ahorro, b.tasa, y))), color: t.acento, area: true, alfa: 0.15 },
      { label: 'Conservador', data: anios.map(y => Math.round(vf(b.pat, b.ahorro, cfg.escenarios.conservador, y))), color: t.series[3] },
      { label: 'Base en pesos de hoy', data: anios.map(y => Math.round(Fz.aValorReal(vf(b.pat, b.ahorro, b.tasa, y), cfg.inflacion, y))), color: t.tenue, punteado: true },
    ], { leyenda: true, maxX: 11 });
    const serie = Fz.serieAhorro(calc.capital, calc.aporte, calc.tasa, calc.anios * 12, calc.cap).filter((_, i) => i % 12 === 0);
    G.linea(cont.querySelector('#g-cc'), serie.map(s => s.mes / 12 + ' a'), [
      { label: 'Aportado', data: serie.map(s => Math.round(s.aportado)), color: t.series[0], area: true, alfa: 0.3, stack: 'x' },
      { label: 'Intereses', data: serie.map(s => Math.round(s.rendimiento)), color: t.verde, area: true, fill: '-1', alfa: 0.4, stack: 'x' },
    ], { leyenda: true, apilado: true, maxX: 6 });

    const re = () => a.render(false);
    const ah = cont.querySelector('#pr-ahorro'); ah.addEventListener('change', () => { qs.ahorro = UI.numero(ah.value); re(); });
    cont.querySelectorAll('[data-escenario]').forEach(i => i.addEventListener('change', () => a.mutar(e => { e.config.escenarios[i.dataset.escenario] = UI.numero(i.value) || 0; })));
    cont.querySelectorAll('[data-qs]').forEach(i => i.addEventListener('change', () => { qs[i.dataset.qs] = UI.numero(i.value); re(); }));
    cont.querySelector('[data-qs-cat]').addEventListener('change', e => { qs.categoria = e.target.value; re(); });
    cont.querySelectorAll('[data-cc]').forEach(i => i.addEventListener('change', () => { calc[i.dataset.cc] = UI.numero(i.value) || 0; re(); }));
    cont.querySelector('[data-cc-cap]').addEventListener('change', e => { calc.cap = e.target.value; re(); });
  }

  window.App.registrar('proyecciones', { titulo: 'Proyecciones y escenarios', sub: 'A 1, 5 y 10 años, en términos nominales y reales', render, despues });
})();
