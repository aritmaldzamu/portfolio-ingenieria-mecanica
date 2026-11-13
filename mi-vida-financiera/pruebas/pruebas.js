/* =====================================================================
 * pruebas.js — Pruebas rápidas de las fórmulas, el motor y el parser.
 * Ejecutar:  node pruebas/pruebas.js
 * (También se ejecutan en el navegador abriendo pruebas/pruebas.html)
 * ===================================================================== */
(function (raiz) {
  'use strict';
  const nodo = typeof module !== 'undefined' && module.exports && typeof require === 'function';
  const Fz = nodo ? require('../js/finanzas.js') : raiz.Finanzas;
  const M = nodo ? require('../js/motor.js') : raiz.Motor;
  const P = nodo ? require('../js/parser.js') : raiz.Parser;
  const E = nodo ? require('../js/estado.js') : raiz.Estado;
  const Demo = nodo ? require('../js/demo.js') : raiz.Demo;
  const C = nodo ? require('../js/consejos.js') : raiz.Consejos;

  const resultados = [];
  function prueba(nombre, fn) {
    try { fn(); resultados.push({ nombre, ok: true }); }
    catch (err) { resultados.push({ nombre, ok: false, error: err.message }); }
  }
  function cerca(real, esperado, tol, msg) {
    tol = tol == null ? 0.01 : tol;
    if (!(Math.abs(real - esperado) <= tol)) throw new Error(`${msg || ''} esperado ${esperado}, obtuve ${real}`);
  }
  function igual(real, esperado, msg) {
    if (real !== esperado) throw new Error(`${msg || ''} esperado ${JSON.stringify(esperado)}, obtuve ${JSON.stringify(real)}`);
  }

  /* ---------- Interés compuesto ---------- */
  prueba('Interés compuesto diario: $10,000 al 10 % por 365 días = $1,051.56', () => {
    cerca(Fz.interesCompuestoDiario(10000, 10, 365), 1051.56, 0.01);
  });
  prueba('Capitalización mensual: $10,000 al 12 % un año = $11,268.25', () => {
    cerca(Fz.crecer(10000, 12, 365, 'mensual'), 11268.25, 0.01);
  });
  prueba('Cetes 28 días al 7 % (base 360): $10,000 a 28 días = $10,054.44', () => {
    cerca(Fz.crecer(10000, 7, 28, 'vencimiento', 28), 10054.44, 0.01);
  });
  prueba('Rendimiento diario de $25,000 al 7.3 % = $5.00', () => {
    cerca(Fz.rendimientos(25000, 7.3, 'diaria').diario, 5.0, 0.0001);
  });

  /* ---------- Tasas escalonadas ---------- */
  const nu = [{ hasta: 25000, tasa: 15 }, { hasta: null, tasa: 7 }];
  prueba('Escalonada: $40,000 con 15 % hasta $25k y 7 % excedente → interés $4,800', () => {
    cerca(Fz.interesEscalonado(40000, nu), 3750 + 1050, 0.001);
  });
  prueba('Escalonada: tasa efectiva de $40,000 = 12 %', () => {
    cerca(Fz.tasaEfectiva(40000, nu), 12, 1e-9);
  });
  prueba('Tasa con tope: 10 % hasta $25k y nada después → $50,000 rinde 5 %', () => {
    cerca(Fz.tasaEfectiva(50000, [{ hasta: 25000, tasa: 10 }]), 5, 1e-9);
  });
  prueba('Tramos desordenados se ordenan solos', () => {
    cerca(Fz.interesEscalonado(40000, [{ hasta: null, tasa: 7 }, { hasta: 25000, tasa: 15 }]), 4800, 0.001);
  });
  prueba('Promoción 12 % hasta $10k sobre tasa base 6 %: $20,000 → 9 %', () => {
    cerca(Fz.tasaEfectiva(20000, [{ hasta: null, tasa: 6 }], { tasa: 12, tope: 10000 }), 9, 1e-9);
  });
  prueba('Tasa marginal en el excedente = 7 %', () => {
    cerca(Fz.tasaMarginal(30000, nu), 7, 1e-6);
  });

  /* ---------- GAT ---------- */
  prueba('GAT nominal 10 % capitalización diaria = 10.5156 %', () => {
    cerca(Fz.gatNominal(10, 'diaria'), 10.5156, 0.0001);
  });
  prueba('GAT real con inflación 4 % = 6.2650 %', () => {
    cerca(Fz.gatReal(10.5156, 4), 6.2650, 0.0001);
  });
  prueba('Tasa neta con retención 0.90 % sobre capital', () => {
    cerca(Fz.tasaNeta(7.5, 0.9), 6.6, 1e-9);
    igual(Fz.tasaNeta(0.5, 0.9), 0);
  });

  /* ---------- Ahorro y metas ---------- */
  prueba('Valor futuro: $1,000/mes al 12 % anual cap. mensual por 12 meses = $12,682.50', () => {
    cerca(Fz.valorFuturo(0, 1000, 12, 12, 'mensual').total, 12682.50, 0.01);
  });
  prueba('Meses para meta: $0 + $1,000/mes sin interés para $12,000 = 12', () => {
    igual(Fz.mesesParaMeta(0, 1000, 0, 12000), 12);
  });
  prueba('Aportación necesaria es inversa de valor futuro', () => {
    const pmt = Fz.aportacionNecesaria(5000, 50000, 8, 24, 'mensual');
    cerca(Fz.valorFuturo(5000, pmt, 8, 24, 'mensual').total, 50000, 0.01);
  });

  /* ---------- Amortización ---------- */
  prueba('Pago mensual: $100,000 al 12 % a 12 meses = $8,884.88', () => {
    cerca(Fz.pagoMensual(100000, 12, 12), 8884.88, 0.01);
  });
  prueba('Amortización: liquida en 12 meses e intereses totales $6,618.55', () => {
    const a = Fz.amortizacion(100000, 12, 12);
    igual(a.meses, 12);
    cerca(a.totalInteres, 6618.55, 0.05);
    cerca(a.filas[11].saldo, 0, 0.01);
  });
  prueba('Abono extra reduce plazo e intereses', () => {
    const a = Fz.amortizacion(100000, 12, 12, 0), b = Fz.amortizacion(100000, 12, 12, 2000);
    if (!(b.meses < a.meses && b.totalInteres < a.totalInteres)) throw new Error('no redujo');
  });

  /* ---------- ISR y PPR ---------- */
  const tabla = E.TABLA_ISR_2025;
  prueba('ISR anual de $300,000 con tabla 2025 = $44,064.02', () => {
    cerca(Fz.isrDeTabla(300000, tabla), 44064.02, 0.02);
  });
  prueba('Tasa marginal de $300,000 = 21.36 %', () => {
    igual(Fz.tasaMarginalISR(300000, tabla), 21.36);
  });
  prueba('Deducción PPR: tope 10 % del ingreso', () => {
    const d = Fz.deduccionPPR(50000, 300000, 113.14);
    cerca(d.deducible, 30000, 1e-9);
  });
  prueba('Deducción PPR: tope 5 UMA anuales (113.14 × 365 × 5 = $206,480.50)', () => {
    const d = Fz.deduccionPPR(500000, 5000000, 113.14);
    cerca(d.topeUMA, 206480.5, 0.001);
    cerca(d.deducible, 206480.5, 0.001);
  });
  prueba('Devolución PPR = diferencia de ISR (dentro de un mismo renglón = 21.36 %)', () => {
    cerca(Fz.devolucionISR(300000, 12000, tabla), 12000 * 0.2136, 0.01);
  });
  prueba('Sueldo neto de $22,000 brutos ≈ $18,369 (ISR + IMSS aprox.)', () => {
    const p = { tablaAnual: tabla, umaDiaria: 113.14, subsidioPct: 13.8, subsidioTope: 10171, imssPct: 2.375, imssExcedentePct: 0.4, factorIntegracion: 1.0493 };
    const r = Fz.sueldoNeto(22000, p);
    cerca(r.isr, 3031.22, 0.5);
    cerca(r.neto, 18369, 15);
  });

  /* ---------- Distribución óptima ---------- */
  prueba('Distribución óptima llena primero el tramo de mayor tasa', () => {
    const ops = [
      { id: 'a', nombre: 'A', tramos: [{ hasta: 25000, tasa: 15 }, { hasta: null, tasa: 5 }], capitalizacion: 'diaria' },
      { id: 'b', nombre: 'B', tramos: [{ hasta: null, tasa: 9 }], capitalizacion: 'diaria' },
    ];
    const r = Fz.distribucionOptima(60000, ops);
    const a = r.asignaciones.find(x => x.id === 'a'), b = r.asignaciones.find(x => x.id === 'b');
    cerca(a.monto, 25000, 0.01); cerca(b.monto, 35000, 0.01);
  });
  prueba('Distribución respeta topes con saldo existente', () => {
    const ops = [{ id: 'a', nombre: 'A', tramos: [{ hasta: 25000, tasa: 15 }], saldoExistente: 20000, capitalizacion: 'diaria' }, { id: 'b', nombre: 'B', tramos: [{ hasta: null, tasa: 5 }], capitalizacion: 'diaria' }];
    const r = Fz.distribucionOptima(10000, ops);
    cerca(r.asignaciones.find(x => x.id === 'a').monto, 5000, 0.01);
  });

  /* ---------- Motor: depósitos con tasa y cambio de tasa ---------- */
  prueba('Depósito a tasa guardada y luego cambio de tasa: calcula por periodos', () => {
    const e = E.estadoVacio();
    e.config.retencionISR = 0;
    e.cuentas.push({ id: 'c1', nombre: 'Rev', tipo: 'rendimiento', capitalizacion: 'diaria', aplicaISR: false,
      historialSaldos: [{ fecha: '2026-01-01', saldo: 0, creado: 1 }],
      historialTasas: [{ fecha: '2026-01-01', tramos: [{ hasta: null, tasa: 10 }] }, { fecha: '2026-03-02', tramos: [{ hasta: null, tasa: 5 }] }] });
    e.apartados.push({ id: 'a1', nombre: 'Coche' });
    e.flujosApartado.push({ id: 'f1', fecha: '2026-01-01', tipo: 'deposito', monto: 10000, cuentaId: 'c1', apartadoId: 'a1', tasa: 10, origen: 'externo', creado: 2 });
    const c = M.calcular(e, '2026-04-01');
    // 60 días al 10 % y 30 días al 5 %, capitalización diaria
    const esperado = 10000 * Math.pow(1 + 0.10 / 365, 60) * Math.pow(1 + 0.05 / 365, 30);
    cerca(c.apartados.a1.valor, esperado, 0.001);
    cerca(c.cuentas.c1.saldo, esperado, 0.001);
    cerca(c.sinAsignar.c1, 0, 0.001);
  });
  prueba('Retiro de apartado deja de rendir desde su fecha', () => {
    const e = E.estadoVacio();
    e.cuentas.push({ id: 'c1', nombre: 'Nu', tipo: 'rendimiento', aplicaISR: false, historialSaldos: [], historialTasas: [{ fecha: '2026-01-01', tramos: [{ hasta: null, tasa: 10 }] }] });
    e.apartados.push({ id: 'a1', nombre: 'Viaje' });
    e.flujosApartado.push({ id: 'f1', fecha: '2026-01-01', tipo: 'deposito', monto: 10000, cuentaId: 'c1', apartadoId: 'a1', tasa: 10, origen: 'externo', creado: 1 });
    e.flujosApartado.push({ id: 'f2', fecha: '2026-01-31', tipo: 'retiro', monto: 5000, cuentaId: 'c1', apartadoId: 'a1', destino: 'externo', creado: 2 });
    const c = M.calcular(e, '2026-03-02');
    const f = 1 + 0.10 / 365;
    cerca(c.apartados.a1.valor, 10000 * Math.pow(f, 60) - 5000 * Math.pow(f, 30), 0.001);
  });
  prueba('Transferencia entre cuentas mueve el saldo correctamente (débito → cajita)', () => {
    const e = E.estadoVacio();
    e.cuentas.push({ id: 'd', nombre: 'Débito', tipo: 'debito', historialSaldos: [{ fecha: '2026-01-01', saldo: 5000, creado: 1 }], historialTasas: [] });
    e.cuentas.push({ id: 'k', nombre: 'Cajita', tipo: 'cajita', historialSaldos: [{ fecha: '2026-01-01', saldo: 0, creado: 1 }], historialTasas: [] });
    e.movimientos.push({ id: 'm', fecha: '2026-01-05', tipo: 'transferencia', monto: 2000, cuentaId: 'd', cuentaDestinoId: 'k', creado: 2 });
    const c = M.calcular(e, '2026-01-10');
    cerca(c.cuentas.d.saldo, 3000, 1e-9); cerca(c.cuentas.k.saldo, 2000, 1e-9);
  });
  prueba('Gasto pagado 50 % por mis papás solo descuenta mi parte', () => {
    const e = E.estadoVacio();
    e.cuentas.push({ id: 'd', nombre: 'Débito', tipo: 'debito', historialSaldos: [{ fecha: '2026-01-01', saldo: 1000, creado: 1 }], historialTasas: [] });
    e.movimientos.push({ id: 'm', fecha: '2026-01-05', tipo: 'gasto', monto: 400, papas: 50, categoriaId: 'cat_super', cuentaId: 'd', creado: 2 });
    const c = M.calcular(e, '2026-01-10');
    cerca(c.cuentas.d.saldo, 800, 1e-9);
    const f = M.flujoMes(e, '2026-01');
    cerca(f.gastos, 200, 1e-9); cerca(f.papas, 200, 1e-9);
  });
  prueba('Tarjeta de crédito: gasto aumenta deuda y pago la reduce', () => {
    const e = E.estadoVacio();
    e.cuentas.push({ id: 'd', nombre: 'Débito', tipo: 'debito', historialSaldos: [{ fecha: '2026-01-01', saldo: 5000, creado: 1 }], historialTasas: [] });
    e.cuentas.push({ id: 't', nombre: 'TDC', tipo: 'credito', credito: { limite: 10000 }, historialSaldos: [{ fecha: '2026-01-01', saldo: 0, creado: 1 }], historialTasas: [] });
    e.movimientos.push({ id: 'g', fecha: '2026-01-03', tipo: 'gasto', monto: 1500, cuentaId: 't', creado: 2 });
    e.movimientos.push({ id: 'p', fecha: '2026-01-20', tipo: 'transferencia', monto: 1000, cuentaId: 'd', cuentaDestinoId: 't', creado: 3 });
    const c = M.calcular(e, '2026-01-25');
    cerca(c.cuentas.t.saldo, 500, 1e-9); cerca(c.deudas, 500, 1e-9); cerca(c.patrimonio, 4000 - 500, 1e-9);
  });
  prueba('Recurrente quincenal: 15 y último día del mes', () => {
    igual(M.siguienteFecha({ frecuencia: 'quincenal' }, '2026-02-15'), '2026-02-28');
    igual(M.siguienteFecha({ frecuencia: 'quincenal' }, '2026-02-28'), '2026-03-15');
    igual(M.siguienteFecha({ frecuencia: 'mensual', dia: 31 }, '2026-01-31'), '2026-02-28');
  });

  /* ---------- Parser ---------- */
  const demo = Demo.generar('2026-11-13');
  const ctx = { cuentas: demo.cuentas, apartados: demo.apartados, categorias: demo.categorias, hoy: '2026-11-13', cuentaPrincipalId: 'cta_bbva' };
  const casos = [
    ['metí 10000 a revolut al 9% para coche', { tipo: 'deposito', monto: 10000, tasa: 9, cuentaId: 'cta_revolut', apartadoId: 'ap_coche' }],
    ['gasté 350 en comida con nu', { tipo: 'gasto', monto: 350, categoriaId: 'cat_comida' }],
    ['me pagaron 12,500 de sueldo', { tipo: 'ingreso', monto: 12500, categoriaId: 'cat_sueldo' }],
    ['pasa 2000 de nu a cetes', { tipo: 'transferencia', monto: 2000, cuentaId: 'cta_nu', cuentaDestinoId: 'cta_cetes' }],
    ['nu ahora da 7.5%', { tipo: 'tasa', tasa: 7.5, cuentaId: 'cta_nu' }],
    ['ayer gasté 1.2k en el súper con la tarjeta', { tipo: 'gasto', monto: 1200, fecha: '2026-11-12', cuentaId: 'cta_tdc', categoriaId: 'cat_super' }],
    ['mis papás pagaron 800 de luz', { tipo: 'gasto', monto: 800, papas: 100, categoriaId: 'cat_servicios' }],
    ['pasa 1500 de coche a viaje', { tipo: 'traspaso', apartadoId: 'ap_coche', apartadoDestinoId: 'ap_viaje' }],
  ];
  for (const [texto, esperado] of casos) {
    prueba(`Parser: "${texto}"`, () => {
      const r = P.interpretar(texto, ctx);
      for (const [k, v] of Object.entries(esperado)) igual(r[k], v, k + ':');
    });
  }
  prueba('Parser: frase incompleta marca faltantes', () => {
    const r = P.interpretar('hola mundo', ctx);
    igual(r.completo, false);
  });

  /* ---------- Datos de ejemplo ---------- */
  prueba('Datos de ejemplo: patrimonio positivo y sin apartados sobregirados', () => {
    const c = M.calcular(demo, '2026-11-13');
    if (!(c.patrimonio > 0)) throw new Error('patrimonio');
    for (const [cid, v] of Object.entries(c.sinAsignar)) if (v < -1 && (c.asignado[cid] || 0) > 0) throw new Error('sobregiro ' + cid + ' ' + v);
    if (!C.alertas(demo, c).length) throw new Error('sin alertas');
  });

  /* ---------- Reporte ---------- */
  const fallidas = resultados.filter(r => !r.ok);
  const Pruebas = { resultados, fallidas };
  if (nodo) {
    for (const r of resultados) console.log(`${r.ok ? '✔' : '✘'} ${r.nombre}${r.ok ? '' : '  → ' + r.error}`);
    console.log(`\n${resultados.length - fallidas.length}/${resultados.length} pruebas correctas`);
    if (require.main === module) process.exitCode = fallidas.length ? 1 : 0;
    module.exports = Pruebas;
  } else raiz.Pruebas = Pruebas;
})(typeof window !== 'undefined' ? window : globalThis);
