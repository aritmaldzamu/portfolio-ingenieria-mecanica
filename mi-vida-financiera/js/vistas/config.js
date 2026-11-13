/* =====================================================================
 * Vista: Configuración — perfil, parámetros económicos, tablas,
 * categorías, instituciones y respaldo.
 * ===================================================================== */
(function () {
  'use strict';
  const { Motor: M, Formato: F, UI, Estado: E } = window;

  /** Parámetro económico con nota "actualiza este valor" y fecha. */
  function parametro(cfg, k, etiqueta, suf, ayuda, step) {
    const fk = { inflacion: 'inflacionFecha', umaDiaria: 'umaFecha', retencionISR: 'retencionFecha', tasaReferencia: 'tasaReferenciaFecha' }[k];
    return `<div class="campo mitad">
      <label for="cfg-${k}">${etiqueta}</label>
      <div class="${suf === '$' ? 'input-pre' : 'input-suf'}">${suf === '$' ? '<span>$</span>' : ''}<input type="number" step="${step || 0.01}" id="cfg-${k}" data-cfg-num="${k}" value="${cfg[k]}">${suf !== '$' ? `<span>${suf}</span>` : ''}</div>
      <span class="ayuda">${ayuda} · <span class="etiqueta-verifica" style="font-size:10.5px;padding:1px 6px">actualiza este valor</span> · última actualización: ${F.fecha(cfg[fk], 'media')}</span>
    </div>`;
  }

  function render(a) {
    const est = a.estado, cfg = est.config;
    return `
    <div class="grid">
      <section class="card s-6">
        <div class="card-head"><h3>${UI.icono('settings')}General</h3></div>
        <div class="form">
          <div class="campo mitad"><label for="cfg-nombre">Tu nombre</label><input type="text" id="cfg-nombre" data-cfg-txt="nombre" value="${UI.esc(cfg.nombre)}" placeholder="Para saludarte"></div>
          <div class="campo mitad"><label for="cfg-moneda">Moneda</label><select id="cfg-moneda" data-cfg-txt="moneda">${[['MXN', 'Peso mexicano (MXN)'], ['USD', 'Dólar (USD)'], ['EUR', 'Euro (EUR)']].map(([v, l]) => `<option value="${v}" ${cfg.moneda === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
          <div class="campo mitad"><label for="cfg-tema">Tema</label><select id="cfg-tema" data-cfg-txt="tema"><option value="oscuro" ${cfg.tema !== 'claro' ? 'selected' : ''}>Oscuro</option><option value="claro" ${cfg.tema === 'claro' ? 'selected' : ''}>Claro</option></select></div>
          <div class="campo mitad"><label for="cfg-mes">Mes de inicio de tu año financiero</label><select id="cfg-mes" data-cfg-num="mesInicio">${F.MESES.map((m, i) => `<option value="${i + 1}" ${Number(cfg.mesInicio) === i + 1 ? 'selected' : ''}>${m}</option>`).join('')}</select></div>
          <div class="campo mitad"><label for="cfg-edad">Edad</label><input type="number" id="cfg-edad" data-cfg-num="edad" value="${cfg.edad}"></div>
          <div class="campo mitad"><label for="cfg-principal">Cuenta principal (donde cae tu sueldo)</label><select id="cfg-principal" data-cfg-txt="cuentaPrincipalId"><option value="">— Ninguna —</option>${a.opCuentas(c => !M.esDeuda(c)).map(o => `<option value="${o.v}" ${cfg.cuentaPrincipalId === o.v ? 'selected' : ''}>${UI.esc(o.l)}</option>`).join('')}</select></div>
          <div class="campo mitad"><label for="cfg-fondo">Meses del fondo de emergencia</label><select id="cfg-fondo" data-cfg-num="fondoMeses">${[3, 4, 5, 6].map(n => `<option value="${n}" ${Number(cfg.fondoMeses) === n ? 'selected' : ''}>${n} meses</option>`).join('')}</select></div>
        </div>
      </section>

      <section class="card s-6">
        <div class="card-head"><h3>${UI.icono('lock')}Respaldo y privacidad</h3></div>
        <div class="nota-caja">${UI.icono('lock')}<span><b>Nada sale de tu dispositivo.</b> Tus datos viven solo en este navegador (localStorage). Nunca se piden números de cuenta ni de tarjeta (solo los últimos 4 dígitos, opcional). Para pasar tus datos del celular a la computadora: exporta el JSON aquí e impórtalo allá.</span></div>
        <dl class="dl mt"><dt>Último respaldo</dt><dd>${cfg.ultimoRespaldo ? F.fecha(cfg.ultimoRespaldo.slice(0, 10), 'media') + ` (hace ${a.diasDesdeRespaldo()} días)` : 'Nunca'}</dd><dt>Cuentas · movimientos</dt><dd>${est.cuentas.length} · ${est.movimientos.length + est.flujosApartado.length}</dd></dl>
        <div class="fila-flex mt"><button class="btn btn-primario" data-accion="exportar-json">${UI.icono('download')}Exportar todo (JSON)</button><button class="btn" data-accion="importar-json">${UI.icono('upload')}Importar JSON</button><button class="btn" data-accion="exportar-csv">${UI.icono('file')}Movimientos a CSV</button></div>
        <div class="divisor"></div>
        <div class="fila-flex"><button class="btn" data-accion="cargar-demo">${UI.icono('sparkles')}Cargar datos de ejemplo</button><button class="btn btn-peligro" data-accion="borrar-todo">${UI.icono('trash')}Borrar todo</button></div>
      </section>

      <section class="card s-12">
        <div class="card-head"><h3>${UI.icono('percent')}Parámetros económicos</h3><span class="sub">Cambian cada año: verifica en Banxico, INEGI y el SAT</span></div>
        <div class="form">
          ${parametro(cfg, 'inflacion', 'Inflación anual esperada', '%', 'Para GAT real y proyecciones en pesos de hoy')}
          ${parametro(cfg, 'umaDiaria', 'Valor diario de la UMA', '$', `Anual: ${F.dinero(cfg.umaDiaria * 365)} · tope PPR 5 UMA: ${F.dinero(cfg.umaDiaria * 365 * 5, { dec: 0 })}`)}
          ${parametro(cfg, 'retencionISR', 'Retención de ISR sobre intereses', '%', 'Tasa anual sobre el capital (LIF del año)', 0.001)}
          ${parametro(cfg, 'tasaReferencia', 'Tasa de referencia (Banxico / Cetes)', '%', 'Para comparar tus cuentas')}
        </div>
      </section>

      <section class="card s-7">
        <div class="card-head"><h3>${UI.icono('receipt')}Tabla del ISR anual</h3><span class="sub">${F.fecha(cfg.tablaISRFecha, 'media')} · <span class="etiqueta-verifica" style="font-size:10.5px;padding:1px 6px">actualiza este valor</span></span></div>
        <div class="tabla-wrap"><table class="tabla"><thead><tr><th>Límite inferior</th><th>Cuota fija</th><th>% excedente</th></tr></thead><tbody>
          ${cfg.tablaISR.map((f, i) => `<tr><td><input type="number" step="0.01" data-isr="${i}" data-k="li" value="${f.li}" style="min-height:32px;padding:4px 8px"></td><td><input type="number" step="0.01" data-isr="${i}" data-k="cuota" value="${f.cuota}" style="min-height:32px;padding:4px 8px"></td><td><input type="number" step="0.01" data-isr="${i}" data-k="pct" value="${f.pct}" style="min-height:32px;padding:4px 8px"></td></tr>`).join('')}
        </tbody></table></div>
        <div class="fila-flex mt"><button class="btn btn-sm btn-fantasma" data-isr-restaurar>${UI.icono('refresh')}Restaurar tabla 2025</button><span class="nota">La tabla mensual se calcula dividiendo entre 12.</span></div>
      </section>
      <section class="card s-5">
        <div class="card-head"><h3>${UI.icono('calculator')}Nómina (estimación)</h3></div>
        <div class="form">
          <div class="campo mitad m-mitad"><label>IMSS obrero</label><div class="input-suf"><input type="number" step="0.001" data-cfg-num="imssPct" value="${cfg.imssPct}"><span>%</span></div></div>
          <div class="campo mitad m-mitad"><label>IMSS excedente 3 UMA</label><div class="input-suf"><input type="number" step="0.01" data-cfg-num="imssExcedentePct" value="${cfg.imssExcedentePct}"><span>%</span></div></div>
          <div class="campo mitad m-mitad"><label>Factor de integración</label><input type="number" step="0.0001" data-cfg-num="factorIntegracion" value="${cfg.factorIntegracion}"></div>
          <div class="campo mitad m-mitad"><label>Subsidio al empleo (% UMA mensual)</label><div class="input-suf"><input type="number" step="0.01" data-cfg-num="subsidioPct" value="${cfg.subsidioPct}"><span>%</span></div></div>
          <div class="campo"><label>Tope de ingreso para subsidio</label><div class="input-pre"><span>$</span><input type="number" step="1" data-cfg-num="subsidioTope" value="${cfg.subsidioTope}"></div></div>
        </div>
        <div class="card-head mt"><h3>${UI.icono('chart')}Escenarios de proyección</h3></div>
        <div class="form">${['conservador', 'base', 'optimista'].map(k => `<div class="campo tercio m-mitad"><label style="text-transform:capitalize">${k}</label><div class="input-suf"><input type="number" step="0.1" data-esc="${k}" value="${cfg.escenarios[k]}"><span>%</span></div></div>`).join('')}</div>
      </section>

      <section class="card s-6">
        <div class="card-head"><h3>${UI.icono('tag')}Categorías</h3><button class="btn btn-sm" data-accion="nueva-categoria">${UI.icono('plus')}Nueva</button></div>
        <div class="lista">${est.categorias.map(c => `<div class="fila clic" data-accion="editar-categoria" data-id="${c.id}">${UI.burbuja(c.icono, c.color, 'sm')}<div class="fila-txt"><div class="fila-titulo">${UI.esc(c.nombre)}</div><div class="fila-sub">${c.tipo === 'ingreso' ? 'Ingreso' : { necesidad: 'Necesidad', deseo: 'Deseo', ahorro: 'Ahorro' }[c.grupo] || ''}</div></div>${UI.icono('chevronRight')}</div>`).join('')}</div>
      </section>
      <div class="s-6 pila">
        <section class="card">
          <div class="card-head"><h3>${UI.icono('landmark')}Instituciones</h3></div>
          <div class="fila-flex" style="gap:6px">${est.instituciones.map((i, k) => `<span class="chip" style="padding:4px 6px 4px 10px">${UI.esc(i)}<button class="btn-icono sm" style="width:20px;height:20px" data-quitar-inst="${k}" aria-label="Quitar ${UI.esc(i)}">${UI.icono('x', 'ico-sm')}</button></span>`).join('')}</div>
          <div class="fila-flex mt" style="flex-wrap:nowrap"><input type="text" id="nueva-inst" placeholder="Agregar institución"><button class="btn" data-agregar-inst>${UI.icono('plus')}Agregar</button></div>
        </section>
        <section class="card">
          <div class="card-head"><h3>${UI.icono('wallet')}Cuentas</h3><button class="btn btn-sm" data-accion="nueva-cuenta">${UI.icono('plus')}Nueva</button></div>
          <div class="lista">${est.cuentas.map(c => `<div class="fila clic" data-accion="editar-cuenta" data-id="${c.id}">${UI.burbuja(M.TIPOS_CUENTA[c.tipo].icono, c.color, 'sm')}<div class="fila-txt"><div class="fila-titulo">${UI.esc(c.nombre)}${c.archivada ? ' <span class="chip">archivada</span>' : ''}</div><div class="fila-sub">${UI.esc(c.institucion)} · ${M.TIPOS_CUENTA[c.tipo].nombre}</div></div>${UI.icono('chevronRight')}</div>`).join('') || '<p class="nota">Sin cuentas.</p>'}</div>
        </section>
      </div>
    </div>`;
  }

  function despues(a, cont) {
    const fechas = { inflacion: 'inflacionFecha', umaDiaria: 'umaFecha', retencionISR: 'retencionFecha', tasaReferencia: 'tasaReferenciaFecha' };
    cont.querySelectorAll('[data-cfg-num]').forEach(i => i.addEventListener('change', () => a.mutar(e => {
      const k = i.dataset.cfgNum; e.config[k] = Number(i.value) || 0;
      if (fechas[k]) e.config[fechas[k]] = a.hoy;
    }, 'Configuración guardada', { deshacer: false })));
    cont.querySelectorAll('[data-cfg-txt]').forEach(i => i.addEventListener('change', () => {
      a.mutar(e => { e.config[i.dataset.cfgTxt] = i.value || (i.dataset.cfgTxt === 'cuentaPrincipalId' ? null : ''); }, 'Configuración guardada', { deshacer: false });
      if (i.dataset.cfgTxt === 'moneda') { F.setMoneda(i.value); a.render(false); }
    }));
    cont.querySelectorAll('[data-esc]').forEach(i => i.addEventListener('change', () => a.mutar(e => { e.config.escenarios[i.dataset.esc] = Number(i.value) || 0; }, 'Escenario guardado', { deshacer: false })));
    cont.querySelectorAll('[data-isr]').forEach(i => i.addEventListener('change', () => a.mutar(e => { e.config.tablaISR[+i.dataset.isr][i.dataset.k] = Number(i.value) || 0; e.config.tablaISRFecha = a.hoy; }, 'Tabla del ISR actualizada', { deshacer: false })));
    cont.querySelector('[data-isr-restaurar]').addEventListener('click', () => a.mutar(e => { e.config.tablaISR = E.TABLA_ISR_2025.map(f => ({ ...f })); e.config.tablaISRFecha = '2025-01-01'; }, 'Tabla restaurada'));
    cont.querySelectorAll('[data-quitar-inst]').forEach(b => b.addEventListener('click', () => a.mutar(e => { e.instituciones.splice(+b.dataset.quitarInst, 1); })));
    const ni = cont.querySelector('#nueva-inst');
    const agregar = () => { const v = ni.value.trim(); if (v && !a.estado.instituciones.includes(v)) a.mutar(e => { e.instituciones.push(v); }, 'Institución agregada', { deshacer: false }); };
    cont.querySelector('[data-agregar-inst]').addEventListener('click', agregar);
    ni.addEventListener('keydown', e => { if (e.key === 'Enter') agregar(); });
  }

  window.App.registrar('config', { titulo: 'Configuración', sub: 'Perfil, parámetros económicos, categorías y respaldo', render, despues });
})();
