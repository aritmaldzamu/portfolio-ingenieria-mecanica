/* =====================================================================
 * finanzas.js — Fórmulas financieras PURAS (sin DOM, sin estado).
 * Todas las tasas se manejan en PORCENTAJE anual (ej. 7.5 = 7.5 %).
 * Se puede usar en el navegador (window.Finanzas) y en Node (require).
 * ===================================================================== */
(function (raiz) {
  'use strict';

  const DIAS_ANIO = 365;

  /* ---------- Tasas escalonadas / con tope ---------- */

  /** Ordena tramos por su tope; un tope vacío/null = sin límite. */
  function ordenarTramos(tramos) {
    return [...(tramos || [])]
      .map(t => ({ hasta: (t.hasta === '' || t.hasta == null) ? null : Number(t.hasta), tasa: Number(t.tasa) || 0 }))
      .sort((a, b) => (a.hasta == null ? Infinity : a.hasta) - (b.hasta == null ? Infinity : b.hasta));
  }

  /**
   * Interés ANUAL bruto (sin capitalizar) de un saldo con tramos.
   * tramos: [{hasta: 25000, tasa: 15}, {hasta: null, tasa: 7}]
   *   => 15 % sobre los primeros $25,000 y 7 % sobre el excedente.
   * Si el último tramo tiene tope, el excedente no genera nada (tasa con tope).
   */
  function interesEscalonado(saldo, tramos) {
    saldo = Number(saldo) || 0;
    if (saldo <= 0) return 0;
    let interes = 0, piso = 0;
    for (const t of ordenarTramos(tramos)) {
      if (saldo <= piso) break;
      const techo = t.hasta == null ? Infinity : t.hasta;
      const base = Math.min(saldo, techo) - piso;
      if (base > 0) interes += base * t.tasa / 100;
      piso = techo;
    }
    return interes;
  }

  /**
   * Tasa efectiva anual (%) de un saldo con tramos y, opcionalmente,
   * una promoción activa {tasa, tope} que sustituye a los tramos hasta su tope.
   */
  function tasaEfectiva(saldo, tramos, promo) {
    saldo = Number(saldo) || 0;
    const ord = ordenarTramos(tramos);
    if (saldo <= 0) {
      if (promo) return Number(promo.tasa) || 0;
      return ord.length ? ord[0].tasa : 0;
    }
    let interes = interesEscalonado(saldo, ord);
    if (promo) {
      const tope = Number(promo.tope) > 0 ? Number(promo.tope) : Infinity;
      const b = Math.min(saldo, tope);
      interes += b * (Number(promo.tasa) || 0) / 100 - interesEscalonado(b, ord);
    }
    return interes / saldo * 100;
  }

  /** Tasa marginal (%) que gana el siguiente peso que se deposite. */
  function tasaMarginal(saldo, tramos, promo) {
    const d = 1;
    const a = tasaEfectiva(saldo, tramos, promo) * saldo;
    const b = tasaEfectiva(saldo + d, tramos, promo) * (saldo + d);
    return (b - a) / d;
  }

  /** Tasa neta de retención de ISR (la retención en México es % anual sobre el capital). */
  function tasaNeta(tasa, retencion) {
    return Math.max(0, (Number(tasa) || 0) - (Number(retencion) || 0));
  }

  /* ---------- Capitalización ---------- */

  /**
   * Factor de crecimiento por UN día.
   *  - diaria:      (1 + r/365)                      (Nu, Revolut, Mercado Pago…)
   *  - mensual:     (1 + r/12)^(12/365)
   *  - vencimiento: (1 + r·p/360)^(1/p)  (Cetes: interés simple base 360 por plazo p, reinvertido)
   */
  function factorDiario(tasa, capitalizacion, plazo) {
    const r = (Number(tasa) || 0) / 100;
    if (r === 0) return 1;
    if (capitalizacion === 'mensual') return Math.pow(1 + r / 12, 12 / DIAS_ANIO);
    if (capitalizacion === 'vencimiento') {
      const p = Number(plazo) || 28;
      return Math.pow(1 + r * p / 360, 1 / p);
    }
    return 1 + r / DIAS_ANIO;
  }

  /** Capital después de `dias` días a una tasa fija. */
  function crecer(capital, tasa, dias, capitalizacion, plazo) {
    return (Number(capital) || 0) * Math.pow(factorDiario(tasa, capitalizacion, plazo), dias);
  }

  /** Interés compuesto diario clásico: C·(1 + r/365)^días − C. */
  function interesCompuestoDiario(capital, tasa, dias) {
    return crecer(capital, tasa, dias, 'diaria') - capital;
  }

  /** Tasa efectiva MENSUAL (decimal) equivalente a la tasa anual y capitalización dadas. */
  function tasaMensualEquivalente(tasa, capitalizacion, plazo) {
    return Math.pow(factorDiario(tasa, capitalizacion, plazo), DIAS_ANIO / 12) - 1;
  }

  /** Rendimientos estimados (diario, mensual, anual) de un capital a tasa fija. */
  function rendimientos(capital, tasa, capitalizacion, plazo) {
    const f = factorDiario(tasa, capitalizacion, plazo);
    capital = Number(capital) || 0;
    return {
      diario: capital * (f - 1),
      mensual: capital * (Math.pow(f, DIAS_ANIO / 12) - 1),
      anual: capital * (Math.pow(f, DIAS_ANIO) - 1),
    };
  }

  /* ---------- GAT ---------- */

  /** GAT nominal (%): rendimiento anual efectivo antes de impuestos. */
  function gatNominal(tasa, capitalizacion, plazo) {
    return (Math.pow(factorDiario(tasa, capitalizacion, plazo), DIAS_ANIO) - 1) * 100;
  }

  /** GAT real (%): descuenta la inflación esperada: (1+n)/(1+π) − 1. */
  function gatReal(gatNom, inflacion) {
    return ((1 + gatNom / 100) / (1 + (Number(inflacion) || 0) / 100) - 1) * 100;
  }

  /** Convierte un monto futuro a pesos de hoy. */
  function aValorReal(monto, inflacion, anios) {
    return monto / Math.pow(1 + (Number(inflacion) || 0) / 100, anios);
  }

  /* ---------- Ahorro periódico y metas ---------- */

  /**
   * Valor futuro con aportación mensual al final de cada mes.
   * Devuelve {total, aportado, rendimiento}.
   */
  function valorFuturo(inicial, aportacionMensual, tasa, meses, capitalizacion, plazo) {
    const i = tasaMensualEquivalente(tasa, capitalizacion || 'mensual', plazo);
    inicial = Number(inicial) || 0; aportacionMensual = Number(aportacionMensual) || 0;
    const g = Math.pow(1 + i, meses);
    const total = i === 0
      ? inicial + aportacionMensual * meses
      : inicial * g + aportacionMensual * (g - 1) / i;
    const aportado = inicial + aportacionMensual * meses;
    return { total, aportado, rendimiento: total - aportado };
  }

  /** Serie mes a mes del ahorro: [{mes, total, aportado, rendimiento}]. */
  function serieAhorro(inicial, aportacionMensual, tasa, meses, capitalizacion, plazo) {
    const out = [];
    for (let m = 0; m <= meses; m++) out.push({ mes: m, ...valorFuturo(inicial, aportacionMensual, tasa, m, capitalizacion, plazo) });
    return out;
  }

  /** Meses necesarios para llegar a una meta (Infinity si no se llega en 100 años). */
  function mesesParaMeta(inicial, aportacionMensual, tasa, meta, capitalizacion, plazo) {
    const i = tasaMensualEquivalente(tasa, capitalizacion || 'mensual', plazo);
    let saldo = Number(inicial) || 0;
    if (saldo >= meta) return 0;
    for (let m = 1; m <= 1200; m++) {
      saldo = saldo * (1 + i) + (Number(aportacionMensual) || 0);
      if (saldo >= meta - 0.005) return m;
    }
    return Infinity;
  }

  /** Aportación mensual necesaria para llegar a `meta` en `meses`. */
  function aportacionNecesaria(inicial, meta, tasa, meses, capitalizacion, plazo) {
    if (meses <= 0) return Math.max(0, meta - inicial);
    const i = tasaMensualEquivalente(tasa, capitalizacion || 'mensual', plazo);
    const g = Math.pow(1 + i, meses);
    const faltante = meta - (Number(inicial) || 0) * g;
    if (faltante <= 0) return 0;
    return i === 0 ? faltante / meses : faltante * i / (g - 1);
  }

  /* ---------- Créditos y amortización ---------- */

  /** Pago mensual fijo de un crédito (sistema francés). */
  function pagoMensual(monto, tasaAnual, meses) {
    const r = (Number(tasaAnual) || 0) / 1200;
    if (meses <= 0) return monto;
    if (r === 0) return monto / meses;
    return monto * r / (1 - Math.pow(1 + r, -meses));
  }

  /**
   * Tabla de amortización con abono extra mensual opcional.
   * Devuelve {pago, filas:[{mes, pago, interes, capital, saldo}], totalInteres, totalPagado, meses}.
   */
  function amortizacion(monto, tasaAnual, meses, extra, pagoFijo) {
    const r = (Number(tasaAnual) || 0) / 1200;
    const pago = pagoFijo > 0 ? pagoFijo : pagoMensual(monto, tasaAnual, meses);
    extra = Number(extra) || 0;
    let saldo = Number(monto) || 0, totalInteres = 0, totalPagado = 0;
    const filas = [];
    for (let m = 1; m <= 1200 && saldo > 0.005; m++) {
      const interes = saldo * r;
      let abono = pago + extra;
      if (abono <= interes && m > 1) break; // el pago no cubre intereses: nunca se liquida
      if (abono > saldo + interes) abono = saldo + interes;
      const capital = abono - interes;
      saldo = Math.max(0, saldo - capital);
      totalInteres += interes; totalPagado += abono;
      filas.push({ mes: m, pago: abono, interes, capital, saldo });
    }
    return { pago, filas, totalInteres, totalPagado, meses: filas.length };
  }

  /* ---------- ISR, PPR y sueldo ---------- */

  /** Busca la fila de la tabla del ISR (filas {li, cuota, pct}) que corresponde a la base. */
  function filaISR(base, tabla) {
    let fila = tabla[0];
    for (const f of tabla) if (base >= f.li) fila = f;
    return fila;
  }

  /** ISR de una base gravable con una tabla (anual o mensual). */
  function isrDeTabla(base, tabla) {
    base = Number(base) || 0;
    if (base <= 0 || !tabla || !tabla.length) return 0;
    const f = filaISR(base, tabla);
    return f.cuota + (base - f.li) * f.pct / 100;
  }

  /** Tasa marginal del ISR (%) para una base. */
  function tasaMarginalISR(base, tabla) {
    if (!tabla || !tabla.length) return 0;
    return filaISR(Number(base) || 0, tabla).pct;
  }

  /** Convierte la tabla anual en mensual (dividiendo límites y cuotas entre 12). */
  function tablaMensual(tablaAnual) {
    return (tablaAnual || []).map(f => ({ li: f.li / 12, cuota: f.cuota / 12, pct: f.pct }));
  }

  /**
   * Deducción de aportaciones a PPR — art. 151 fracc. V LISR:
   * hasta el 10 % de los ingresos acumulables del año, sin exceder 5 UMA anuales.
   */
  function deduccionPPR(aportacionAnual, ingresoAnual, umaDiaria) {
    const topeIngreso = 0.10 * (Number(ingresoAnual) || 0);
    const topeUMA = 5 * (Number(umaDiaria) || 0) * DIAS_ANIO;
    const limite = Math.min(topeIngreso, topeUMA);
    return { topeIngreso, topeUMA, limite, deducible: Math.max(0, Math.min(Number(aportacionAnual) || 0, limite)) };
  }

  /** Devolución estimada del SAT = ISR(ingreso) − ISR(ingreso − deducción). */
  function devolucionISR(ingresoAnual, deducible, tablaAnual) {
    return isrDeTabla(ingresoAnual, tablaAnual) - isrDeTabla(Math.max(0, ingresoAnual - deducible), tablaAnual);
  }

  /**
   * Sueldo neto mensual aproximado a partir del bruto.
   * p: {tablaAnual, umaDiaria, subsidioPct, subsidioTope, imssPct, imssExcedentePct, factorIntegracion}
   */
  function sueldoNeto(brutoMensual, p) {
    const bruto = Number(brutoMensual) || 0;
    const isrBruto = isrDeTabla(bruto, tablaMensual(p.tablaAnual));
    const umaMensual = (Number(p.umaDiaria) || 0) * 30.4;
    const subsidio = bruto <= (Number(p.subsidioTope) || 0) ? umaMensual * (Number(p.subsidioPct) || 0) / 100 : 0;
    const isr = Math.max(0, isrBruto - subsidio);
    const sbcDiario = bruto / 30.4 * (Number(p.factorIntegracion) || 1);
    const excedente = Math.max(0, sbcDiario - 3 * (Number(p.umaDiaria) || 0));
    const imss = (sbcDiario * (Number(p.imssPct) || 0) / 100 + excedente * (Number(p.imssExcedentePct) || 0) / 100) * 30.4;
    return { bruto, isrBruto, subsidio, isr, imss, neto: bruto - isr - imss };
  }

  /* ---------- Comparador y distribución óptima ---------- */

  /**
   * Distribuye `monto` entre opciones llenando primero el tramo con mayor tasa.
   * opciones: [{id, nombre, tramos, promo, saldoExistente, retencion, capitalizacion, plazo}]
   * Respeta el orden de tramos dentro de cada cuenta (no se puede llenar el excedente
   * sin haber llenado el tramo anterior).
   */
  function distribucionOptima(monto, opciones) {
    monto = Number(monto) || 0;
    const colas = opciones.map(op => {
      const existente = Number(op.saldoExistente) || 0;
      // Segmentos [piso, techo) con su tasa; la promoción sustituye el tramo [0, tope).
      let rangos = [];
      let piso = 0;
      for (const t of ordenarTramos(op.tramos)) {
        const techo = t.hasta == null ? Infinity : t.hasta;
        if (techo > piso) rangos.push({ piso, techo, tasa: t.tasa });
        piso = techo;
      }
      if (op.promo) {
        const tope = Number(op.promo.tope) > 0 ? Number(op.promo.tope) : Infinity;
        rangos = [{ piso: 0, techo: tope, tasa: Number(op.promo.tasa) || 0 }]
          .concat(rangos.filter(r => r.techo > tope).map(r => ({ ...r, piso: Math.max(r.piso, tope) })));
      }
      const segs = [];
      for (const r of rangos) {
        const ini = Math.max(r.piso, existente);
        if (r.techo > ini) {
          const neta = tasaNeta(r.tasa, op.retencion);
          segs.push({ capacidad: r.techo - ini, tasa: r.tasa, neta, efectiva: gatNominal(neta, op.capitalizacion, op.plazo) });
        }
      }
      return { op, segs, i: 0 };
    });
    const asign = new Map();
    let resto = monto, interesAnual = 0;
    while (resto > 0.004) {
      let mejor = null;
      for (const c of colas) {
        const s = c.segs[c.i];
        if (s && s.efectiva > 0 && (!mejor || s.efectiva > mejor.segs[mejor.i].efectiva)) mejor = c;
      }
      if (!mejor) break;
      const s = mejor.segs[mejor.i];
      const m = Math.min(resto, s.capacidad);
      const a = asign.get(mejor.op.id) || { id: mejor.op.id, nombre: mejor.op.nombre, monto: 0, interes: 0 };
      a.monto += m;
      a.interes += m * s.efectiva / 100;
      asign.set(mejor.op.id, a);
      interesAnual += m * s.efectiva / 100;
      resto -= m;
      s.capacidad -= m;
      if (s.capacidad <= 0.004) mejor.i++;
    }
    const asignaciones = [...asign.values()].map(a => ({ ...a, tasaPromedio: a.monto ? a.interes / a.monto * 100 : 0 }));
    return { asignaciones, interesAnual, noAsignado: Math.max(0, resto) };
  }

  /**
   * Ganancia de depositar `monto` en una opción durante `meses`,
   * usando la tasa marginal real (considera saldo existente y topes).
   */
  function gananciaOpcion(monto, op, meses) {
    const existente = Number(op.saldoExistente) || 0;
    const interesExtra = tasaEfectiva(existente + monto, op.tramos, op.promo) * (existente + monto) - tasaEfectiva(existente, op.tramos, op.promo) * existente;
    const tasaMarg = monto > 0 ? interesExtra / monto : 0;
    const neta = tasaNeta(tasaMarg, op.retencion);
    const dias = meses * DIAS_ANIO / 12;
    return { tasa: tasaMarg, neta, ganancia: crecer(monto, neta, dias, op.capitalizacion, op.plazo) - monto };
  }

  const Finanzas = {
    DIAS_ANIO, ordenarTramos, interesEscalonado, tasaEfectiva, tasaMarginal, tasaNeta,
    factorDiario, crecer, interesCompuestoDiario, tasaMensualEquivalente, rendimientos,
    gatNominal, gatReal, aValorReal, valorFuturo, serieAhorro, mesesParaMeta, aportacionNecesaria,
    pagoMensual, amortizacion, isrDeTabla, tasaMarginalISR, tablaMensual, deduccionPPR, devolucionISR,
    sueldoNeto, distribucionOptima, gananciaOpcion,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = Finanzas;
  else raiz.Finanzas = Finanzas;
})(typeof window !== 'undefined' ? window : globalThis);
