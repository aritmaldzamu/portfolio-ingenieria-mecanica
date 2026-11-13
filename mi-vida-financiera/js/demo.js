/* =====================================================================
 * demo.js — Genera datos de ejemplo realistas y deterministas,
 * relativos a la fecha de hoy (8 meses de historia).
 * Las tasas son EJEMPLOS: verifica la tasa actual en cada app.
 * ===================================================================== */
(function (raiz) {
  'use strict';
  const nodo = typeof module !== 'undefined' && module.exports;
  const M = nodo ? require('./motor.js') : raiz.Motor;
  const E = nodo ? require('./estado.js') : raiz.Estado;
  const Fz = nodo ? require('./finanzas.js') : raiz.Finanzas;

  /** Generador pseudoaleatorio con semilla (mulberry32) para datos estables. */
  function rng(semilla) {
    let a = semilla >>> 0;
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function generar(hoy) {
    hoy = hoy || M.hoyISO();
    const r = rng(20261113);
    const entre = (a, b) => Math.round((a + r() * (b - a)) / 10) * 10;
    const e = E.estadoVacio();
    e.demo = true;
    e.config.nombre = 'Arith';
    let orden = 1;
    const o = () => orden++;
    const inicio = M.sumarMeses(M.inicioMes(hoy), -8);
    const hp = M.partes(hoy);
    const diaCorte = ((hp.d + 3 - 1) % 28) + 1;
    const diaPagoTdc = ((diaCorte + 20 - 1) % 28) + 1;
    const cambioNu = M.sumarDias(hoy, -55);
    const altaRevolut = M.sumarMeses(inicio, 1);
    const altaCetes = M.sumarMeses(inicio, 2);
    const inicioPrestamo = M.sumarMeses(inicio, 2);

    /* ---------- Cuentas ---------- */
    const cuenta = (c) => ({ color: '#7c6cff', icono: null, ultimos4: '', aplicaISR: true, historialSaldos: [], historialTasas: [], archivada: false, nota: '', ...c });
    e.cuentas = [
      cuenta({ id: 'cta_bbva', nombre: 'BBVA Nómina', institucion: 'BBVA', tipo: 'debito', color: '#3b82f6', ultimos4: '4821', aplicaISR: false,
        historialSaldos: [{ id: 's1', fecha: inicio, saldo: 6500, creado: o() }] }),
      cuenta({ id: 'cta_nu', nombre: 'Nu Cajitas', institucion: 'Nu México', tipo: 'rendimiento', color: '#a855f7', capitalizacion: 'diaria',
        historialSaldos: [{ id: 's2', fecha: inicio, saldo: 12000, creado: o() }],
        historialTasas: [
          { fecha: inicio, tramos: [{ hasta: 25000, tasa: 8.0 }, { hasta: null, tasa: 6.0 }], creado: o() },
          { fecha: cambioNu, tramos: [{ hasta: 25000, tasa: 7.25 }, { hasta: null, tasa: 5.5 }], creado: o() },
        ] }),
      cuenta({ id: 'cta_revolut', nombre: 'Revolut', institucion: 'Revolut', tipo: 'rendimiento', color: '#0ea5e9', capitalizacion: 'diaria',
        historialSaldos: [{ id: 's3', fecha: altaRevolut, saldo: 0, creado: o() }],
        historialTasas: [
          { fecha: altaRevolut, tramos: [{ hasta: null, tasa: 7.5 }], creado: o() },
          { fecha: M.sumarDias(hoy, -40), tramos: [{ hasta: null, tasa: 7.25 }], creado: o() },
        ] }),
      cuenta({ id: 'cta_cetes', nombre: 'Cetes 28 días', institucion: 'Cetesdirecto', tipo: 'cetes', color: '#10b981', capitalizacion: 'vencimiento', plazo: 28,
        fechaVencimiento: M.sumarDias(hoy, 4), reinvertir: true,
        historialSaldos: [{ id: 's4', fecha: altaCetes, saldo: 0, creado: o() }],
        historialTasas: [
          { fecha: altaCetes, tramos: [{ hasta: null, tasa: 7.35 }], creado: o() },
          { fecha: M.sumarDias(hoy, -80), tramos: [{ hasta: null, tasa: 7.2 }], creado: o() },
          { fecha: M.sumarDias(hoy, -24), tramos: [{ hasta: null, tasa: 7.05 }], creado: o() },
        ] }),
      cuenta({ id: 'cta_efectivo', nombre: 'Efectivo', institucion: 'Efectivo', tipo: 'efectivo', color: '#84cc16', aplicaISR: false,
        historialSaldos: [{ id: 's5', fecha: inicio, saldo: 1500, creado: o() }] }),
      cuenta({ id: 'cta_tdc', nombre: 'Tarjeta Nu', institucion: 'Nu México', tipo: 'credito', color: '#c026d3', ultimos4: '7730', aplicaISR: false,
        credito: { limite: 22000, diaCorte, diaPago: diaPagoTdc, tasaAnual: 62, pagoNoIntereses: 0, pagoMinimo: 0 },
        historialSaldos: [{ id: 's6', fecha: inicio, saldo: 0, creado: o() }] }),
      cuenta({ id: 'cta_afore', nombre: 'Mi Afore', institucion: 'Afore', tipo: 'afore', color: '#f59e0b', capitalizacion: 'mensual', aplicaISR: false,
        historialSaldos: [{ id: 's7', fecha: inicio, saldo: 17200, creado: o() }, { id: 's8', fecha: M.sumarDias(hoy, -10), saldo: 18640, creado: o() }],
        historialTasas: [{ fecha: inicio, tramos: [{ hasta: null, tasa: 8.0 }], creado: o() }] }),
      cuenta({ id: 'cta_prestamo', nombre: 'Crédito personal', institucion: 'Banorte', tipo: 'prestamo', color: '#ef4444', aplicaISR: false, capitalizacion: 'mensual',
        prestamo: { montoOriginal: 12000, tasaAnual: 32, plazoMeses: 12, pagoMensual: Math.round(Fz.pagoMensual(12000, 32, 12) * 100) / 100, diaPago: 10, fechaInicio: inicioPrestamo },
        historialSaldos: [{ id: 's9', fecha: inicioPrestamo, saldo: 12000, creado: o() }] }),
    ];
    e.config.cuentaPrincipalId = 'cta_bbva';

    /* ---------- Opciones externas para el comparador ---------- */
    e.opcionesComparador = [
      { id: 'op_mp', nombre: 'Mercado Pago', tramos: [{ hasta: 25000, tasa: 7.0 }, { hasta: null, tasa: 0 }], capitalizacion: 'diaria', aplicaISR: true },
      { id: 'op_openbank', nombre: 'Openbank (promo)', tramos: [{ hasta: null, tasa: 6.5 }], promo: { tasa: 10, dias: 90, tope: 50000 }, capitalizacion: 'diaria', aplicaISR: true },
      { id: 'op_gbm', nombre: 'GBM Smart Cash', tramos: [{ hasta: null, tasa: 6.8 }], capitalizacion: 'diaria', aplicaISR: true },
    ];

    /* ---------- Apartados ---------- */
    e.apartados = [
      { id: 'ap_fondo', nombre: 'Fondo de emergencia', icono: 'shield', color: '#2fd197', meta: 60000, fechaMeta: null, nota: 'Solo para emergencias reales.', aportacionMensual: 1500, esFondo: true },
      { id: 'ap_coche', nombre: 'Coche', icono: 'car', color: '#4aa8ff', meta: 90000, fechaMeta: M.sumarMeses(hoy, 14, 15), nota: 'Enganche + seguro del primer año.', aportacionMensual: 2500 },
      { id: 'ap_negocio', nombre: 'Mi negocio', icono: 'store', color: '#a78bfa', meta: 150000, fechaMeta: M.sumarMeses(hoy, 36, 1), nota: 'Capital semilla para taller de automatización.', aportacionMensual: 1000 },
      { id: 'ap_viaje', nombre: 'Viaje', icono: 'plane', color: '#f5a524', meta: 15000, fechaMeta: M.sumarMeses(hoy, 5, 1), nota: '', aportacionMensual: 800 },
      { id: 'ap_fuera', nombre: 'Irme a trabajar fuera', icono: 'globe', color: '#2dd4bf', meta: 60000, fechaMeta: null, nota: 'Visa, vuelo y primeros 2 meses.', aportacionMensual: 700 },
    ];

    /* ---------- Recurrentes ---------- */
    const recurrente = (x) => ({ activo: true, papas: 0, cuentaDestinoId: null, ...x });
    e.recurrentes = [
      recurrente({ id: 'rec_sueldo', nombre: 'Sueldo quincenal', tipo: 'ingreso', monto: 9185, categoriaId: 'cat_sueldo', cuentaId: 'cta_bbva', frecuencia: 'quincenal', proxima: M.sumarDias(inicio, 14) }),
      recurrente({ id: 'rec_spotify', nombre: 'Spotify', tipo: 'gasto', monto: 129, categoriaId: 'cat_suscripciones', cuentaId: 'cta_tdc', frecuencia: 'mensual', dia: 5, proxima: M.sumarDias(inicio, 4) }),
      recurrente({ id: 'rec_celular', nombre: 'Plan de celular', tipo: 'gasto', monto: 299, categoriaId: 'cat_celular', cuentaId: 'cta_bbva', frecuencia: 'mensual', dia: 20, proxima: M.sumarDias(inicio, 19) }),
      recurrente({ id: 'rec_gym', nombre: 'Gimnasio', tipo: 'gasto', monto: 450, categoriaId: 'cat_salud', cuentaId: 'cta_tdc', frecuencia: 'mensual', dia: 2, proxima: M.sumarDias(inicio, 1) }),
      recurrente({ id: 'rec_luz', nombre: 'Luz e internet de la casa', tipo: 'gasto', monto: 780, categoriaId: 'cat_servicios', cuentaId: null, frecuencia: 'mensual', dia: 12, papas: 100, proxima: M.sumarDias(inicio, 11) }),
    ];
    M.generarRecurrentes(e, hoy, () => E.nuevoId('mov'));
    // Orden determinista de los recurrentes generados (fecha temprana en el día).
    for (const m of e.movimientos) m.creado = o();

    /* ---------- Movimientos aleatorios y depósitos, mes a mes ---------- */
    const gasto = (fecha, monto, cat, cta, nota, papas) => e.movimientos.push({ id: E.nuevoId('mov'), fecha, tipo: 'gasto', monto, categoriaId: cat, cuentaId: cta, nota: nota || '', papas: papas || 0, creado: o() });
    const deposito = (fecha, monto, cta, ap, tasa, origen) => e.flujosApartado.push({ id: E.nuevoId('flu'), fecha, tipo: 'deposito', monto, cuentaId: cta, apartadoId: ap, tasa, origen: origen || 'cta_bbva', nota: '', creado: o() });
    const transferencia = (fecha, monto, de, a, nota) => e.movimientos.push({ id: E.nuevoId('mov'), fecha, tipo: 'transferencia', monto, cuentaId: de, cuentaDestinoId: a, nota: nota || '', papas: 0, creado: o() });

    // Saldo inicial de Nu asignado al fondo de emergencia.
    deposito(inicio, 10000, 'cta_nu', 'ap_fondo', 8.0, 'asignar');

    const lugaresComida = ['Tacos El Güero', 'Cafetería', 'Comida corrida', 'Pizza con amigos', 'Sushi', 'Cemitas', 'Starbucks', 'Hamburguesas'];
    const dHoy = M.D(hoy);
    for (let k = 0; k <= 8; k++) {
      const mes = M.sumarMeses(inicio, k);
      const p = M.partes(mes);
      const ult = M.diasEnMes(p.y, p.m);
      const f = (d) => { const x = `${p.y}-${String(p.m).padStart(2, '0')}-${String(Math.min(d, ult)).padStart(2, '0')}`; return M.D(x) <= dHoy ? x : null; };
      const actual = k === 8;
      // Comida (restaurantes), mayormente con tarjeta
      const nComida = actual ? 9 : 10 + Math.floor(r() * 4);
      for (let i = 0; i < nComida; i++) { const fe = f(1 + Math.floor(r() * (actual ? hp.d : ult))); if (fe) gasto(fe, entre(90, 330), 'cat_comida', r() < 0.7 ? 'cta_tdc' : 'cta_efectivo', lugaresComida[Math.floor(r() * lugaresComida.length)]); }
      // Súper: mis papás cubren el 50 %
      for (let i = 0; i < 3; i++) { const fe = f(3 + i * 9); if (fe) gasto(fe, entre(650, 1400), 'cat_super', 'cta_bbva', 'Súper semanal', 50); }
      // Transporte
      for (let i = 0; i < 6; i++) { const fe = f(1 + Math.floor(r() * ult)); if (fe) gasto(fe, entre(60, 190), 'cat_transporte', 'cta_tdc', 'Uber / DiDi'); }
      // Gasolina
      for (let i = 0; i < 2; i++) { const fe = f(8 + i * 14); if (fe) gasto(fe, entre(650, 900), 'cat_gasolina', 'cta_bbva', 'Gasolina'); }
      // Salidas
      for (let i = 0; i < 2; i++) { const fe = f(6 + Math.floor(r() * 20)); if (fe) gasto(fe, entre(350, 850), 'cat_salidas', 'cta_tdc', r() < 0.5 ? 'Cine y cena' : 'Concierto / bar'); }
      // Ropa cada dos meses
      if (k % 2 === 1) { const fe = f(18); if (fe) gasto(fe, entre(600, 1400), 'cat_ropa', 'cta_tdc', 'Ropa'); }
      // Eventos especiales
      if (k === 2) { const fe = f(9); if (fe) gasto(fe, 3500, 'cat_educacion', 'cta_bbva', 'Curso de PLC Siemens'); }
      if (k === 4) { const fe = f(21); if (fe) gasto(fe, 4800, 'cat_viajes', 'cta_tdc', 'Fin de semana en Oaxaca'); }
      if (k === 5) { const fe = f(23); if (fe) e.movimientos.push({ id: E.nuevoId('mov'), fecha: fe, tipo: 'ingreso', monto: 4500, categoriaId: 'cat_freelance', cuentaId: 'cta_bbva', nota: 'Diseño CAD freelance', papas: 0, creado: o() }); }
      if (k === 6) { const fe = f(14); if (fe) gasto(fe, 900, 'cat_regalos', 'cta_tdc', 'Cumpleaños de mamá'); }
      if (k === 7) { const fe = f(25); if (fe) gasto(fe, 1250, 'cat_salud', 'cta_bbva', 'Dentista'); }

      // Depósitos a apartados (después de la quincena)
      const d16 = f(16), dUlt = f(ult);
      const ctaCoche = k >= 1 ? 'cta_revolut' : 'cta_nu';
      const tasaNu = (fe) => M.D(fe) >= M.D(cambioNu) ? 7.25 : 8.0;
      const tasaRev = (fe) => M.D(fe) >= M.D(hoy) - 40 ? 7.25 : 7.5;
      const tasaCetes = (fe) => M.D(fe) >= M.D(hoy) - 24 ? 7.05 : (M.D(fe) >= M.D(hoy) - 80 ? 7.2 : 7.35);
      if (d16) {
        deposito(d16, 1500, 'cta_nu', 'ap_fondo', tasaNu(d16));
        deposito(d16, 2500, ctaCoche, 'ap_coche', ctaCoche === 'cta_nu' ? tasaNu(d16) : tasaRev(d16));
      }
      if (dUlt) {
        if (k >= 1) deposito(dUlt, 1000, 'cta_revolut', 'ap_negocio', tasaRev(dUlt));
        deposito(dUlt, 800, 'cta_nu', 'ap_viaje', tasaNu(dUlt));
        if (k >= 3) deposito(dUlt, 700, 'cta_revolut', 'ap_fuera', tasaRev(dUlt));
      }
      // Cetes: compras cada 2 meses
      if (k >= 2 && k % 2 === 0) { const fe = f(17); if (fe) deposito(fe, k === 4 ? 5000 : 4000, 'cta_cetes', k === 4 ? 'ap_fondo' : 'ap_coche', tasaCetes(fe)); }
      // Pago del crédito personal
      if (k >= 3) { const fe = f(10); if (fe) transferencia(fe, e.cuentas.find(c => c.id === 'cta_prestamo').prestamo.pagoMensual, 'cta_bbva', 'cta_prestamo', 'Pago crédito personal'); }
      // Retiro de efectivo
      { const fe = f(4); if (fe) transferencia(fe, 800, 'cta_bbva', 'cta_efectivo', 'Retiro en cajero'); }
      if (actual) { const fe = f(Math.min(5, hp.d)); if (fe) e.movimientos.push({ id: E.nuevoId('mov'), fecha: fe, tipo: 'ingreso', monto: 1350, categoriaId: 'cat_freelance', cuentaId: 'cta_bbva', nota: 'Venta de piezas impresas en 3D', papas: 0, creado: o() }); }
    }

    // Pago de la tarjeta: cada mes, el día de pago se liquida el saldo al último corte.
    const tmp = M.calcular(e, hoy);
    for (let k = 0; k <= 8; k++) {
      const mes = M.sumarMeses(inicio, k);
      const pago = M.proximoDiaDelMes(mes, diaPagoTdc);
      if (M.D(pago) > dHoy || M.D(pago) <= M.D(inicio) + 20) continue;
      let corte = M.proximoDiaDelMes(M.sumarDias(pago, -32), diaCorte);
      const saldoCorte = M.calcular(e, corte).cuentas.cta_tdc.saldo;
      if (saldoCorte > 1) transferencia(pago, Math.round(saldoCorte * 100) / 100, 'cta_bbva', 'cta_tdc', 'Pago tarjeta Nu');
    }
    void tmp;

    // Datos de la tarjeta para el próximo pago
    const calc = M.calcular(e, hoy);
    const tdc = e.cuentas.find(c => c.id === 'cta_tdc');
    tdc.credito.pagoNoIntereses = Math.round(calc.cuentas.cta_tdc.saldo);
    tdc.credito.pagoMinimo = Math.round(Math.max(calc.cuentas.cta_tdc.saldo * 0.015 * 1.16, 22000 * 0.0125));

    /* ---------- Presupuesto ---------- */
    e.presupuesto = {
      plantilla: 'personalizado', ingreso: null,
      montos: { cat_comida: 2200, cat_super: 1100, cat_transporte: 800, cat_gasolina: 1600, cat_suscripciones: 400, cat_salud: 900, cat_celular: 300, cat_ropa: 600, cat_salidas: 1200, cat_educacion: 500, cat_regalos: 300, cat_viajes: 800, cat_otros: 300 },
    };
    // Que este mes Comida vaya ~15 % arriba para mostrar la alerta.
    const fl = M.flujoMes(e, M.mesDe(hoy));
    if (fl.porCategoria.cat_comida) e.presupuesto.montos.cat_comida = Math.round(fl.porCategoria.cat_comida / 1.15 / 10) * 10;
    e.papas = { cat_servicios: 100, cat_super: 50 };

    /* ---------- Metas ---------- */
    e.metas = [
      { id: 'meta_fondo', nombre: 'Fondo de emergencia', objetivo: 0, auto: 'fondo', fechaLimite: M.sumarMeses(hoy, 12, 1), vinculo: 'apartado', vinculoId: 'ap_fondo', prioridad: 'alta', icono: 'shield', color: '#2fd197' },
      { id: 'meta_negocio', nombre: 'Capital para mi negocio', objetivo: 150000, fechaLimite: M.sumarMeses(hoy, 36, 1), vinculo: 'apartado', vinculoId: 'ap_negocio', prioridad: 'media', icono: 'store', color: '#a78bfa' },
      { id: 'meta_fuera', nombre: 'Mudanza / trabajar fuera de México', objetivo: 60000, fechaLimite: M.sumarMeses(hoy, 20, 1), vinculo: 'apartado', vinculoId: 'ap_fuera', prioridad: 'media', icono: 'globe', color: '#2dd4bf' },
      { id: 'meta_laptop', nombre: 'Laptop / herramientas', objetivo: 25000, fechaLimite: M.sumarMeses(hoy, 6, 1), vinculo: 'manual', actualManual: 6500, prioridad: 'baja', icono: 'laptop', color: '#f472b6' },
    ];

    /* ---------- Ingresos, PPR y Afore ---------- */
    e.ingresos.fuentes = [
      { id: 'ing_sueldo', tipo: 'sueldo', nombre: 'Sueldo (Ingeniero de controles Jr.)', bruto: 11000, neto: 9185, frecuencia: 'quincenal' },
      { id: 'ing_aguinaldo', tipo: 'aguinaldo', nombre: 'Aguinaldo (15 días)', bruto: 11000, neto: 10200, frecuencia: 'anual' },
      { id: 'ing_prima', tipo: 'prima', nombre: 'Prima vacacional (12 días × 25 %)', bruto: 2200, neto: 2200, frecuencia: 'anual' },
      { id: 'ing_freelance', tipo: 'freelance', nombre: 'Freelance CAD', bruto: 4500, neto: 4500, frecuencia: 'unico' },
    ];
    e.ppr = { aportacionMensual: 1000, rendimiento: 9, edadRetiro: 65, ingresoAnual: null, tasaMarginal: null };
    e.afore = { saldo: 18640, aportacionesVoluntarias: 200, rendimiento: 8, actualizado: M.sumarDias(hoy, -10) };
    e.config.ultimoRespaldo = null;
    return e;
  }

  const Demo = { generar };
  if (nodo) module.exports = Demo; else raiz.Demo = Demo;
})(typeof window !== 'undefined' ? window : globalThis);
