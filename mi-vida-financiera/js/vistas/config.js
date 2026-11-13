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

  /** Contenido de la tarjeta de sincronización. */
  function tarjetaSync() {
    const S = window.Sync;
    if (S.activo) {
      const c = S.config();
      const r = S.resumen();
      return `<div class="card-head"><h3>${UI.icono('refresh')}Sincronizar entre dispositivos</h3><span class="chip ${S.estado === 'error' || S.estado === 'offline' ? 'amarillo' : 'verde'}">${UI.icono(r.icono, r.girar ? 'girando' : '')}${UI.esc(r.texto)}</span></div>
        <p class="suave">Tus datos se guardan en el repositorio privado <a href="${UI.esc(c.url || `https://github.com/${c.owner}/${c.repo}`)}" target="_blank" rel="noopener"><b>${UI.esc(c.owner)}/${UI.esc(c.repo)}</b></a>. Lo que registres aquí aparece en tus otros dispositivos (y al revés) unos segundos después; cada sincronización queda en el historial del repositorio.</p>
        ${S.error ? `<div class="nota-caja aviso mt">${UI.icono('alert')}<span>${UI.esc(S.error)}</span></div>` : ''}
        <div class="fila-flex mt"><button class="btn btn-primario" data-accion="sincronizar-ahora">${UI.icono('refresh')}Sincronizar ahora</button><button class="btn btn-fantasma" data-sync-desconectar>${UI.icono('x')}Desconectar este dispositivo</button></div>
        <p class="nota mt">Para agregar otro dispositivo: abre la app ahí, ve a Configuración y conecta el mismo repositorio con el mismo token.</p>`;
    }
    const m = location.hostname.match(/^([a-z0-9-]+)\.github\.io$/i);
    return `<div class="card-head"><h3>${UI.icono('refresh')}Sincronizar entre dispositivos</h3><span class="chip">Desactivada</span></div>
      <p class="suave">Para que lo que registres en el celular aparezca en la compu (y al revés), tus datos se guardan en un <b>repositorio privado de tu GitHub</b>. Se configura una sola vez:</p>
      <ol class="pasos mt">
        <li>Crea un repositorio <b>privado</b>: <a href="https://github.com/new" target="_blank" rel="noopener">github.com/new</a> → nombre <b>mis-finanzas-datos</b> → marca <b>Private</b> → <b>Create repository</b>.</li>
        <li>Crea un token: <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">GitHub → Fine-grained token</a>. En <b>Repository access</b> elige <b>Only select repositories</b> → <b>mis-finanzas-datos</b>. En <b>Permissions</b> agrega <b>Contents → Read and write</b>. Pon una expiración (por ejemplo 1 año), genera y copia el token (empieza con <b>github_pat_</b>).</li>
        <li>Pega aquí tu usuario, el repositorio y el token, y presiona <b>Conectar</b>. Después repite este paso en tu otro dispositivo.</li>
      </ol>
      <form class="form mt" id="sync-form" autocomplete="off">
        <div class="campo tercio"><label for="sync-owner">Usuario de GitHub</label><input type="text" id="sync-owner" value="${UI.esc(m ? m[1] : '')}" placeholder="tu-usuario" autocapitalize="off" spellcheck="false"></div>
        <div class="campo tercio"><label for="sync-repo">Repositorio privado</label><input type="text" id="sync-repo" value="mis-finanzas-datos" autocapitalize="off" spellcheck="false"></div>
        <div class="campo tercio"><label for="sync-token">Token</label><input type="password" id="sync-token" placeholder="github_pat_…" autocapitalize="off" spellcheck="false"></div>
        <div class="error-form oculto" id="sync-error" role="alert"></div>
      </form>
      <div class="fila-flex mt"><button class="btn btn-primario" data-sync-conectar>${UI.icono('refresh')}Conectar</button></div>
      <p class="nota mt">El token solo da acceso a ese repositorio. Se guarda únicamente en este navegador y nunca se incluye en los respaldos JSON. Si pierdes un dispositivo, borra el token en GitHub y crea otro.</p>`;
  }

  function render(a) {
    const est = a.estado, cfg = est.config;
    return `
    <div class="grid">
      <section class="card s-12" id="sync-card">${tarjetaSync()}</section>
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
        <div class="nota-caja">${UI.icono('lock')}<span>${window.Sync.activo ? '<b>Tus datos se guardan en este navegador y en tu repositorio privado de GitHub</b> (sincronización activa).' : '<b>Nada sale de tu dispositivo.</b> Tus datos viven solo en este navegador (localStorage). Para tenerlos en el celular y en la compu activa la sincronización de arriba.'} Nunca se piden números de cuenta ni de tarjeta (solo los últimos 4 dígitos, opcional).</span></div>
        <dl class="dl mt"><dt>Último respaldo</dt><dd>${cfg.ultimoRespaldo ? F.fecha(cfg.ultimoRespaldo.slice(0, 10), 'media') + (a.diasDesdeRespaldo() === 0 ? ' (hoy)' : ` (hace ${a.diasDesdeRespaldo()} días)`) : 'Nunca'}</dd><dt>Cuentas · movimientos</dt><dd>${est.cuentas.length} · ${est.movimientos.length + est.flujosApartado.length}</dd></dl>
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

  function montarSync(a) {
    const card = document.getElementById('sync-card');
    if (!card) return;
    UI.pintarIconos(card);
    const btn = card.querySelector('[data-sync-conectar]');
    if (btn) btn.addEventListener('click', async () => {
      const err = card.querySelector('#sync-error');
      const datos = { owner: card.querySelector('#sync-owner').value, repo: card.querySelector('#sync-repo').value, token: card.querySelector('#sync-token').value };
      if (!datos.owner.trim() || !datos.repo.trim() || !datos.token.trim()) { err.textContent = 'Llena usuario, repositorio y token.'; err.classList.remove('oculto'); return; }
      btn.disabled = true; btn.innerHTML = `${UI.icono('refresh', 'girando')}Conectando…`;
      try {
        const ok = await window.Sync.conectar(datos);
        if (ok) UI.toast('¡Listo! Este dispositivo ya está sincronizado.');
        a.render(false);
      } catch (e) {
        err.textContent = e.message || String(e); err.classList.remove('oculto');
        btn.disabled = false; btn.innerHTML = `${UI.icono('refresh')}Conectar`;
      }
    });
    const des = card.querySelector('[data-sync-desconectar]');
    if (des) des.addEventListener('click', async () => {
      const ok = await UI.confirmar({ titulo: 'Desconectar este dispositivo', mensaje: 'Este dispositivo dejará de sincronizar. Tus datos se quedan aquí y en GitHub; el token se borra de este navegador.', textoOk: 'Desconectar' });
      if (ok) { window.Sync.desconectar(); a.render(false); UI.toast('Sincronización desactivada en este dispositivo.'); }
    });
  }

  /** Actualiza solo la tarjeta de sincronización (sin repintar toda la vista). */
  window.VistaConfig = {
    pintarSync() {
      const a = window.App;
      const card = document.getElementById('sync-card');
      if (!card || a.ruta !== 'config' || card.querySelector('#sync-token:focus, #sync-owner:focus, #sync-repo:focus') || (card.querySelector('[data-sync-conectar]') && card.querySelector('[data-sync-conectar]').disabled)) return;
      card.innerHTML = tarjetaSync();
      montarSync(a);
    },
  };

  function despues(a, cont) {
    montarSync(a);
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
