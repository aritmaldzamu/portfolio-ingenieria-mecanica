/* =====================================================================
 * comando.js — Barra de "registro rápido": escribes en español natural,
 * se interpreta localmente (parser.js) y se muestra una vista previa
 * para confirmar. Si falta algo, abre el formulario prellenado.
 * ===================================================================== */
(function () {
  'use strict';
  const { Parser: P, Formato: F, Motor: M, Estado: E, UI } = window;
  const A = () => window.App;

  const EJEMPLOS = ['metí 10000 a revolut al 9% para coche', 'gasté 350 en comida con nu', 'me pagaron 12,500 de sueldo', 'pasa 2000 de nu a cetes', 'nu ahora da 7.5%', 'ayer mis papás pagaron 900 de súper'];
  const TITULOS = { gasto: ['Gasto', 'arrowUp', 'var(--red)'], ingreso: ['Ingreso', 'arrowDown', 'var(--green)'], transferencia: ['Transferencia entre cuentas', 'swap', 'var(--blue)'], deposito: ['Depósito a apartado', 'layers', 'var(--accent)'], retiro: ['Retiro de apartado', 'layers', 'var(--yellow)'], traspaso: ['Mover entre apartados', 'layers', 'var(--accent)'], tasa: ['Cambio de tasa', 'percent', 'var(--yellow)'] };

  /** Completa datos que el parser no sabe (cuenta de un apartado, tasa vigente…). */
  function completar(r) {
    const app = A();
    r = { ...r, supuestos: [...r.supuestos] };
    if ((r.tipo === 'retiro' || r.tipo === 'traspaso') && r.apartadoId && !r.cuentaId) {
      r.cuentaId = window.Forms.cuentaPrincipalApartado(r.apartadoId);
      if (r.cuentaId) r.supuestos.push('cuenta'); else r.faltantes = [...r.faltantes, 'cuenta'];
    }
    if (r.tipo === 'deposito' && !r.cuentaId && r.apartadoId) {
      r.cuentaId = window.Forms.cuentaPrincipalApartado(r.apartadoId);
      if (r.cuentaId) { r.faltantes = r.faltantes.filter(f => f !== 'cuenta'); r.supuestos.push('cuenta'); }
    }
    if (r.tipo === 'deposito' && r.cuentaId && r.tasa == null) { r.tasa = Math.round((app.calc.cuentas[r.cuentaId] || {}).tasaBruta * 100) / 100 || 0; r.tasaSupuesta = true; }
    if (r.tipo === 'deposito' && r.origen === r.cuentaId) r.origen = 'externo';
    if (r.tipo === 'traspaso' && r.cuentaId) {
      const ca = app.calc.apartados[r.apartadoId];
      if (ca && (ca.porCuenta[r.cuentaId] || 0) < (r.monto || 0) - 0.01) r.faltantes = [...r.faltantes, 'saldo suficiente en el apartado'];
    }
    r.completo = !!r.tipo && r.faltantes.length === 0;
    return r;
  }

  function campo(nombre, valor, supuesto) {
    return `<div class="vp-campo ${supuesto ? 'supuesto' : ''}">${nombre}<b>${valor}</b></div>`;
  }

  function vistaPrevia(r) {
    const app = A();
    if (!r.texto) return `<div class="nota">Escribe como le dirías a un amigo. Se interpreta aquí mismo, sin internet ni IA.</div>
      <div class="ejemplos">${EJEMPLOS.map(e => `<button type="button" data-ejemplo="${UI.esc(e)}">${UI.esc(e)}</button>`).join('')}</div>`;
    if (!r.tipo) return `<div class="nota-caja">${UI.icono('info')}<span>No entendí qué tipo de movimiento es. Prueba con verbos como <b>gasté</b>, <b>me pagaron</b>, <b>metí</b>, <b>pasa</b> o <b>ahora da</b>. Presiona <kbd>Enter</kbd> para abrir el formulario.</span></div>`;
    const [titulo, ico, color] = TITULOS[r.tipo];
    const sup = k => r.supuestos.includes(k);
    const cat = app.categoria(r.categoriaId), ap = app.apartado(r.apartadoId), apd = app.apartado(r.apartadoDestinoId);
    const campos = [];
    if (r.monto != null) campos.push(campo('Monto', `<span class="monto">${F.dinero(r.monto)}</span>`));
    if (r.tipo !== 'tasa') campos.push(campo('Fecha', F.fecha(r.fecha, 'media')));
    if (r.tipo === 'gasto' || r.tipo === 'ingreso') { campos.push(campo('Categoría', cat ? UI.esc(cat.nombre) : '—', sup('categoría'))); campos.push(campo('Cuenta', r.cuentaId ? UI.esc(app.nombreCuenta(r.cuentaId)) : 'Ninguna', sup('cuenta'))); }
    if (r.tipo === 'gasto' && r.papas) campos.push(campo('Mis papás pagan', r.papas + ' %'));
    if (r.tipo === 'transferencia') { campos.push(campo('De', r.cuentaId ? UI.esc(app.nombreCuenta(r.cuentaId)) : '?', sup('cuenta origen'))); campos.push(campo('A', r.cuentaDestinoId ? UI.esc(app.nombreCuenta(r.cuentaDestinoId)) : '?')); }
    if (r.tipo === 'deposito') {
      campos.push(campo('Cuenta', r.cuentaId ? UI.esc(app.nombreCuenta(r.cuentaId)) : '?', sup('cuenta')));
      campos.push(campo('Apartado', ap ? UI.esc(ap.nombre) : 'Sin apartado', sup('sin apartado')));
      campos.push(campo('Tasa', r.tasa != null ? F.pct(r.tasa) : '—', r.tasaSupuesta));
      campos.push(campo('Origen', r.origen === 'externo' ? 'Dinero nuevo' : UI.esc(app.nombreCuenta(r.origen)), sup('origen del dinero')));
    }
    if (r.tipo === 'retiro' || r.tipo === 'traspaso') { campos.push(campo('Apartado', ap ? UI.esc(ap.nombre) : '?')); campos.push(campo('Cuenta', r.cuentaId ? UI.esc(app.nombreCuenta(r.cuentaId)) : '?', sup('cuenta'))); }
    if (r.tipo === 'traspaso') campos.push(campo('Hacia', apd ? UI.esc(apd.nombre) : '?'));
    if (r.tipo === 'tasa') {
      const cc = app.calc.cuentas[r.cuentaId];
      campos.push(campo('Cuenta', r.cuentaId ? UI.esc(app.nombreCuenta(r.cuentaId)) : '?'));
      campos.push(campo('Tasa anterior', cc ? F.pct(cc.tasaBruta) : '—'));
      campos.push(campo('Tasa nueva', r.tasa != null ? F.pct(r.tasa) : '?'));
      campos.push(campo('Vigente desde', F.fecha(r.fecha, 'media')));
    }
    if (r.nota) campos.push(campo('Nota', UI.esc(r.nota)));
    let extra = '';
    if (r.tipo === 'deposito' && r.cuentaId && r.monto) {
      const c = app.cuenta(r.cuentaId);
      const neta = M.netaDe(c, r.tasa || 0, app.estado.config);
      const rr = window.Finanzas.rendimientos(r.monto, neta, M.capDe(c), c.plazo);
      extra = `<div class="mensaje">${UI.icono('sparkles')}<span>Te generará ~<strong>${F.dinero(rr.mensual)}</strong> al mes y <strong>${F.dinero(rr.anual, { dec: 0 })}</strong> al año${ap ? ` para <strong>${UI.esc(ap.nombre)}</strong>` : ''}.</span></div>`;
      const actual = (app.calc.cuentas[r.cuentaId] || {}).tasaBruta || 0;
      if (Math.abs((r.tasa || 0) - actual) > 0.001 && !r.tasaSupuesta) extra += `<div class="nota">También se actualizará la tasa de ${UI.esc(c.nombre)} de ${F.pct(actual)} a ${F.pct(r.tasa)} desde esta fecha.</div>`;
    }
    const faltan = r.faltantes.length ? `<div class="nota-caja aviso">${UI.icono('alert')}<span>Falta: <b>${r.faltantes.join(', ')}</b>. Presiona <kbd>Enter</kbd> para completarlo en el formulario.</span></div>` : '';
    return `<div class="vista-previa">
      <div class="vp-cab">${UI.burbuja(ico, color, 'sm')}<b>${titulo}</b>${r.completo ? '<span class="chip verde" style="margin-left:auto">Listo para guardar</span>' : ''}</div>
      <div class="vp-campos">${campos.join('')}</div>
      ${extra}
    </div>${faltan}
    <div class="entre"><span class="nota">${r.completo ? '<kbd>Enter</kbd> guarda · ' : ''}<kbd>Esc</kbd> cierra</span>
      <div class="fila-flex"><button class="btn btn-sm" type="button" data-formulario>${UI.icono('edit')}Editar en formulario</button>${r.completo ? `<button class="btn btn-sm btn-primario" type="button" data-confirmar>${UI.icono('check')}Guardar</button>` : ''}</div></div>`;
  }

  /** Abre el formulario normal prellenado con lo detectado. */
  function abrirFormulario(r) {
    const F2 = window.Forms;
    if (r.tipo === 'tasa' && r.cuentaId) return F2.tasa(r.cuentaId, r.tasa);
    if (['deposito', 'retiro', 'traspaso'].includes(r.tipo)) return F2.deposito({ tipo: r.tipo, monto: r.monto, fecha: r.fecha, cuentaId: r.cuentaId, apartadoId: r.apartadoId, apartadoDestinoId: r.apartadoDestinoId, tasa: r.tasa, origen: r.origen, nota: r.nota });
    return F2.movimiento({ tipo: r.tipo === 'ingreso' ? 'ingreso' : r.tipo === 'transferencia' ? 'transferencia' : 'gasto', monto: r.monto, fecha: r.fecha, categoriaId: r.categoriaId, cuentaId: r.cuentaId, cuentaDestinoId: r.cuentaDestinoId, papas: r.papas, nota: r.nota });
  }

  /** Guarda directamente un resultado completo. */
  function guardar(r) {
    const app = A();
    if (r.tipo === 'tasa') {
      app.mutar(est => {
        const c = est.cuentas.find(k => k.id === r.cuentaId);
        const e = c.historialTasas[c.historialTasas.length - 1];
        const tramos = e ? JSON.parse(JSON.stringify(e.tramos)) : [{ hasta: null, tasa: r.tasa }];
        tramos[0].tasa = r.tasa;
        const mismo = c.historialTasas.find(h => h.fecha === r.fecha);
        if (mismo) mismo.tramos = tramos; else c.historialTasas.push({ fecha: r.fecha, tramos, promo: null, creado: E.marca() });
        c.historialTasas.sort((a, b) => a.fecha.localeCompare(b.fecha));
      }, `Tasa de ${app.nombreCuenta(r.cuentaId)} actualizada a ${F.pct(r.tasa)}`);
      return;
    }
    if (['deposito', 'retiro', 'traspaso'].includes(r.tipo)) {
      app.mutar(est => {
        const base = { id: E.nuevoId('flu'), fecha: r.fecha, tipo: r.tipo, monto: r.monto, cuentaId: r.cuentaId, nota: r.nota || '', creado: E.marca() };
        if (r.tipo === 'deposito') {
          est.flujosApartado.push({ ...base, apartadoId: r.apartadoId || null, tasa: r.tasa, origen: r.origen || 'externo' });
          const c = est.cuentas.find(k => k.id === r.cuentaId);
          const actual = (app.calc.cuentas[r.cuentaId] || {}).tasaBruta || 0;
          if (!r.tasaSupuesta && Math.abs((r.tasa || 0) - actual) > 0.001 && c) {
            const e = c.historialTasas[c.historialTasas.length - 1];
            const tramos = e ? JSON.parse(JSON.stringify(e.tramos)) : [{ hasta: null, tasa: r.tasa }];
            tramos[0].tasa = r.tasa;
            const mismo = c.historialTasas.find(h => h.fecha === r.fecha);
            if (mismo) mismo.tramos = tramos; else c.historialTasas.push({ fecha: r.fecha, tramos, promo: null, creado: E.marca() });
            c.historialTasas.sort((a, b) => a.fecha.localeCompare(b.fecha));
          }
        } else if (r.tipo === 'retiro') est.flujosApartado.push({ ...base, apartadoId: r.apartadoId, destino: r.destino || 'liberar' });
        else est.flujosApartado.push({ ...base, apartadoId: r.apartadoId, apartadoDestinoId: r.apartadoDestinoId, cuentaDestinoId: r.cuentaId, tasa: null });
      }, r.tipo === 'deposito' ? `Depósito de ${F.dinero(r.monto)} registrado` : r.tipo === 'retiro' ? 'Retiro registrado' : 'Dinero movido entre apartados');
      return;
    }
    app.mutar(est => {
      est.movimientos.push({ id: E.nuevoId('mov'), fecha: r.fecha, tipo: r.tipo, monto: r.monto, categoriaId: r.tipo === 'transferencia' ? null : r.categoriaId, cuentaId: r.cuentaId || null, cuentaDestinoId: r.tipo === 'transferencia' ? r.cuentaDestinoId : null, nota: r.nota || '', papas: r.tipo === 'gasto' ? (r.papas || 0) : 0, creado: E.marca() });
    }, r.tipo === 'gasto' ? `Gasto de ${F.dinero(r.monto)} registrado` : r.tipo === 'ingreso' ? `Ingreso de ${F.dinero(r.monto)} registrado` : 'Transferencia registrada');
  }

  function abrir(textoInicial) {
    const app = A();
    if (!app.estado.cuentas.length) { UI.toast('Primero agrega una cuenta o carga los datos de ejemplo.', { error: true }); return; }
    const capa = document.createElement('div');
    capa.className = 'capa comando';
    capa.innerHTML = `<div class="comando-panel" role="dialog" aria-modal="true" aria-label="Registro rápido">
      <form class="comando-input">${UI.icono('sparkles')}<input type="text" placeholder="Ej. gasté 350 en comida con nu" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Escribe un movimiento"><button type="button" class="btn-icono sm" data-x aria-label="Cerrar">${UI.icono('x')}</button></form>
      <div class="comando-cuerpo"></div>
    </div>`;
    document.getElementById('capa-modales').appendChild(capa);
    const input = capa.querySelector('input');
    const cuerpo = capa.querySelector('.comando-cuerpo');
    let actual = null;
    const cerrar = () => { capa.remove(); document.removeEventListener('keydown', teclas, true); };
    const actualizar = () => {
      const r = P.interpretar(input.value, { cuentas: app.estado.cuentas, apartados: app.estado.apartados, categorias: app.estado.categorias, hoy: app.hoy, cuentaPrincipalId: app.estado.config.cuentaPrincipalId });
      actual = input.value.trim() ? completar(r) : { texto: '' };
      cuerpo.innerHTML = vistaPrevia(actual);
    };
    const enviar = () => {
      if (!actual || !actual.texto) return;
      cerrar();
      if (actual.completo) guardar(actual); else abrirFormulario(actual);
    };
    const teclas = e => { if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); cerrar(); } };
    document.addEventListener('keydown', teclas, true);
    input.addEventListener('input', actualizar);
    capa.querySelector('form').addEventListener('submit', e => { e.preventDefault(); enviar(); });
    capa.querySelector('[data-x]').addEventListener('click', cerrar);
    capa.addEventListener('mousedown', e => { if (e.target === capa) cerrar(); });
    cuerpo.addEventListener('click', e => {
      const ej = e.target.closest('[data-ejemplo]');
      if (ej) { input.value = ej.dataset.ejemplo; actualizar(); input.focus(); return; }
      if (e.target.closest('[data-confirmar]')) { enviar(); return; }
      if (e.target.closest('[data-formulario]')) { cerrar(); abrirFormulario(actual); }
    });
    input.value = textoInicial || '';
    actualizar();
    setTimeout(() => input.focus(), 20);
  }

  window.Comando = { abrir, completar, EJEMPLOS };
})();
