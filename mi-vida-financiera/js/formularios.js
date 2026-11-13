/* =====================================================================
 * formularios.js — Formularios de alta/edición de todas las entidades:
 * cuentas, saldos, tasas, apartados, depósitos, movimientos,
 * recurrentes, metas, categorías, opciones del comparador e ingresos.
 * ===================================================================== */
(function () {
  'use strict';
  const { Motor: M, Estado: E, Formato: F, Finanzas: Fz, UI } = window;
  const A = () => window.App;
  const ETQ_VERIFICA = `<span class="etiqueta-verifica">${UI.icono('alert', 'ico-sm')}verifica la tasa actual en la app</span>`;

  /* ---------- Plantillas de cuentas (tasas de EJEMPLO) ---------- */
  const PLANTILLAS = [
    { k: 'nu', nombre: 'Nu Cajitas', institucion: 'Nu México', tipo: 'rendimiento', color: '#a855f7', tramos: [{ hasta: 25000, tasa: 7.25 }, { hasta: null, tasa: 5.5 }], cap: 'diaria' },
    { k: 'revolut', nombre: 'Revolut', institucion: 'Revolut', tipo: 'rendimiento', color: '#0ea5e9', tramos: [{ hasta: null, tasa: 7.25 }], cap: 'diaria' },
    { k: 'mp', nombre: 'Mercado Pago', institucion: 'Mercado Pago', tipo: 'rendimiento', color: '#38bdf8', tramos: [{ hasta: 25000, tasa: 7.0 }, { hasta: null, tasa: 0 }], cap: 'diaria' },
    { k: 'openbank', nombre: 'Openbank', institucion: 'Openbank', tipo: 'rendimiento', color: '#ef4444', tramos: [{ hasta: null, tasa: 6.5 }], cap: 'diaria' },
    { k: 'cetes', nombre: 'Cetes 28 días', institucion: 'Cetesdirecto', tipo: 'cetes', color: '#10b981', tramos: [{ hasta: null, tasa: 7.05 }], cap: 'vencimiento', plazo: 28 },
    { k: 'gbm', nombre: 'GBM fondo', institucion: 'GBM', tipo: 'inversion', color: '#6366f1', tramos: [{ hasta: null, tasa: 6.8 }], cap: 'diaria' },
    { k: 'ppr', nombre: 'Mi PPR', institucion: 'Otra', tipo: 'ppr', color: '#f59e0b', tramos: [{ hasta: null, tasa: 9 }], cap: 'mensual', aplicaISR: false },
    { k: 'afore', nombre: 'Mi Afore', institucion: 'Afore', tipo: 'afore', color: '#f59e0b', tramos: [{ hasta: null, tasa: 8 }], cap: 'mensual', aplicaISR: false },
    { k: 'debito', nombre: 'Cuenta de nómina', institucion: 'BBVA', tipo: 'debito', color: '#3b82f6', tramos: [{ hasta: null, tasa: 0 }], cap: 'ninguna', aplicaISR: false },
    { k: 'efectivo', nombre: 'Efectivo', institucion: 'Efectivo', tipo: 'efectivo', color: '#84cc16', tramos: [{ hasta: null, tasa: 0 }], cap: 'ninguna', aplicaISR: false },
    { k: 'credito', nombre: 'Tarjeta de crédito', institucion: 'Otra', tipo: 'credito', color: '#c026d3', cap: 'ninguna', aplicaISR: false },
    { k: 'prestamo', nombre: 'Préstamo', institucion: 'Otra', tipo: 'prestamo', color: '#ef4444', cap: 'mensual', aplicaISR: false },
  ];

  const opTipos = Object.entries(M.TIPOS_CUENTA).map(([v, t]) => ({ v, l: t.nombre }));
  const opInst = () => A().estado.instituciones.map(i => ({ v: i, l: i }));
  const rinde = t => !['credito', 'prestamo', 'efectivo'].includes(t);
  const opFrecuencias = [{ v: 'mensual', l: 'Mensual' }, { v: 'quincenal', l: 'Quincenal (15 y último)' }, { v: 'semanal', l: 'Semanal' }, { v: 'anual', l: 'Anual' }];

  /** Elegir plantilla antes de crear una cuenta. */
  function nuevaCuenta() {
    const md = UI.modal({
      titulo: 'Nueva cuenta', subtitulo: 'Elige una plantilla; las tasas son ejemplos editables.', icono: 'wallet', ancho: 'ancho',
      cuerpo: `<div class="tarjetas" style="grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px">${PLANTILLAS.map(p => `
        <button class="card card-sm" data-plantilla="${p.k}" style="text-align:left;cursor:pointer">
          ${UI.burbuja(M.TIPOS_CUENTA[p.tipo].icono, p.color, 'sm')}
          <div style="font-weight:600;margin-top:10px">${UI.esc(p.nombre)}</div>
          <div class="fila-sub">${p.tramos && p.tramos[0].tasa ? 'Ej. ' + F.pct(p.tramos[0].tasa, 2) + ' anual' : M.TIPOS_CUENTA[p.tipo].nombre}</div>
        </button>`).join('')}
        <button class="card card-sm" data-plantilla="" style="text-align:left;cursor:pointer">${UI.burbuja('plus', 'var(--text-3)', 'sm')}<div style="font-weight:600;margin-top:10px">Otra</div><div class="fila-sub">Desde cero</div></button>
      </div>`,
      alMontar(el, api) {
        el.querySelectorAll('[data-plantilla]').forEach(b => b.addEventListener('click', () => { api.cerrar(); cuenta(null, PLANTILLAS.find(p => p.k === b.dataset.plantilla)); }));
      },
    });
    void md;
  }

  /** Alta / edición de cuenta. */
  function cuenta(id, plantilla) {
    const app = A();
    const c = id ? app.cuenta(id) : null;
    const p = plantilla || {};
    const e = c ? (c.historialTasas[c.historialTasas.length - 1] || {}) : {};
    const v = c ? {
      nombre: c.nombre, institucion: c.institucion, tipo: c.tipo, color: c.color, icono: c.icono, ultimos4: c.ultimos4, nota: c.nota,
      tramos: e.tramos || [{ hasta: null, tasa: 0 }], capitalizacion: c.capitalizacion || M.capDe(c), plazo: c.plazo || 28, fechaVencimiento: c.fechaVencimiento, reinvertir: c.reinvertir !== false,
      promoTasa: e.promo ? e.promo.tasa : null, promoDias: e.promo ? e.promo.dias : null, promoTope: e.promo ? e.promo.tope : null, aplicaISR: c.aplicaISR !== false, fechaTasa: app.hoy,
      ...(c.credito || {}), creditoTasa: c.credito ? c.credito.tasaAnual : null,
      ...(c.prestamo ? { montoOriginal: c.prestamo.montoOriginal, prestamoTasa: c.prestamo.tasaAnual, plazoMeses: c.prestamo.plazoMeses, pagoMensual: c.prestamo.pagoMensual, prestamoDia: c.prestamo.diaPago, fechaInicio: c.prestamo.fechaInicio } : {}),
    } : {
      nombre: p.nombre || '', institucion: p.institucion || 'Otra', tipo: p.tipo || 'rendimiento', color: p.color || UI.COLORES[0], icono: null,
      tramos: p.tramos || [{ hasta: null, tasa: 0 }], capitalizacion: p.cap || 'diaria', plazo: p.plazo || 28, reinvertir: true, aplicaISR: p.aplicaISR !== false,
      saldo: null, fechaSaldo: app.hoy, fechaTasa: app.hoy, fechaVencimiento: M.sumarDias(app.hoy, p.plazo || 28), fechaInicio: app.hoy,
    };
    const campos = [
      { n: 'nombre', l: 'Nombre', req: true, ph: 'Ej. Nu Cajitas', ancho: 'mitad' },
      { n: 'institucion', l: 'Institución', t: 'select', op: opInst(), ancho: 'mitad' },
      { n: 'tipo', l: 'Tipo de cuenta', t: 'select', op: opTipos, ancho: 'mitad' },
      { n: 'ultimos4', l: 'Últimos 4 dígitos (opcional)', ph: '1234', maxlength: 4, ancho: 'mitad', ayuda: 'Nunca pidas ni guardes el número completo.' },
      ...(c ? [] : [
        { n: 'saldo', l: 'Saldo actual', t: 'money', ancho: 'mitad', ayuda: 'Para tarjetas y préstamos: lo que debes.' },
        { n: 'fechaSaldo', l: 'Fecha del saldo', t: 'date', ancho: 'mitad' },
      ]),
      { n: 'color', l: 'Color', t: 'color' },
      { t: 'seccion', n: 'secRend', l: 'Rendimiento', si: x => rinde(x.tipo) },
      { n: 'tramos', l: 'Tasa anual por tramos', etiqueta: ETQ_VERIFICA, t: 'tramos', si: x => rinde(x.tipo), ayuda: 'Ej. 15 % hasta $25,000 y 7 % sobre el excedente. Un solo tramo sin límite = tasa fija.' },
      { n: 'capitalizacion', l: 'Capitalización', t: 'select', ancho: 'mitad', op: [{ v: 'diaria', l: 'Diaria (Nu, Revolut…)' }, { v: 'mensual', l: 'Mensual' }, { v: 'vencimiento', l: 'Al vencimiento (Cetes)' }], si: x => rinde(x.tipo) && x.tipo !== 'cetes' },
      { n: 'fechaTasa', l: 'Tasa vigente desde', t: 'date', ancho: 'mitad', si: x => rinde(x.tipo), ayuda: c ? 'Si cambias la tasa se guarda como un nuevo periodo.' : '' },
      { n: 'plazo', l: 'Plazo de Cetes', t: 'select', ancho: 'tercio', op: [28, 91, 182, 364].map(d => ({ v: d, l: d + ' días' })), si: x => x.tipo === 'cetes' },
      { n: 'fechaVencimiento', l: 'Próximo vencimiento', t: 'date', ancho: 'tercio', si: x => x.tipo === 'cetes' },
      { n: 'reinvertir', l: 'Reinvertir al vencer', t: 'checkbox', ancho: 'tercio', si: x => x.tipo === 'cetes' },
      { n: 'promoTasa', l: 'Tasa promocional (opcional)', t: 'pct', ancho: 'tercio', si: x => rinde(x.tipo) && x.tipo !== 'cetes' },
      { n: 'promoDias', l: 'Por cuántos días', t: 'number', ancho: 'tercio', si: x => rinde(x.tipo) && x.tipo !== 'cetes' },
      { n: 'promoTope', l: 'Tope de la promo', t: 'money', ancho: 'tercio', si: x => rinde(x.tipo) && x.tipo !== 'cetes', ph: 'Sin tope' },
      { n: 'aplicaISR', l: 'Descontar retención de ISR', texto: `Descontar retención de ISR sobre intereses (${F.pct(app.estado.config.retencionISR)} anual sobre el capital)`, t: 'checkbox', si: x => rinde(x.tipo) && !['afore', 'ppr', 'debito'].includes(x.tipo) },
      { t: 'seccion', n: 'secCred', l: 'Tarjeta de crédito', si: x => x.tipo === 'credito' },
      { n: 'limite', l: 'Límite de crédito', t: 'money', ancho: 'mitad', si: x => x.tipo === 'credito' },
      { n: 'creditoTasa', l: 'Tasa anual (CAT aprox.)', t: 'pct', ancho: 'mitad', si: x => x.tipo === 'credito' },
      { n: 'diaCorte', l: 'Día de corte', t: 'number', min: 1, max: 31, ancho: 'mitad', si: x => x.tipo === 'credito' },
      { n: 'diaPago', l: 'Día límite de pago', t: 'number', min: 1, max: 31, ancho: 'mitad', si: x => x.tipo === 'credito' },
      { n: 'pagoNoIntereses', l: 'Pago para no generar intereses', t: 'money', ancho: 'mitad', si: x => x.tipo === 'credito', ayuda: 'Viene en tu estado de cuenta.' },
      { n: 'pagoMinimo', l: 'Pago mínimo', t: 'money', ancho: 'mitad', si: x => x.tipo === 'credito' },
      { t: 'seccion', n: 'secPres', l: 'Préstamo', si: x => x.tipo === 'prestamo' },
      { n: 'montoOriginal', l: 'Monto original', t: 'money', ancho: 'mitad', si: x => x.tipo === 'prestamo' },
      { n: 'prestamoTasa', l: 'Tasa anual', t: 'pct', ancho: 'mitad', si: x => x.tipo === 'prestamo' },
      { n: 'plazoMeses', l: 'Plazo (meses)', t: 'number', ancho: 'mitad', si: x => x.tipo === 'prestamo' },
      { n: 'pagoMensual', l: 'Pago mensual', t: 'money', ancho: 'mitad', si: x => x.tipo === 'prestamo', ayuda: 'Vacío = se calcula solo.' },
      { n: 'prestamoDia', l: 'Día de pago', t: 'number', min: 1, max: 31, ancho: 'mitad', si: x => x.tipo === 'prestamo' },
      { n: 'fechaInicio', l: 'Fecha de inicio', t: 'date', ancho: 'mitad', si: x => x.tipo === 'prestamo' },
      { n: 'nota', l: 'Nota', t: 'textarea', ph: 'Opcional' },
    ];
    UI.formulario({
      titulo: c ? 'Editar cuenta' : 'Nueva cuenta', icono: c ? M.TIPOS_CUENTA[c.tipo].icono : 'wallet', color: v.color, campos, valores: v, ancho: 'ancho',
      onGuardar(x) {
        if (x.ultimos4 && !/^\d{4}$/.test(x.ultimos4)) return 'Los últimos 4 dígitos deben ser 4 números.';
        const tramos = (x.tramos || []).filter(t => t.tasa != null);
        const promo = x.promoTasa > 0 ? { tasa: x.promoTasa, dias: x.promoDias || 0, tope: x.promoTope || 0 } : null;
        app.mutar(est => {
          const obj = c ? est.cuentas.find(k => k.id === c.id) : { id: E.nuevoId('cta'), historialSaldos: [], historialTasas: [], archivada: false };
          Object.assign(obj, { nombre: x.nombre.trim(), institucion: x.institucion, tipo: x.tipo, color: x.color || UI.COLORES[0], ultimos4: x.ultimos4 || '', nota: x.nota || '', aplicaISR: !!x.aplicaISR });
          obj.capitalizacion = x.tipo === 'cetes' ? 'vencimiento' : (rinde(x.tipo) ? x.capitalizacion : (x.tipo === 'prestamo' ? 'mensual' : 'ninguna'));
          if (x.tipo === 'cetes') { obj.plazo = Number(x.plazo) || 28; obj.fechaVencimiento = x.fechaVencimiento; obj.reinvertir = !!x.reinvertir; }
          if (x.tipo === 'credito') obj.credito = { limite: x.limite || 0, tasaAnual: x.creditoTasa || 0, diaCorte: x.diaCorte || 1, diaPago: x.diaPago || 20, pagoNoIntereses: x.pagoNoIntereses || 0, pagoMinimo: x.pagoMinimo || 0 };
          if (x.tipo === 'prestamo') obj.prestamo = { montoOriginal: x.montoOriginal || 0, tasaAnual: x.prestamoTasa || 0, plazoMeses: x.plazoMeses || 12, pagoMensual: x.pagoMensual || Math.round(Fz.pagoMensual(x.montoOriginal || 0, x.prestamoTasa || 0, x.plazoMeses || 12) * 100) / 100, diaPago: x.prestamoDia || 1, fechaInicio: x.fechaInicio || app.hoy };
          if (rinde(x.tipo)) {
            const ult = obj.historialTasas[obj.historialTasas.length - 1];
            const nueva = { fecha: x.fechaTasa || app.hoy, tramos, promo, creado: E.marca() };
            const igual = ult && JSON.stringify(ult.tramos) === JSON.stringify(tramos) && JSON.stringify(ult.promo || null) === JSON.stringify(promo);
            if (!igual) {
              if (ult && ult.fecha === nueva.fecha) Object.assign(ult, nueva); else obj.historialTasas.push(nueva);
              obj.historialTasas.sort((a, b) => a.fecha.localeCompare(b.fecha));
            }
          }
          if (!c) {
            obj.historialSaldos.push({ id: E.nuevoId('sal'), fecha: x.fechaSaldo || app.hoy, saldo: x.saldo || 0, creado: E.marca() });
            est.cuentas.push(obj);
            if (x.tipo === 'debito' && !est.config.cuentaPrincipalId) est.config.cuentaPrincipalId = obj.id;
          }
        }, c ? 'Cuenta actualizada' : 'Cuenta creada');
      },
      eliminar: c ? async () => {
        const n = app.estado.movimientos.filter(m => m.cuentaId === c.id || m.cuentaDestinoId === c.id).length + app.estado.flujosApartado.filter(f => f.cuentaId === c.id).length;
        const ok = await UI.confirmar({ titulo: `Eliminar ${c.nombre}`, peligro: true, mensaje: `Se eliminará la cuenta${n ? ` y <b>${n} movimientos</b> relacionados` : ''}. Si solo ya no la usas, mejor <b>archívala</b>.`, textoOk: 'Eliminar' });
        if (!ok) return false;
        app.mutar(est => {
          est.cuentas = est.cuentas.filter(k => k.id !== c.id);
          est.movimientos = est.movimientos.filter(m => m.cuentaId !== c.id && m.cuentaDestinoId !== c.id);
          est.flujosApartado = est.flujosApartado.filter(f => f.cuentaId !== c.id && f.cuentaDestinoId !== c.id);
          if (est.config.cuentaPrincipalId === c.id) est.config.cuentaPrincipalId = null;
        }, 'Cuenta eliminada');
        if (app.ruta === 'cuentas' && app.params[0]) app.navegar('cuentas');
      } : null,
    });
  }

  /** Actualizar saldo con fecha (ancla la gráfica de patrimonio a la realidad). */
  function actualizarSaldo(id) {
    const app = A();
    const c = app.cuenta(id);
    const cc = app.calc.cuentas[id];
    const hist = [...c.historialSaldos].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 6);
    UI.formulario({
      titulo: `Actualizar saldo · ${c.nombre}`, icono: 'refresh', color: c.color,
      subtitulo: `Saldo estimado hoy: ${F.dinero(cc.saldo)}. Escribe el saldo real que ves en la app.`,
      campos: [
        { n: 'saldo', l: M.esDeuda(c) ? 'Lo que debes' : 'Saldo real', t: 'money', req: true, ancho: 'mitad' },
        { n: 'fecha', l: 'Fecha', t: 'date', req: true, ancho: 'mitad' },
      ],
      valores: { saldo: Math.round(cc.saldo * 100) / 100, fecha: app.hoy },
      extra: hist.length ? `<div class="mb"><div class="campo-label mb" style="margin-bottom:6px">Historial reciente</div><div class="lista">${hist.map(h => `<div class="fila"><div class="fila-txt"><div class="fila-titulo">${F.fecha(h.fecha, 'media')}</div></div><div class="fila-der">${UI.m(h.saldo)}</div></div>`).join('')}</div></div>` : '',
      onCambio(x, el) {
        const box = el.querySelector('[data-vista-previa]');
        if (x.saldo == null) { box.innerHTML = ''; return; }
        const dif = x.saldo - cc.saldo;
        box.innerHTML = Math.abs(dif) > 0.5 ? `<div class="nota-caja mt">${UI.icono('info')}<span>Diferencia contra lo estimado: <b class="${dif > 0 ? 'verde-txt' : 'rojo-txt'}">${F.dinero(dif, { signo: true })}</b>. ${dif > 0 && !M.esDeuda(c) ? 'Pueden ser rendimientos o depósitos no registrados.' : 'Pueden ser gastos o comisiones no registrados.'}</span></div>` : '';
      },
      onGuardar(x) {
        app.mutar(est => { est.cuentas.find(k => k.id === id).historialSaldos.push({ id: E.nuevoId('sal'), fecha: x.fecha, saldo: x.saldo, creado: E.marca() }); }, 'Saldo actualizado');
      },
    });
  }

  /** Actualizar la tasa de una cuenta (guarda periodo nuevo). */
  function tasa(id, tasaNueva) {
    const app = A();
    const c = app.cuenta(id);
    const e = c.historialTasas[c.historialTasas.length - 1] || { tramos: [{ hasta: null, tasa: 0 }] };
    let tramos = JSON.parse(JSON.stringify(e.tramos));
    if (tasaNueva != null) { if (tramos.length === 1) tramos[0].tasa = tasaNueva; else tramos[0].tasa = tasaNueva; }
    const hist = [...c.historialTasas].reverse().slice(0, 6);
    UI.formulario({
      titulo: `Tasa de ${c.nombre}`, icono: 'percent', color: c.color,
      subtitulo: 'Las tasas cambian seguido. Al guardar se crea un nuevo periodo; lo anterior se sigue calculando con la tasa vieja.',
      campos: [
        { n: 'tramos', l: 'Tasa anual por tramos', etiqueta: ETQ_VERIFICA, t: 'tramos' },
        { n: 'fecha', l: 'Vigente desde', t: 'date', req: true, ancho: 'mitad' },
        { n: 'promoTasa', l: 'Tasa promocional', t: 'pct', ancho: 'mitad' },
        { n: 'promoDias', l: 'Días de promoción', t: 'number', ancho: 'mitad' },
        { n: 'promoTope', l: 'Tope de la promoción', t: 'money', ancho: 'mitad', ph: 'Sin tope' },
      ],
      valores: { tramos, fecha: app.hoy },
      extra: `<div class="mb"><div class="campo-label" style="margin-bottom:6px">Historial de tasas</div><div class="lista">${hist.map(h => `<div class="fila"><div class="fila-txt"><div class="fila-titulo">${F.fecha(h.fecha, 'media')}</div><div class="fila-sub">${describirTramos(h.tramos)}${h.promo ? ` · promo ${F.pct(h.promo.tasa)} por ${h.promo.dias} días` : ''}</div></div></div>`).join('')}</div></div>`,
      onGuardar(x) {
        const promo = x.promoTasa > 0 ? { tasa: x.promoTasa, dias: x.promoDias || 0, tope: x.promoTope || 0 } : null;
        app.mutar(est => {
          const k = est.cuentas.find(q => q.id === id);
          const ult = k.historialTasas.find(h => h.fecha === x.fecha);
          const nueva = { fecha: x.fecha, tramos: x.tramos, promo, creado: E.marca() };
          if (ult) Object.assign(ult, nueva); else k.historialTasas.push(nueva);
          k.historialTasas.sort((a, b) => a.fecha.localeCompare(b.fecha));
        }, 'Tasa actualizada');
      },
    });
  }

  /** "7.25 % hasta $25,000 · 5.50 % excedente" */
  function describirTramos(tramos) {
    const t = Fz.ordenarTramos(tramos);
    if (!t.length) return 'Sin rendimiento';
    if (t.length === 1) return t[0].hasta == null ? `${F.pct(t[0].tasa)} anual` : `${F.pct(t[0].tasa)} hasta ${F.dinero(t[0].hasta, { dec: 0 })} (sin rendimiento arriba)`;
    return t.map((x, i) => i === 0 ? `${F.pct(x.tasa)} hasta ${F.dinero(x.hasta, { dec: 0 })}` : (x.hasta == null ? `${F.pct(x.tasa)} excedente` : `${F.pct(x.tasa)} hasta ${F.dinero(x.hasta, { dec: 0 })}`)).join(' · ');
  }

  /** Alta / edición de apartado. */
  function apartado(id) {
    const app = A();
    const a = id ? app.apartado(id) : null;
    UI.formulario({
      titulo: a ? 'Editar apartado' : 'Nuevo apartado', icono: a ? a.icono : 'layers', color: a ? a.color : null,
      subtitulo: 'Un apartado es un "para qué": Coche, Casa, Mi negocio… Puede tener dinero en varias cuentas.',
      campos: [
        { n: 'nombre', l: 'Nombre', req: true, ph: 'Ej. Coche, Casa, Viaje a Japón' },
        { n: 'meta', l: 'Monto meta (opcional)', t: 'money', ancho: 'mitad' },
        { n: 'fechaMeta', l: 'Fecha meta (opcional)', t: 'date', ancho: 'mitad' },
        { n: 'aportacionMensual', l: 'Cuánto piensas ahorrar al mes', t: 'money', ancho: 'mitad', ayuda: 'Vacío = promedio de tus depósitos de los últimos 3 meses.' },
        { n: 'esFondo', l: 'Es mi fondo de emergencia', t: 'checkbox', ancho: 'mitad' },
        { n: 'icono', l: 'Ícono', t: 'icono' },
        { n: 'color', l: 'Color', t: 'color' },
        { n: 'nota', l: 'Nota', t: 'textarea', ph: 'Opcional' },
      ],
      valores: a ? { ...a } : { icono: 'piggy', color: UI.COLORES[(app.estado.apartados.length + 1) % UI.COLORES.length] },
      onGuardar(x) {
        let nuevoId = null;
        app.mutar(est => {
          if (x.esFondo) est.apartados.forEach(q => { q.esFondo = false; });
          const obj = a ? est.apartados.find(q => q.id === a.id) : { id: (nuevoId = E.nuevoId('ap')) };
          Object.assign(obj, { nombre: x.nombre.trim(), meta: x.meta || null, fechaMeta: x.fechaMeta || null, aportacionMensual: x.aportacionMensual || null, esFondo: !!x.esFondo, icono: x.icono || 'piggy', color: x.color || UI.COLORES[0], nota: x.nota || '' });
          if (!a) est.apartados.push(obj);
        }, a ? 'Apartado actualizado' : 'Apartado creado');
        if (nuevoId) app.navegar('apartados/' + nuevoId);
      },
      eliminar: a ? async () => {
        const v = app.calc.apartados[a.id].valor;
        const ok = await UI.confirmar({ titulo: `Eliminar "${a.nombre}"`, peligro: true, mensaje: v > 0 ? `Tiene ${F.dinero(v)}. El dinero <b>no se borra</b>: queda como "sin asignar" en sus cuentas.` : 'Se eliminará el apartado.', textoOk: 'Eliminar apartado' });
        if (!ok) return false;
        app.mutar(est => {
          est.apartados = est.apartados.filter(q => q.id !== a.id);
          for (const f of est.flujosApartado) { if (f.apartadoId === a.id) f.apartadoId = null; if (f.apartadoDestinoId === a.id) f.apartadoDestinoId = null; }
          est.metas.forEach(mt => { if (mt.vinculo === 'apartado' && mt.vinculoId === a.id) { mt.vinculo = 'manual'; mt.actualManual = 0; } });
        }, 'Apartado eliminado');
        app.navegar('apartados');
      } : null,
    });
  }

  /** Cuenta principal donde un apartado tiene más dinero. */
  function cuentaPrincipalApartado(apId) {
    const app = A();
    const ca = app.calc.apartados[apId];
    if (!ca) return null;
    let mejor = null;
    for (const [cid, v] of Object.entries(ca.porCuenta)) if (!mejor || v > mejor.v) mejor = { cid, v };
    return mejor && mejor.v > 0 ? mejor.cid : null;
  }

  /** Depósito / retiro / traspaso de apartados. pre: valores iniciales. */
  function deposito(pre) {
    const app = A();
    pre = pre || {};
    const tipo = pre.tipo || 'deposito';
    const cuentasDinero = app.opCuentas(c => !M.esDeuda(c));
    const cuentaDefecto = pre.cuentaId || (pre.apartadoId && cuentaPrincipalApartado(pre.apartadoId)) || (app.estado.cuentas.find(c => ['rendimiento', 'cajita'].includes(c.tipo) && !c.archivada) || {}).id || (cuentasDinero[0] || {}).v;
    const tasaDe = cid => { const cc = app.calc.cuentas[cid]; return cc ? Math.round(cc.tasaBruta * 100) / 100 : 0; };
    const principal = app.estado.config.cuentaPrincipalId;
    const v = {
      tipo, monto: pre.monto, fecha: pre.fecha || app.hoy, apartadoId: pre.apartadoId || '', cuentaId: cuentaDefecto,
      tasa: pre.tasa != null ? pre.tasa : tasaDe(cuentaDefecto), sincronizar: true,
      origen: pre.origen || (principal && principal !== cuentaDefecto ? principal : 'externo'), destino: pre.destino || 'liberar',
      apartadoDestinoId: pre.apartadoDestinoId || '', cuentaDestinoId: pre.cuentaDestinoId || '', nota: pre.nota || '',
    };
    const campos = [
      { n: 'tipo', l: 'Tipo', t: 'select', op: [{ v: 'deposito', l: 'Depósito a un apartado' }, { v: 'retiro', l: 'Retiro de un apartado' }, { v: 'traspaso', l: 'Mover entre apartados' }] },
      { n: 'monto', l: 'Monto', t: 'money', req: true, ancho: 'mitad' },
      { n: 'fecha', l: 'Fecha', t: 'date', req: true, ancho: 'mitad' },
      { n: 'apartadoId', l: 'Apartado', t: 'select', op: app.opApartados([{ v: '', l: '— Sin apartado (solo cuenta) —' }]), ancho: 'mitad', si: x => x.tipo === 'deposito' },
      { n: 'apartadoOrigen', l: 'Apartado', t: 'select', op: app.opApartados(), ancho: 'mitad', si: x => x.tipo !== 'deposito' },
      { n: 'cuentaId', l: 'Cuenta', t: 'select', op: cuentasDinero, ancho: 'mitad' },
      { n: 'tasa', l: 'Tasa anual en este depósito', t: 'pct', ancho: 'mitad', si: x => x.tipo === 'deposito', ayuda: 'Se guarda la tasa de hoy. Si después cambias la tasa de la cuenta, se calcula por periodos.' },
      { n: 'origen', l: 'Origen del dinero', t: 'select', ancho: 'mitad', si: x => x.tipo === 'deposito', op: [{ v: 'externo', l: 'Dinero nuevo / de fuera' }, { v: 'asignar', l: 'Ya estaba en la cuenta (solo asignar)' }, { grupo: 'Desde otra cuenta', op: cuentasDinero.map(o => ({ v: o.v, l: 'Desde ' + o.l })) }] },
      { n: 'sincronizar', l: 'Actualizar la tasa de la cuenta', t: 'checkbox', texto: 'Actualizar también la tasa de la cuenta a este valor', si: x => x.tipo === 'deposito' && x.tasa != null && Math.abs(x.tasa - tasaDe(x.cuentaId)) > 0.001 },
      { n: 'destino', l: 'Destino del dinero', t: 'select', ancho: 'mitad', si: x => x.tipo === 'retiro', op: [{ v: 'liberar', l: 'Se queda en la cuenta, sin asignar' }, { v: 'externo', l: 'Sale de la cuenta (lo usé)' }, { grupo: 'A otra cuenta', op: cuentasDinero.map(o => ({ v: o.v, l: 'A ' + o.l })) }] },
      { n: 'apartadoDestinoId', l: 'Hacia el apartado', t: 'select', op: app.opApartados(), ancho: 'mitad', si: x => x.tipo === 'traspaso' },
      { n: 'cuentaDestinoId', l: 'En la cuenta', t: 'select', op: [{ v: '', l: 'La misma cuenta' }, ...cuentasDinero], ancho: 'mitad', si: x => x.tipo === 'traspaso' },
      { n: 'nota', l: 'Nota', ph: 'Opcional' },
    ];
    v.apartadoOrigen = pre.apartadoId || (app.estado.apartados[0] || {}).id;
    UI.formulario({
      titulo: 'Mover dinero de apartados', icono: 'layers', campos, valores: v, textoGuardar: 'Registrar',
      onCambio(x, el) {
        const box = el.querySelector('[data-vista-previa]');
        if (x.tipo === 'deposito' && x.monto > 0) {
          const c = app.cuenta(x.cuentaId);
          const neta = c ? M.netaDe(c, x.tasa || 0, app.estado.config) : 0;
          const r = Fz.rendimientos(x.monto, neta, c ? M.capDe(c) : 'diaria', c && c.plazo);
          box.innerHTML = `<div class="mensaje mt">${UI.icono('sparkles')}<span>Con ${F.pct(neta)} neto, estos ${F.dinero(x.monto, { dec: 0 })} te darán ~<strong>${F.dinero(r.diario)}</strong> al día, <strong>${F.dinero(r.mensual)}</strong> al mes y <strong>${F.dinero(r.anual, { dec: 0 })}</strong> al año.</span></div>`;
        } else if (x.tipo !== 'deposito' && x.apartadoOrigen) {
          const ca = app.calc.apartados[x.apartadoOrigen];
          const enCuenta = ca ? (ca.porCuenta[x.cuentaId] || 0) : 0;
          box.innerHTML = `<div class="nota-caja mt">${UI.icono('info')}<span>Disponible en este apartado y cuenta: <b>${F.dinero(enCuenta)}</b>${ca && Object.keys(ca.porCuenta).length > 1 ? ` (total del apartado ${F.dinero(ca.valor)})` : ''}.</span></div>`;
        } else box.innerHTML = '';
      },
      onGuardar(x) {
        if (!(x.monto > 0)) return 'Escribe un monto mayor a cero.';
        if (x.tipo !== 'deposito') {
          const ca = app.calc.apartados[x.apartadoOrigen];
          const enCuenta = ca ? (ca.porCuenta[x.cuentaId] || 0) : 0;
          if (x.monto > enCuenta + 0.01) return `En esa cuenta el apartado solo tiene ${F.dinero(enCuenta)}.`;
          if (x.tipo === 'traspaso' && x.apartadoDestinoId === x.apartadoOrigen && (!x.cuentaDestinoId || x.cuentaDestinoId === x.cuentaId)) return 'Elige un apartado o cuenta destino distinto.';
        }
        if (x.tipo === 'deposito' && x.origen === x.cuentaId) return 'La cuenta de origen y destino son la misma; elige "Ya estaba en la cuenta".';
        app.mutar(est => {
          const base = { id: E.nuevoId('flu'), fecha: x.fecha, tipo: x.tipo, monto: x.monto, cuentaId: x.cuentaId, nota: x.nota || '', creado: E.marca() };
          if (x.tipo === 'deposito') {
            est.flujosApartado.push({ ...base, apartadoId: x.apartadoId || null, tasa: x.tasa, origen: x.origen });
            const c = est.cuentas.find(k => k.id === x.cuentaId);
            const actual = tasaDe(x.cuentaId);
            if (x.sincronizar && x.tasa != null && Math.abs(x.tasa - actual) > 0.001 && c) {
              const e = c.historialTasas[c.historialTasas.length - 1];
              const tramos = e ? JSON.parse(JSON.stringify(e.tramos)) : [{ hasta: null, tasa: x.tasa }];
              tramos[0].tasa = x.tasa;
              const mismo = c.historialTasas.find(h => h.fecha === x.fecha);
              if (mismo) mismo.tramos = tramos; else c.historialTasas.push({ fecha: x.fecha, tramos, promo: null, creado: E.marca() });
              c.historialTasas.sort((a, b) => a.fecha.localeCompare(b.fecha));
            }
          } else if (x.tipo === 'retiro') est.flujosApartado.push({ ...base, apartadoId: x.apartadoOrigen, destino: x.destino });
          else {
            const cd = x.cuentaDestinoId || x.cuentaId;
            est.flujosApartado.push({ ...base, apartadoId: x.apartadoOrigen, apartadoDestinoId: x.apartadoDestinoId, cuentaDestinoId: cd, tasa: cd !== x.cuentaId ? tasaDe(cd) : null });
          }
        }, x.tipo === 'deposito' ? 'Depósito registrado' : x.tipo === 'retiro' ? 'Retiro registrado' : 'Dinero movido entre apartados');
      },
    });
  }

  /** Alta / edición de movimiento (ingreso, gasto o transferencia). */
  function movimiento(pre, id) {
    const app = A();
    const mv = id ? app.estado.movimientos.find(m => m.id === id) : null;
    pre = pre || {};
    const principal = app.estado.config.cuentaPrincipalId || (app.estado.cuentas.find(c => c.tipo === 'debito') || app.estado.cuentas[0] || {}).id || '';
    const v = mv ? { ...mv, papasCheck: (mv.papas || 0) > 0, papas: mv.papas || 100 } : {
      tipo: pre.tipo || 'gasto', monto: pre.monto, fecha: pre.fecha || app.hoy, categoriaId: pre.categoriaId || '', cuentaId: pre.cuentaId !== undefined ? (pre.cuentaId || '') : principal,
      cuentaDestinoId: pre.cuentaDestinoId || '', nota: pre.nota || '', papasCheck: (pre.papas || 0) > 0, papas: pre.papas || 100, repetir: false, frecuencia: 'mensual',
    };
    if (!app.estado.cuentas.length && !mv) {
      UI.toast('Primero agrega una cuenta.', { error: true });
      return nuevaCuenta();
    }
    let tocoPapas = !!mv;
    const campos = [
      { n: 'tipo', l: 'Tipo', t: 'select', op: [{ v: 'gasto', l: 'Gasto' }, { v: 'ingreso', l: 'Ingreso' }, { v: 'transferencia', l: 'Transferencia entre cuentas' }] },
      { n: 'monto', l: 'Monto', t: 'money', req: true, ancho: 'mitad m-mitad' },
      { n: 'fecha', l: 'Fecha', t: 'date', req: true, ancho: 'mitad m-mitad' },
      { n: 'categoriaId', l: 'Categoría', t: 'select', op: [{ grupo: 'Gastos', op: app.opCategorias('gasto') }, { grupo: 'Ingresos', op: app.opCategorias('ingreso') }], ancho: 'mitad', si: x => x.tipo !== 'transferencia' },
      { n: 'cuentaId', l: 'Cuenta', t: 'select', op: app.opCuentas(null, [{ v: '', l: '— Ninguna (lo pagaron directo) —' }]), ancho: 'mitad' },
      { n: 'cuentaDestinoId', l: 'Cuenta destino', t: 'select', op: app.opCuentas(), ancho: 'mitad', si: x => x.tipo === 'transferencia' },
      { n: 'papasCheck', l: 'Lo pagaron mis papás', t: 'checkbox', texto: 'Lo pagaron mis papás', si: x => x.tipo === 'gasto' },
      { n: 'papas', l: 'Porcentaje que pagaron ellos', t: 'pct', step: 1, ancho: 'mitad', si: x => x.tipo === 'gasto' && x.papasCheck, ayuda: 'No cuenta contra tu presupuesto; se muestra aparte.' },
      { n: 'nota', l: 'Nota', ph: 'Ej. Tacos con amigos' },
      ...(mv ? [] : [
        { n: 'repetir', l: 'Repetir', t: 'checkbox', texto: 'Repetir automáticamente (recurrente)' },
        { n: 'frecuencia', l: 'Frecuencia', t: 'select', op: opFrecuencias, ancho: 'mitad', si: x => x.repetir },
      ]),
    ];
    UI.formulario({
      titulo: mv ? 'Editar movimiento' : 'Nuevo movimiento', icono: 'swap', campos, valores: v,
      onCambio(x, el) {
        // Ajustar categorías según tipo
        const sel = el.querySelector('[name=categoriaId]');
        if (sel) {
          const cat = app.categoria(x.categoriaId);
          if (!cat || (x.tipo === 'gasto' && cat.tipo !== 'gasto') || (x.tipo === 'ingreso' && cat.tipo !== 'ingreso')) {
            const prim = app.estado.categorias.find(c => c.tipo === (x.tipo === 'ingreso' ? 'ingreso' : 'gasto'));
            if (prim && x.tipo !== 'transferencia') { sel.value = prim.id; }
          }
        }
        // Acuerdo con papás: sugerir porcentaje
        const box = el.querySelector('[data-vista-previa]');
        const pct = app.estado.papas[x.categoriaId];
        if (x.tipo === 'gasto' && pct > 0) {
          const cat = app.categoria(x.categoriaId);
          box.innerHTML = `<div class="nota-caja mt">${UI.icono('users')}<span>Según el acuerdo, tus papás cubren <b>${pct} %</b> de ${UI.esc(cat ? cat.nombre : '')}.</span></div>`;
          if (!tocoPapas) {
            const chk = el.querySelector('[name=papasCheck]'), inp = el.querySelector('[name=papas]');
            if (chk && !chk.checked) { chk.checked = true; inp.value = pct; chk.dispatchEvent(new Event('change', { bubbles: true })); }
          }
        } else box.innerHTML = '';
      },
      alMontar(el) {
        el.querySelectorAll('[name=papasCheck],[name=papas]').forEach(i => i.addEventListener('input', () => { tocoPapas = true; }));
        el.querySelector('[name=categoriaId]').addEventListener('change', () => { tocoPapas = false; });
      },
      onGuardar(x) {
        if (!(x.monto > 0)) return 'Escribe un monto mayor a cero.';
        if (x.tipo === 'transferencia' && (!x.cuentaId || !x.cuentaDestinoId || x.cuentaId === x.cuentaDestinoId)) return 'Elige dos cuentas distintas.';
        if (x.tipo === 'ingreso' && !x.cuentaId) return 'Elige la cuenta donde entró el dinero.';
        const papas = x.tipo === 'gasto' && x.papasCheck ? Math.max(0, Math.min(100, x.papas || 100)) : 0;
        if (x.tipo === 'gasto' && !x.cuentaId && papas < 100) return 'Elige con qué cuenta pagaste tu parte.';
        app.mutar(est => {
          const datos = { fecha: x.fecha, tipo: x.tipo, monto: x.monto, categoriaId: x.tipo === 'transferencia' ? null : x.categoriaId, cuentaId: x.cuentaId || null, cuentaDestinoId: x.tipo === 'transferencia' ? x.cuentaDestinoId : null, nota: x.nota || '', papas };
          if (mv) Object.assign(est.movimientos.find(m => m.id === mv.id), datos);
          else {
            const nuevo = { id: E.nuevoId('mov'), ...datos, creado: E.marca() };
            if (x.repetir) {
              const rec = { id: E.nuevoId('rec'), nombre: x.nota || (app.categoria(x.categoriaId) || {}).nombre || 'Recurrente', tipo: x.tipo, monto: x.monto, categoriaId: datos.categoriaId, cuentaId: datos.cuentaId, cuentaDestinoId: datos.cuentaDestinoId, papas, frecuencia: x.frecuencia, dia: M.partes(x.fecha).d, activo: true };
              rec.proxima = M.siguienteFecha(rec, x.fecha);
              est.recurrentes.push(rec);
              nuevo.recurrenteId = rec.id;
            }
            est.movimientos.push(nuevo);
          }
        }, mv ? 'Movimiento actualizado' : (x.tipo === 'gasto' ? 'Gasto registrado' : x.tipo === 'ingreso' ? 'Ingreso registrado' : 'Transferencia registrada'));
      },
      eliminar: mv ? () => { app.mutar(est => { est.movimientos = est.movimientos.filter(m => m.id !== mv.id); }, 'Movimiento eliminado'); } : null,
    });
  }

  /** Alta / edición de movimiento recurrente. */
  function recurrente(id) {
    const app = A();
    const r = id ? app.estado.recurrentes.find(x => x.id === id) : null;
    const v = r ? { ...r } : { tipo: 'gasto', frecuencia: 'mensual', proxima: app.hoy, dia: M.partes(app.hoy).d, activo: true, papas: 0, cuentaId: app.estado.config.cuentaPrincipalId || '' };
    UI.formulario({
      titulo: r ? 'Editar recurrente' : 'Nuevo recurrente', icono: 'repeat', subtitulo: 'Se registra solo cada vez que llega su fecha (sueldo, renta, suscripciones…).',
      campos: [
        { n: 'nombre', l: 'Nombre', req: true, ph: 'Ej. Spotify, Sueldo, Renta' },
        { n: 'tipo', l: 'Tipo', t: 'select', op: [{ v: 'gasto', l: 'Gasto' }, { v: 'ingreso', l: 'Ingreso' }, { v: 'transferencia', l: 'Transferencia' }], ancho: 'mitad' },
        { n: 'monto', l: 'Monto', t: 'money', req: true, ancho: 'mitad' },
        { n: 'categoriaId', l: 'Categoría', t: 'select', op: [{ grupo: 'Gastos', op: app.opCategorias('gasto') }, { grupo: 'Ingresos', op: app.opCategorias('ingreso') }], ancho: 'mitad', si: x => x.tipo !== 'transferencia' },
        { n: 'cuentaId', l: 'Cuenta', t: 'select', op: app.opCuentas(null, [{ v: '', l: '— Ninguna —' }]), ancho: 'mitad' },
        { n: 'cuentaDestinoId', l: 'Cuenta destino', t: 'select', op: app.opCuentas(), ancho: 'mitad', si: x => x.tipo === 'transferencia' },
        { n: 'frecuencia', l: 'Frecuencia', t: 'select', op: opFrecuencias, ancho: 'mitad' },
        { n: 'proxima', l: 'Próxima fecha', t: 'date', req: true, ancho: 'mitad' },
        { n: 'papas', l: '% que pagan mis papás', t: 'pct', step: 1, ancho: 'mitad', si: x => x.tipo === 'gasto' },
        { n: 'activo', l: 'Activo', t: 'checkbox', texto: 'Activo' },
      ],
      valores: v,
      onGuardar(x) {
        if (x.tipo === 'transferencia' && x.cuentaId === x.cuentaDestinoId) return 'Elige dos cuentas distintas.';
        app.mutar(est => {
          const obj = r ? est.recurrentes.find(q => q.id === r.id) : { id: E.nuevoId('rec') };
          Object.assign(obj, { nombre: x.nombre, tipo: x.tipo, monto: x.monto, categoriaId: x.tipo === 'transferencia' ? null : x.categoriaId, cuentaId: x.cuentaId || null, cuentaDestinoId: x.tipo === 'transferencia' ? x.cuentaDestinoId : null, frecuencia: x.frecuencia, proxima: x.proxima, dia: M.partes(x.proxima).d, papas: x.tipo === 'gasto' ? (x.papas || 0) : 0, activo: !!x.activo });
          if (!r) est.recurrentes.push(obj);
          M.generarRecurrentes(est, app.hoy, () => E.nuevoId('mov'));
        }, r ? 'Recurrente actualizado' : 'Recurrente creado');
      },
      eliminar: r ? () => { app.mutar(est => { est.recurrentes = est.recurrentes.filter(q => q.id !== r.id); }, 'Recurrente eliminado'); } : null,
    });
  }

  /** Alta / edición de meta. */
  function meta(id) {
    const app = A();
    const mt = id ? app.estado.metas.find(x => x.id === id) : null;
    const v = mt ? { ...mt, esFondo: mt.auto === 'fondo' } : { vinculo: 'apartado', prioridad: 'media', icono: 'target', color: UI.COLORES[2] };
    UI.formulario({
      titulo: mt ? 'Editar meta' : 'Nueva meta', icono: 'target',
      campos: [
        { n: 'nombre', l: 'Nombre', req: true, ph: 'Ej. Capital para mi negocio' },
        { n: 'esFondo', l: 'Fondo de emergencia', t: 'checkbox', texto: `Fondo de emergencia inteligente (${app.estado.config.fondoMeses} meses × tu gasto promedio)` },
        { n: 'objetivo', l: 'Monto objetivo', t: 'money', ancho: 'mitad', si: x => !x.esFondo },
        { n: 'fechaLimite', l: 'Fecha límite', t: 'date', ancho: 'mitad' },
        { n: 'vinculo', l: 'El dinero está en…', t: 'select', ancho: 'mitad', op: [{ v: 'apartado', l: 'Un apartado' }, { v: 'cuenta', l: 'Una cuenta' }, { v: 'manual', l: 'Lo actualizo a mano' }] },
        { n: 'vinculoApartado', l: 'Apartado', t: 'select', op: app.opApartados(), ancho: 'mitad', si: x => x.vinculo === 'apartado' },
        { n: 'vinculoCuenta', l: 'Cuenta asignada', t: 'select', op: app.opCuentas(c => !M.esDeuda(c)), ancho: 'mitad', si: x => x.vinculo === 'cuenta' },
        { n: 'actualManual', l: 'Llevo ahorrado', t: 'money', ancho: 'mitad', si: x => x.vinculo === 'manual' },
        { n: 'prioridad', l: 'Prioridad', t: 'select', op: [{ v: 'alta', l: 'Alta' }, { v: 'media', l: 'Media' }, { v: 'baja', l: 'Baja' }], ancho: 'mitad' },
        { n: 'icono', l: 'Ícono', t: 'icono' },
        { n: 'color', l: 'Color', t: 'color' },
      ],
      valores: { ...v, vinculoApartado: v.vinculo === 'apartado' ? v.vinculoId : (app.estado.apartados[0] || {}).id, vinculoCuenta: v.vinculo === 'cuenta' ? v.vinculoId : '' },
      onGuardar(x) {
        if (!x.esFondo && !(x.objetivo > 0)) return 'Escribe el monto objetivo.';
        app.mutar(est => {
          const obj = mt ? est.metas.find(q => q.id === mt.id) : { id: E.nuevoId('meta') };
          Object.assign(obj, { nombre: x.nombre, objetivo: x.objetivo || 0, auto: x.esFondo ? 'fondo' : null, fechaLimite: x.fechaLimite || null, vinculo: x.vinculo, vinculoId: x.vinculo === 'apartado' ? x.vinculoApartado : x.vinculo === 'cuenta' ? x.vinculoCuenta : null, actualManual: x.actualManual || 0, prioridad: x.prioridad, icono: x.icono || 'target', color: x.color || UI.COLORES[2] });
          if (!mt) est.metas.push(obj);
        }, mt ? 'Meta actualizada' : 'Meta creada');
      },
      eliminar: mt ? () => { app.mutar(est => { est.metas = est.metas.filter(q => q.id !== mt.id); }, 'Meta eliminada'); } : null,
    });
  }

  /** Alta / edición de categoría. */
  function categoria(id) {
    const app = A();
    const c = id ? app.categoria(id) : null;
    UI.formulario({
      titulo: c ? 'Editar categoría' : 'Nueva categoría', icono: c ? c.icono : 'tag', color: c ? c.color : null,
      campos: [
        { n: 'nombre', l: 'Nombre', req: true },
        { n: 'tipo', l: 'Tipo', t: 'select', op: [{ v: 'gasto', l: 'Gasto' }, { v: 'ingreso', l: 'Ingreso' }], ancho: 'mitad' },
        { n: 'grupo', l: 'Grupo (para 50/30/20)', t: 'select', op: [{ v: 'necesidad', l: 'Necesidad (50 %)' }, { v: 'deseo', l: 'Deseo (30 %)' }, { v: 'ahorro', l: 'Ahorro / inversión (20 %)' }], ancho: 'mitad', si: x => x.tipo === 'gasto' },
        { n: 'icono', l: 'Ícono', t: 'icono' },
        { n: 'color', l: 'Color', t: 'color' },
      ],
      valores: c ? { ...c } : { tipo: 'gasto', grupo: 'deseo', icono: 'tag', color: UI.COLORES[1] },
      onGuardar(x) {
        app.mutar(est => {
          const obj = c ? est.categorias.find(q => q.id === c.id) : { id: E.nuevoId('cat') };
          Object.assign(obj, { nombre: x.nombre, tipo: x.tipo, grupo: x.tipo === 'ingreso' ? 'ingreso' : x.grupo, icono: x.icono || 'tag', color: x.color || UI.COLORES[1] });
          if (!c) est.categorias.push(obj);
        }, c ? 'Categoría actualizada' : 'Categoría creada');
      },
      eliminar: c ? async () => {
        const n = app.estado.movimientos.filter(m => m.categoriaId === c.id).length;
        const ok = await UI.confirmar({ titulo: `Eliminar ${c.nombre}`, peligro: true, mensaje: n ? `${n} movimientos pasarán a "Otros".` : 'Se eliminará la categoría.', textoOk: 'Eliminar' });
        if (!ok) return false;
        app.mutar(est => {
          const otros = c.tipo === 'ingreso' ? 'cat_otrosing' : 'cat_otros';
          est.movimientos.forEach(m => { if (m.categoriaId === c.id) m.categoriaId = otros; });
          est.categorias = est.categorias.filter(q => q.id !== c.id);
          delete est.presupuesto.montos[c.id]; delete est.papas[c.id];
        }, 'Categoría eliminada');
      } : null,
    });
  }

  /** Opción externa para el comparador (cuentas que aún no tengo). */
  function opcionComparador(id) {
    const app = A();
    const o = id ? app.estado.opcionesComparador.find(x => x.id === id) : null;
    UI.formulario({
      titulo: o ? 'Editar opción' : 'Nueva opción para comparar', icono: 'percent', subtitulo: 'Cuentas o instrumentos que aún no tienes pero quieres comparar.',
      campos: [
        { n: 'nombre', l: 'Nombre', req: true, ph: 'Ej. Klar, Stori, Hey Banco' },
        { n: 'tramos', l: 'Tasa anual por tramos', etiqueta: ETQ_VERIFICA, t: 'tramos' },
        { n: 'capitalizacion', l: 'Capitalización', t: 'select', op: [{ v: 'diaria', l: 'Diaria' }, { v: 'mensual', l: 'Mensual' }, { v: 'vencimiento', l: 'Al vencimiento' }], ancho: 'mitad' },
        { n: 'plazo', l: 'Plazo (días)', t: 'number', ancho: 'mitad', si: x => x.capitalizacion === 'vencimiento' },
        { n: 'promoTasa', l: 'Tasa promocional', t: 'pct', ancho: 'tercio' },
        { n: 'promoDias', l: 'Días', t: 'number', ancho: 'tercio' },
        { n: 'promoTope', l: 'Tope promo', t: 'money', ancho: 'tercio' },
        { n: 'aplicaISR', l: 'ISR', t: 'checkbox', texto: 'Descontar retención de ISR' },
      ],
      valores: o ? { ...o, promoTasa: o.promo && o.promo.tasa, promoDias: o.promo && o.promo.dias, promoTope: o.promo && o.promo.tope } : { tramos: [{ hasta: null, tasa: 7 }], capitalizacion: 'diaria', aplicaISR: true, plazo: 28 },
      onGuardar(x) {
        app.mutar(est => {
          const obj = o ? est.opcionesComparador.find(q => q.id === o.id) : { id: E.nuevoId('op') };
          Object.assign(obj, { nombre: x.nombre, tramos: x.tramos, capitalizacion: x.capitalizacion, plazo: x.plazo || 28, promo: x.promoTasa > 0 ? { tasa: x.promoTasa, dias: x.promoDias || 0, tope: x.promoTope || 0 } : null, aplicaISR: !!x.aplicaISR });
          if (!o) est.opcionesComparador.push(obj);
        }, o ? 'Opción actualizada' : 'Opción agregada');
      },
      eliminar: o ? () => { app.mutar(est => { est.opcionesComparador = est.opcionesComparador.filter(q => q.id !== o.id); }, 'Opción eliminada'); } : null,
    });
  }

  /** Fuente de ingreso (sueldo, aguinaldo, beca, freelance…). */
  function fuenteIngreso(id) {
    const app = A();
    const f = id ? app.estado.ingresos.fuentes.find(x => x.id === id) : null;
    const cfg = app.estado.config;
    UI.formulario({
      titulo: f ? 'Editar ingreso' : 'Nuevo ingreso', icono: 'briefcase',
      campos: [
        { n: 'tipo', l: 'Tipo', t: 'select', op: [{ v: 'sueldo', l: 'Sueldo' }, { v: 'aguinaldo', l: 'Aguinaldo' }, { v: 'prima', l: 'Prima vacacional' }, { v: 'beca', l: 'Beca de practicante' }, { v: 'freelance', l: 'Freelance' }, { v: 'otro', l: 'Otro' }], ancho: 'mitad' },
        { n: 'frecuencia', l: 'Frecuencia', t: 'select', op: [{ v: 'quincenal', l: 'Quincenal' }, { v: 'mensual', l: 'Mensual' }, { v: 'semanal', l: 'Semanal' }, { v: 'anual', l: 'Anual' }, { v: 'unico', l: 'Único / variable' }], ancho: 'mitad' },
        { n: 'nombre', l: 'Descripción', req: true, ph: 'Ej. Sueldo en Siemens' },
        { n: 'bruto', l: 'Bruto (por pago)', t: 'money', ancho: 'mitad' },
        { n: 'neto', l: 'Neto (lo que te llega)', t: 'money', ancho: 'mitad', ayuda: 'Vacío = se estima con ISR + IMSS.' },
      ],
      valores: f ? { ...f } : { tipo: 'sueldo', frecuencia: 'quincenal' },
      onCambio(x, el) {
        const box = el.querySelector('[data-vista-previa]');
        if (x.tipo === 'sueldo' && x.bruto > 0 && ['quincenal', 'mensual'].includes(x.frecuencia)) {
          const mult = x.frecuencia === 'quincenal' ? 2 : 1;
          const r = Fz.sueldoNeto(x.bruto * mult, { tablaAnual: cfg.tablaISR, umaDiaria: cfg.umaDiaria, subsidioPct: cfg.subsidioPct, subsidioTope: cfg.subsidioTope, imssPct: cfg.imssPct, imssExcedentePct: cfg.imssExcedentePct, factorIntegracion: cfg.factorIntegracion });
          box.innerHTML = `<div class="mensaje mt">${UI.icono('calculator')}<span>Neto estimado: <strong>${F.dinero(r.neto / mult)}</strong> por ${x.frecuencia === 'quincenal' ? 'quincena' : 'mes'} (ISR ${F.dinero(r.isr / mult)} · IMSS ${F.dinero(r.imss / mult)}). Es una estimación.</span></div>`;
          box.dataset.neto = (r.neto / mult).toFixed(2);
        } else { box.innerHTML = ''; delete box.dataset.neto; }
      },
      onGuardar(x, api) {
        const est = api.el.querySelector('[data-vista-previa]').dataset.neto;
        const neto = x.neto || (est ? Number(est) : x.bruto) || 0;
        app.mutar(st => {
          const obj = f ? st.ingresos.fuentes.find(q => q.id === f.id) : { id: E.nuevoId('ing') };
          Object.assign(obj, { tipo: x.tipo, nombre: x.nombre, bruto: x.bruto || neto, neto, frecuencia: x.frecuencia });
          if (!f) st.ingresos.fuentes.push(obj);
        }, f ? 'Ingreso actualizado' : 'Ingreso agregado');
      },
      eliminar: f ? () => { app.mutar(st => { st.ingresos.fuentes = st.ingresos.fuentes.filter(q => q.id !== f.id); }, 'Ingreso eliminado'); } : null,
    });
  }

  window.Forms = { PLANTILLAS, nuevaCuenta, cuenta, actualizarSaldo, tasa, describirTramos, apartado, deposito, cuentaPrincipalApartado, movimiento, recurrente, meta, categoria, opcionComparador, fuenteIngreso, ETQ_VERIFICA };

  /* ---------- Acciones globales para abrir formularios ---------- */
  document.addEventListener('DOMContentLoaded', () => {
    const app = A();
    app.accion('nueva-cuenta', () => nuevaCuenta());
    app.accion('editar-cuenta', d => cuenta(d.id));
    app.accion('actualizar-saldo', d => actualizarSaldo(d.id));
    app.accion('editar-tasa', d => tasa(d.id));
    app.accion('nuevo-apartado', () => apartado());
    app.accion('editar-apartado', d => apartado(d.id));
    app.accion('depositar', d => deposito({ apartadoId: d.apartado, cuentaId: d.cuenta, tipo: d.tipo }));
    app.accion('nuevo-movimiento', d => movimiento({ tipo: d.tipo }));
    app.accion('editar-movimiento', d => movimiento(null, d.id));
    app.accion('nuevo-recurrente', () => recurrente());
    app.accion('editar-recurrente', d => recurrente(d.id));
    app.accion('nueva-meta', () => meta());
    app.accion('editar-meta', d => meta(d.id));
    app.accion('nueva-categoria', () => categoria());
    app.accion('editar-categoria', d => categoria(d.id));
    app.accion('nueva-opcion', () => opcionComparador());
    app.accion('editar-opcion', d => opcionComparador(d.id));
    app.accion('nuevo-ingreso', () => fuenteIngreso());
    app.accion('editar-ingreso', d => fuenteIngreso(d.id));
  });
})();
