/* =====================================================================
 * motor.js — Cálculos derivados del estado (sin DOM).
 * Recibe el estado completo y una fecha "hoy" y devuelve saldos,
 * rendimientos por periodo, valor de apartados, flujo, alertas, etc.
 * Depende de Finanzas. Funciona en navegador y en Node.
 * ===================================================================== */
(function (raiz) {
  'use strict';
  const Fz = (typeof module !== 'undefined' && module.exports) ? require('./finanzas.js') : raiz.Finanzas;

  /* ======================= Fechas ======================= */
  const MS_DIA = 86400000;
  /** 'YYYY-MM-DD' → número de día (UTC, sin problemas de horario de verano). */
  function D(iso) { const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number); return Math.round(Date.UTC(y, m - 1, d) / MS_DIA); }
  /** número de día → 'YYYY-MM-DD'. */
  function ISO(dia) { return new Date(dia * MS_DIA).toISOString().slice(0, 10); }
  /** Fecha local de hoy en 'YYYY-MM-DD'. */
  function hoyISO(ahora) { const t = ahora || new Date(); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`; }
  function diasEnMes(y, m) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); } // m: 1-12
  function partes(iso) { const [y, m, d] = iso.split('-').map(Number); return { y, m, d }; }
  function armar(y, m, d) { return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`; }
  /** Suma meses conservando el día (ajusta a fin de mes si no existe). */
  function sumarMeses(iso, n, diaPreferido) {
    const p = partes(iso);
    let m = p.m - 1 + n; const y = p.y + Math.floor(m / 12); m = ((m % 12) + 12) % 12 + 1;
    return armar(y, m, Math.min(diaPreferido || p.d, diasEnMes(y, m)));
  }
  function sumarDias(iso, n) { return ISO(D(iso) + n); }
  function inicioMes(iso) { const p = partes(iso); return armar(p.y, p.m, 1); }
  function finMes(iso) { const p = partes(iso); return armar(p.y, p.m, diasEnMes(p.y, p.m)); }
  function mesDe(iso) { return String(iso).slice(0, 7); }
  /** Meses (fraccionarios) entre dos fechas. */
  function mesesEntre(a, b) { return (D(b) - D(a)) / (365 / 12); }
  /** Próxima fecha (>= desde) cuyo día del mes sea `dia`. */
  function proximoDiaDelMes(desdeIso, dia) {
    const p = partes(desdeIso);
    let f = armar(p.y, p.m, Math.min(dia, diasEnMes(p.y, p.m)));
    if (D(f) < D(desdeIso)) f = sumarMeses(armar(p.y, p.m, 1), 1, dia);
    return f;
  }

  /* ======================= Catálogos ======================= */
  const TIPOS_CUENTA = {
    rendimiento: { nombre: 'Cuenta con rendimiento', icono: 'trending', cap: 'diaria', rinde: true },
    cajita: { nombre: 'Cajita / apartado', icono: 'layers', cap: 'diaria', rinde: true },
    cetes: { nombre: 'Cetes / Cetesdirecto', icono: 'landmark', cap: 'vencimiento', rinde: true },
    inversion: { nombre: 'Inversión (GBM, fondos)', icono: 'chart', cap: 'diaria', rinde: true },
    ppr: { nombre: 'PPR', icono: 'umbrella', cap: 'mensual', rinde: true },
    afore: { nombre: 'Afore', icono: 'shield', cap: 'mensual', rinde: true },
    efectivo: { nombre: 'Efectivo', icono: 'banknote', cap: 'ninguna', rinde: false },
    debito: { nombre: 'Débito tradicional', icono: 'wallet', cap: 'ninguna', rinde: false },
    credito: { nombre: 'Tarjeta de crédito', icono: 'card', cap: 'ninguna', rinde: false, deuda: true },
    prestamo: { nombre: 'Préstamo / deuda', icono: 'receipt', cap: 'mensual', rinde: false, deuda: true },
  };
  const esDeuda = c => !!(TIPOS_CUENTA[c.tipo] && TIPOS_CUENTA[c.tipo].deuda);
  const esLiquida = c => ['rendimiento', 'cajita', 'cetes', 'inversion', 'efectivo', 'debito'].includes(c.tipo);

  /* ======================= Tasas de una cuenta ======================= */

  /** Entrada del historial de tasas vigente en el día `dia`. */
  function entradaTasa(cuenta, dia) {
    const h = cuenta.historialTasas || [];
    if (!h.length) return null;
    let e = h[0];
    for (const x of h) if (D(x.fecha) <= dia) e = x;
    return e;
  }

  /** Promoción activa en el día `dia` (o null). */
  function promoActiva(entrada, dia) {
    if (!entrada || !entrada.promo || !(Number(entrada.promo.tasa) > 0)) return null;
    const dias = Number(entrada.promo.dias) || 0;
    if (dias > 0 && dia >= D(entrada.fecha) + dias) return null;
    return entrada.promo;
  }

  /** Tasa bruta efectiva (%) de la cuenta para un saldo en un día. */
  function tasaBrutaEn(cuenta, saldo, dia) {
    if (esDeuda(cuenta)) return cuenta.tipo === 'prestamo' ? Number(cuenta.prestamo && cuenta.prestamo.tasaAnual) || 0 : 0;
    const e = entradaTasa(cuenta, dia);
    if (!e) return 0;
    if (cuenta.tipo === 'cetes' && !cuenta.reinvertir && cuenta.fechaVencimiento && dia >= D(cuenta.fechaVencimiento)) return 0;
    return Fz.tasaEfectiva(Math.max(0, saldo), e.tramos, promoActiva(e, dia));
  }

  function capDe(cuenta) {
    if (cuenta.tipo === 'cetes') return 'vencimiento';
    return cuenta.capitalizacion || (TIPOS_CUENTA[cuenta.tipo] || {}).cap || 'diaria';
  }

  function netaDe(cuenta, bruta, cfg) {
    return (cuenta.aplicaISR && !esDeuda(cuenta)) ? Fz.tasaNeta(bruta, cfg.retencionISR) : bruta;
  }

  /** Días en los que cambia la configuración de tasa (cambios, fin de promo, vencimiento). */
  function fronterasTasa(cuenta) {
    const s = new Set();
    for (const e of cuenta.historialTasas || []) {
      s.add(D(e.fecha));
      if (e.promo && Number(e.promo.dias) > 0) s.add(D(e.fecha) + Number(e.promo.dias));
    }
    if (cuenta.tipo === 'cetes' && !cuenta.reinvertir && cuenta.fechaVencimiento) s.add(D(cuenta.fechaVencimiento));
    return [...s];
  }

  /* ======================= Piernas (flujos) ======================= */

  /** Parte del gasto que pago yo (el resto lo cubrieron mis papás). */
  const parteMia = m => (Number(m.monto) || 0) * (1 - (Number(m.papas) || 0) / 100);
  const partePapas = m => (Number(m.monto) || 0) * (Number(m.papas) || 0) / 100;

  /**
   * Convierte movimientos y flujos de apartados en "piernas":
   *  - porCuenta[cuentaId]: [{dia, orden, monto}]  monto en perspectiva de ACTIVO (+ entra dinero)
   *  - porApartado[apartadoId]: [{dia, orden, monto, cuentaId, tasa, ref}]
   */
  function piernas(estado) {
    const porCuenta = {}, porApartado = {};
    const pc = (cid, fecha, orden, monto, ref) => { if (!cid) return; (porCuenta[cid] = porCuenta[cid] || []).push({ dia: D(fecha), orden: orden || 0, monto, ref }); };
    const pa = (aid, cid, fecha, orden, monto, tasa, ref) => { if (!aid || !cid) return; (porApartado[aid] = porApartado[aid] || []).push({ dia: D(fecha), fecha, orden: orden || 0, monto, cuentaId: cid, tasa: tasa == null || tasa === '' ? null : Number(tasa), ref }); };

    for (const m of estado.movimientos || []) {
      const monto = Number(m.monto) || 0;
      if (m.tipo === 'ingreso') pc(m.cuentaId, m.fecha, m.creado, monto, m);
      else if (m.tipo === 'gasto') pc(m.cuentaId, m.fecha, m.creado, -parteMia(m), m);
      else if (m.tipo === 'transferencia') { pc(m.cuentaId, m.fecha, m.creado, -monto, m); pc(m.cuentaDestinoId, m.fecha, m.creado, monto, m); }
    }
    for (const f of estado.flujosApartado || []) {
      const monto = Number(f.monto) || 0;
      if (f.tipo === 'deposito') {
        pa(f.apartadoId, f.cuentaId, f.fecha, f.creado, monto, f.tasa, f);
        if (f.origen !== 'asignar') pc(f.cuentaId, f.fecha, f.creado, monto, f);
        if (f.origen && f.origen !== 'asignar' && f.origen !== 'externo') pc(f.origen, f.fecha, f.creado, -monto, f);
      } else if (f.tipo === 'retiro') {
        pa(f.apartadoId, f.cuentaId, f.fecha, f.creado, -monto, null, f);
        if (f.destino !== 'liberar') pc(f.cuentaId, f.fecha, f.creado, -monto, f);
        if (f.destino && f.destino !== 'liberar' && f.destino !== 'externo') pc(f.destino, f.fecha, f.creado, monto, f);
      } else if (f.tipo === 'traspaso') {
        const cd = f.cuentaDestinoId || f.cuentaId;
        pa(f.apartadoId, f.cuentaId, f.fecha, f.creado, -monto, null, f);
        pa(f.apartadoDestinoId, cd, f.fecha, f.creado, monto, cd !== f.cuentaId ? f.tasa : null, f);
        if (cd !== f.cuentaId) { pc(f.cuentaId, f.fecha, f.creado, -monto, f); pc(cd, f.fecha, f.creado, monto, f); }
      }
    }
    return { porCuenta, porApartado };
  }

  /* ======================= Simulación de una cuenta ======================= */

  /**
   * Simula el saldo de una cuenta día a día por tramos entre eventos.
   * Cada segmento guarda el saldo al inicio (ya aplicados los eventos del día),
   * el factor diario vigente y el logaritmo acumulado del crecimiento.
   * Devuelve {saldoEn(dia), G(d1,d2), segmentos}.
   */
  function simularCuenta(cuenta, piernasCuenta, cfg, hastaDia) {
    const deuda = esDeuda(cuenta);
    const ev = [];
    for (const s of cuenta.historialSaldos || []) ev.push({ dia: D(s.fecha), orden: s.creado || 0, set: Number(s.saldo) || 0 });
    for (const p of piernasCuenta || []) ev.push({ dia: p.dia, orden: p.orden, flujo: deuda ? -p.monto : p.monto });
    ev.sort((a, b) => a.dia - b.dia || a.orden - b.orden);

    const puntos = new Set(ev.map(e => e.dia));
    for (const f of fronterasTasa(cuenta)) puntos.add(f);
    puntos.add(hastaDia);
    const inicio = ev.length ? ev[0].dia : hastaDia;
    const dias = [...puntos].filter(d => d >= inicio).sort((a, b) => a - b);

    const cap = capDe(cuenta);
    const plazo = cuenta.plazo || 28;
    const segs = [];
    let saldo = 0, L = 0, k = 0;
    for (let i = 0; i < dias.length; i++) {
      const dia = dias[i];
      while (k < ev.length && ev[k].dia === dia) {
        if (ev[k].set != null) saldo = ev[k].set; else saldo += ev[k].flujo;
        k++;
      }
      let f = 1;
      if (cuenta.tipo !== 'credito') {
        const bruta = tasaBrutaEn(cuenta, saldo, dia);
        f = Fz.factorDiario(netaDe(cuenta, bruta, cfg), cap, plazo);
      }
      segs.push({ dia, saldo, f, L });
      const sig = dias[i + 1];
      if (sig != null) { saldo = saldo * Math.pow(f, sig - dia); L += (sig - dia) * Math.log(f); }
    }

    function seg(dia) {
      let lo = 0, hi = segs.length - 1, r = -1;
      while (lo <= hi) { const mid = (lo + hi) >> 1; if (segs[mid].dia <= dia) { r = mid; lo = mid + 1; } else hi = mid - 1; }
      return r < 0 ? null : segs[r];
    }
    function saldoEn(dia) { const s = seg(dia); return s ? s.saldo * Math.pow(s.f, dia - s.dia) : 0; }
    function logEn(dia) { const s = seg(dia); return s ? s.L + (dia - s.dia) * Math.log(s.f) : 0; }
    function G(d1, d2) { return Math.exp(logEn(d2) - logEn(d1)); }
    function factorEn(dia) { const s = seg(dia); return s ? s.f : 1; }
    /** Interés (o crecimiento) generado entre dos días, sin contar flujos. */
    function interesEntre(d1, d2) {
      let tot = 0;
      for (let i = 0; i < segs.length; i++) {
        const s = segs[i], fin = i + 1 < segs.length ? segs[i + 1].dia : Infinity;
        const a = Math.max(s.dia, d1), b = Math.min(fin, d2);
        if (b <= a) continue;
        tot += s.saldo * Math.pow(s.f, a - s.dia) * (Math.pow(s.f, b - a) - 1);
      }
      return tot;
    }
    return { saldoEn, G, factorEn, interesEntre, segmentos: segs };
  }

  /* ======================= Cálculo principal ======================= */

  /**
   * Calcula todo lo derivado del estado para el día `hoy` ('YYYY-MM-DD').
   */
  function calcular(estado, hoy) {
    hoy = hoy || hoyISO();
    const dHoy = D(hoy);
    const cfg = estado.config || {};
    const { porCuenta, porApartado } = piernas(estado);
    let ultimoDia = dHoy;
    for (const l of Object.values(porCuenta)) for (const p of l) ultimoDia = Math.max(ultimoDia, p.dia);

    const cuentas = {}, sims = {};
    let activos = 0, deudas = 0, liquido = 0;
    const tot = { diario: 0, mensual: 0, anual: 0, mes: 0 };
    const dFinAnt = D(finMes(sumarMeses(inicioMes(hoy), -1)));
    let sumaPond = 0, baseRinde = 0;

    for (const c of estado.cuentas || []) {
      const sim = simularCuenta(c, porCuenta[c.id], cfg, ultimoDia);
      sims[c.id] = sim;
      const saldo = sim.saldoEn(dHoy);
      const bruta = tasaBrutaEn(c, saldo, dHoy);
      const neta = netaDe(c, bruta, cfg);
      const cap = capDe(c);
      const deuda = esDeuda(c);
      const r = deuda ? { diario: 0, mensual: 0, anual: 0 } : Fz.rendimientos(Math.max(0, saldo), neta, cap, c.plazo);
      const gatN = Fz.gatNominal(bruta, cap, c.plazo);
      const e = entradaTasa(c, dHoy);
      cuentas[c.id] = {
        saldo, tasaBruta: bruta, tasaNeta: neta, gatN, gatR: Fz.gatReal(gatN, cfg.inflacion),
        ...r, cap, deuda, promo: promoActiva(e, dHoy), entrada: e,
        tasaActualizada: e ? e.fecha : null,
      };
      if (c.archivada) continue;
      if (deuda) deudas += Math.max(0, saldo);
      else {
        activos += saldo;
        if (esLiquida(c)) liquido += saldo;
        tot.diario += r.diario; tot.mensual += r.mensual; tot.anual += r.anual;
        tot.mes += sim.interesEntre(dFinAnt, dHoy);
        if (saldo > 0) { sumaPond += saldo * neta; baseRinde += saldo; }
      }
    }

    // ---- Apartados ----
    const apartados = {}, asignado = {};
    for (const a of estado.apartados || []) {
      const res = valorApartado(estado, a.id, porApartado, sims, cuentas, cfg, dHoy);
      apartados[a.id] = res;
      for (const [cid, v] of Object.entries(res.porCuenta)) asignado[cid] = (asignado[cid] || 0) + v;
    }
    // Depósitos huérfanos (apartado borrado) no se cuentan.
    const sinAsignar = {};
    for (const c of estado.cuentas || []) if (!esDeuda(c)) sinAsignar[c.id] = cuentas[c.id].saldo - (asignado[c.id] || 0);

    return {
      hoy, dHoy, cuentas, sims, apartados, sinAsignar, asignado, porApartado,
      activos, deudas, patrimonio: activos - deudas, liquido,
      rendimiento: tot,
      tasaPonderada: baseRinde ? sumaPond / baseRinde : 0,
    };
  }

  /** Factor de crecimiento de un "lote" (depósito) con su tasa guardada. */
  function factorLote(cuenta, sim, lote, hastaDia, cfg) {
    if (hastaDia <= lote.dia) return 1;
    if (lote.tasa == null || esDeuda(cuenta)) return sim.G(lote.dia, hastaDia);
    // La tasa del depósito vale hasta el siguiente cambio de tasa de la cuenta.
    let cambio = Infinity;
    for (const e of cuenta.historialTasas || []) { const d = D(e.fecha); if (d > lote.dia && d < cambio) cambio = d; }
    const fin = Math.min(cambio, hastaDia);
    const fSnap = Fz.factorDiario(netaDe(cuenta, lote.tasa, cfg), capDe(cuenta), cuenta.plazo);
    return Math.pow(fSnap, fin - lote.dia) * (fin < hastaDia ? sim.G(fin, hastaDia) : 1);
  }

  /** Valor de un apartado en un día, desglosado por cuenta y por depósito. */
  function valorApartado(estado, apartadoId, porApartado, sims, cuentasCalc, cfg, dia) {
    const lotes = (porApartado[apartadoId] || []).filter(l => l.dia <= dia);
    const porCuenta = {}, detalle = [];
    let valor = 0, aportado = 0, diario = 0, mensual = 0, anual = 0;
    const cuentasPorId = Object.fromEntries((estado.cuentas || []).map(c => [c.id, c]));
    for (const l of lotes) {
      const c = cuentasPorId[l.cuentaId]; const sim = sims[l.cuentaId];
      if (!c || !sim) continue;
      const v = l.monto * factorLote(c, sim, l, dia, cfg);
      valor += v; aportado += l.monto;
      porCuenta[l.cuentaId] = (porCuenta[l.cuentaId] || 0) + v;
      detalle.push({ ...l, valor: v, ganado: v - l.monto });
    }
    for (const [cid, v] of Object.entries(porCuenta)) {
      const cc = cuentasCalc[cid]; const c = cuentasPorId[cid];
      if (!cc || v <= 0) continue;
      const r = Fz.rendimientos(v, cc.tasaNeta, cc.cap, c.plazo);
      diario += r.diario; mensual += r.mensual; anual += r.anual;
    }
    const tasa = valor > 0 ? Object.entries(porCuenta).reduce((s, [cid, v]) => s + Math.max(0, v) * (cuentasCalc[cid] ? cuentasCalc[cid].tasaNeta : 0), 0) / valor : 0;
    return { valor, aportado, ganado: valor - aportado, porCuenta, lotes: detalle, diario, mensual, anual, tasa };
  }

  /** Valor de un apartado en otra fecha (reusa simulaciones de `calc`). */
  function valorApartadoEn(estado, calc, apartadoId, iso) {
    return valorApartado(estado, apartadoId, calc.porApartado, calc.sims, calc.cuentas, estado.config || {}, D(iso));
  }

  /** Serie de patrimonio a fin de cada mes (últimos `meses` meses, incluye el actual a hoy). */
  function seriePatrimonio(estado, calc, meses) {
    const out = [];
    let primero = Infinity;
    for (const c of estado.cuentas || []) {
      const s = calc.sims[c.id];
      if (s && s.segmentos.length) primero = Math.min(primero, s.segmentos[0].dia);
    }
    for (let i = meses - 1; i >= 0; i--) {
      const ref = sumarMeses(inicioMes(calc.hoy), -i);
      const fecha = i === 0 ? calc.hoy : finMes(ref);
      const dia = D(fecha);
      if (dia < primero && i !== 0) continue;
      let act = 0, deu = 0;
      for (const c of estado.cuentas || []) {
        if (c.archivada) continue;
        const v = calc.sims[c.id].saldoEn(dia);
        if (esDeuda(c)) deu += Math.max(0, v); else act += v;
      }
      out.push({ fecha, mes: mesDe(fecha), activos: act, deudas: deu, patrimonio: act - deu });
    }
    return out;
  }

  /* ======================= Flujo, presupuesto, papás ======================= */

  function movimientosDelMes(estado, ym) { return (estado.movimientos || []).filter(m => mesDe(m.fecha) === ym); }

  /** Ingresos, gastos (mi parte), apoyo de papás y ahorro de un mes. */
  function flujoMes(estado, ym) {
    let ingresos = 0, gastos = 0, papas = 0, gastosTotales = 0;
    const porCategoria = {}, papasPorCategoria = {};
    for (const m of movimientosDelMes(estado, ym)) {
      if (m.tipo === 'ingreso') ingresos += Number(m.monto) || 0;
      else if (m.tipo === 'gasto') {
        const mio = parteMia(m), suyo = partePapas(m);
        gastos += mio; papas += suyo; gastosTotales += Number(m.monto) || 0;
        porCategoria[m.categoriaId] = (porCategoria[m.categoriaId] || 0) + mio;
        if (suyo) papasPorCategoria[m.categoriaId] = (papasPorCategoria[m.categoriaId] || 0) + suyo;
      }
    }
    let apartado = 0;
    for (const f of estado.flujosApartado || []) {
      if (mesDe(f.fecha) !== ym) continue;
      if (f.tipo === 'deposito') apartado += Number(f.monto) || 0;
      if (f.tipo === 'retiro') apartado -= Number(f.monto) || 0;
    }
    const ahorro = ingresos - gastos;
    return { ingresos, gastos, papas, gastosTotales, ahorro, tasaAhorro: ingresos > 0 ? ahorro / ingresos * 100 : 0, porCategoria, papasPorCategoria, apartado };
  }

  /** Gasto promedio mensual (mi parte) de los últimos `n` meses completos con datos. */
  function gastoPromedioMensual(estado, hoy, n) {
    n = n || 3;
    const vals = [];
    for (let i = 1; i <= 12 && vals.length < n; i++) {
      const ym = mesDe(sumarMeses(inicioMes(hoy), -i));
      const movs = movimientosDelMes(estado, ym);
      if (movs.some(m => m.tipo === 'gasto')) vals.push(flujoMes(estado, ym).gastos);
    }
    if (!vals.length) {
      const f = flujoMes(estado, mesDe(hoy));
      const p = partes(hoy);
      return f.gastos / Math.max(1, p.d) * diasEnMes(p.y, p.m);
    }
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }

  /** Ahorro mensual promedio (ingresos − gastos) de los últimos meses completos. */
  function ahorroPromedioMensual(estado, hoy, n) {
    n = n || 3;
    const vals = [];
    for (let i = 1; i <= 12 && vals.length < n; i++) {
      const ym = mesDe(sumarMeses(inicioMes(hoy), -i));
      if (movimientosDelMes(estado, ym).length) vals.push(flujoMes(estado, ym).ahorro);
    }
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  }

  /** Ingreso mensual neto estimado a partir de las fuentes de ingreso. */
  function ingresoMensualFuentes(estado) {
    let mensual = 0, anualBruto = 0;
    const mult = { mensual: 12, quincenal: 24, semanal: 52, anual: 1, unico: 0 };
    for (const f of (estado.ingresos && estado.ingresos.fuentes) || []) {
      const k = mult[f.frecuencia] != null ? mult[f.frecuencia] : 12;
      mensual += (Number(f.neto) || 0) * k / 12;
      anualBruto += (Number(f.bruto) || Number(f.neto) || 0) * k;
    }
    return { mensual, anualBruto };
  }

  /** Estado del presupuesto de un mes por categoría. */
  function estadoPresupuesto(estado, ym) {
    const f = flujoMes(estado, ym);
    const montos = (estado.presupuesto && estado.presupuesto.montos) || {};
    const filas = [];
    let totalPres = 0, totalGast = 0;
    for (const cat of (estado.categorias || []).filter(c => c.tipo !== 'ingreso')) {
      const pres = Number(montos[cat.id]) || 0;
      const gast = f.porCategoria[cat.id] || 0;
      const pap = f.papasPorCategoria[cat.id] || 0;
      if (!pres && !gast && !pap) continue;
      totalPres += pres; totalGast += gast;
      filas.push({ cat, presupuesto: pres, gastado: gast, papas: pap, restante: pres - gast, pct: pres > 0 ? gast / pres * 100 : (gast > 0 ? 999 : 0) });
    }
    return { filas, totalPres, totalGast, flujo: f };
  }

  /* ======================= Recurrentes y calendario ======================= */

  /** Siguiente fecha de un recurrente después de `iso`. */
  function siguienteFecha(rec, iso) {
    const p = partes(iso);
    switch (rec.frecuencia) {
      case 'semanal': return sumarDias(iso, 7);
      case 'quincenal': {
        const ult = diasEnMes(p.y, p.m);
        if (p.d < 15) return armar(p.y, p.m, 15);
        if (p.d < ult) return armar(p.y, p.m, ult);
        return armar(p.m === 12 ? p.y + 1 : p.y, p.m === 12 ? 1 : p.m + 1, 15);
      }
      case 'anual': return sumarMeses(iso, 12, Number(rec.dia) || p.d);
      default: return sumarMeses(iso, 1, Number(rec.dia) || p.d);
    }
  }

  /** Ocurrencias de un recurrente entre dos fechas (inclusive). */
  function ocurrencias(rec, desde, hasta) {
    const out = [];
    if (!rec.proxima || rec.activo === false) return out;
    let f = rec.proxima, guard = 0;
    while (D(f) <= D(hasta) && guard++ < 500) {
      if (D(f) >= D(desde)) out.push(f);
      f = siguienteFecha(rec, f);
    }
    return out;
  }

  /**
   * Genera los movimientos de recurrentes vencidos (fecha <= hoy).
   * MUTA el estado. Devuelve la cantidad generada.
   */
  function generarRecurrentes(estado, hoy, nuevoId) {
    let n = 0;
    for (const r of estado.recurrentes || []) {
      if (r.activo === false || !r.proxima) continue;
      let guard = 0;
      while (D(r.proxima) <= D(hoy) && guard++ < 200) {
        estado.movimientos.push({
          id: nuevoId(), fecha: r.proxima, tipo: r.tipo, monto: Number(r.monto) || 0,
          categoriaId: r.categoriaId, cuentaId: r.cuentaId, cuentaDestinoId: r.cuentaDestinoId || null,
          nota: r.nombre, papas: Number(r.papas) || 0, recurrenteId: r.id, creado: Date.now() + n,
        });
        r.proxima = siguienteFecha(r, r.proxima);
        n++;
      }
    }
    return n;
  }

  /** Próxima fecha de vencimiento de Cetes (rueda por plazos si se reinvierte). */
  function proximoVencimiento(cuenta, hoy) {
    if (!cuenta.fechaVencimiento) return null;
    let f = cuenta.fechaVencimiento, guard = 0;
    if (cuenta.reinvertir) while (D(f) < D(hoy) && guard++ < 400) f = sumarDias(f, Number(cuenta.plazo) || 28);
    return f;
  }

  /**
   * Eventos financieros entre dos fechas: recurrentes, tarjetas (corte y pago),
   * préstamos, vencimientos de Cetes, ingresos y metas.
   */
  function eventos(estado, calc, desde, hasta) {
    const out = [];
    const cats = Object.fromEntries((estado.categorias || []).map(c => [c.id, c]));
    for (const r of estado.recurrentes || []) {
      for (const f of ocurrencias(r, desde, hasta)) {
        out.push({ fecha: f, tipo: r.tipo === 'ingreso' ? 'ingreso' : 'recurrente', titulo: r.nombre, monto: Number(r.monto) || 0, icono: r.tipo === 'ingreso' ? 'arrowDown' : ((cats[r.categoriaId] || {}).icono || 'repeat'), signo: r.tipo === 'ingreso' ? 1 : -1 });
      }
    }
    for (const c of estado.cuentas || []) {
      if (c.archivada) continue;
      const cc = calc.cuentas[c.id];
      if (c.tipo === 'credito' && c.credito) {
        for (let f = proximoDiaDelMes(desde, Number(c.credito.diaCorte) || 1); D(f) <= D(hasta); f = sumarMeses(f, 1, Number(c.credito.diaCorte))) out.push({ fecha: f, tipo: 'corte', titulo: `Corte ${c.nombre}`, monto: cc ? cc.saldo : 0, icono: 'card', signo: 0, cuentaId: c.id });
        for (let f = proximoDiaDelMes(desde, Number(c.credito.diaPago) || 1); D(f) <= D(hasta); f = sumarMeses(f, 1, Number(c.credito.diaPago))) out.push({ fecha: f, tipo: 'pago', titulo: `Pago ${c.nombre}`, monto: Number(c.credito.pagoNoIntereses) || (cc ? cc.saldo : 0), icono: 'card', signo: -1, cuentaId: c.id });
      }
      if (c.tipo === 'prestamo' && c.prestamo && Number(c.prestamo.diaPago) && cc && cc.saldo > 0) {
        for (let f = proximoDiaDelMes(desde, Number(c.prestamo.diaPago)); D(f) <= D(hasta); f = sumarMeses(f, 1, Number(c.prestamo.diaPago))) out.push({ fecha: f, tipo: 'pago', titulo: `Pago ${c.nombre}`, monto: Number(c.prestamo.pagoMensual) || 0, icono: 'receipt', signo: -1, cuentaId: c.id });
      }
      if (c.tipo === 'cetes' && c.fechaVencimiento) {
        let f = proximoVencimiento(c, desde), guard = 0;
        while (f && D(f) <= D(hasta) && guard++ < 50) {
          out.push({ fecha: f, tipo: 'vencimiento', titulo: `Vencen Cetes ${c.plazo || 28} días`, monto: cc ? cc.saldo : 0, icono: 'landmark', signo: 0, cuentaId: c.id });
          if (!c.reinvertir) break;
          f = sumarDias(f, Number(c.plazo) || 28);
        }
      }
    }
    for (const m of estado.metas || []) if (m.fechaLimite && D(m.fechaLimite) >= D(desde) && D(m.fechaLimite) <= D(hasta)) out.push({ fecha: m.fechaLimite, tipo: 'meta', titulo: `Meta: ${m.nombre}`, monto: Number(m.objetivo) || 0, icono: 'flag', signo: 0 });
    for (const a of estado.apartados || []) if (a.fechaMeta && D(a.fechaMeta) >= D(desde) && D(a.fechaMeta) <= D(hasta)) out.push({ fecha: a.fechaMeta, tipo: 'meta', titulo: `Meta apartado: ${a.nombre}`, monto: Number(a.meta) || 0, icono: 'flag', signo: 0 });
    return out.sort((a, b) => D(a.fecha) - D(b.fecha));
  }

  /* ======================= Metas y apartados ======================= */

  /** Aportación mensual de un apartado: la configurada o el promedio neto de los últimos 3 meses. */
  function aportacionApartado(estado, apartadoId, hoy) {
    const a = (estado.apartados || []).find(x => x.id === apartadoId);
    if (a && Number(a.aportacionMensual) > 0) return Number(a.aportacionMensual);
    const desde = D(sumarMeses(hoy, -3));
    let neto = 0;
    for (const f of estado.flujosApartado || []) {
      if (D(f.fecha) < desde || D(f.fecha) > D(hoy)) continue;
      const m = Number(f.monto) || 0;
      if (f.tipo === 'deposito' && f.apartadoId === apartadoId) neto += m;
      if (f.tipo === 'retiro' && f.apartadoId === apartadoId) neto -= m;
      if (f.tipo === 'traspaso' && f.apartadoId === apartadoId) neto -= m;
      if (f.tipo === 'traspaso' && f.apartadoDestinoId === apartadoId) neto += m;
    }
    return Math.max(0, Math.round(neto / 3 / 50) * 50);
  }

  /** Progreso de una meta: valor actual, tasa, aportación necesaria, etc. */
  function progresoMeta(estado, calc, meta) {
    let actual = Number(meta.actualManual) || 0, tasa = 0;
    if (meta.vinculo === 'apartado' && calc.apartados[meta.vinculoId]) { actual = calc.apartados[meta.vinculoId].valor; tasa = calc.apartados[meta.vinculoId].tasa; }
    else if (meta.vinculo === 'cuenta' && calc.cuentas[meta.vinculoId]) { actual = calc.cuentas[meta.vinculoId].saldo; tasa = calc.cuentas[meta.vinculoId].tasaNeta; }
    let objetivo = Number(meta.objetivo) || 0;
    if (meta.auto === 'fondo') objetivo = (Number(estado.config.fondoMeses) || 6) * gastoPromedioMensual(estado, calc.hoy);
    const meses = meta.fechaLimite ? Math.max(0, mesesEntre(calc.hoy, meta.fechaLimite)) : null;
    const necesario = meses != null ? Fz.aportacionNecesaria(actual, objetivo, tasa, Math.max(1, Math.ceil(meses)), 'diaria') : null;
    return { actual, objetivo, tasa, pct: objetivo > 0 ? Math.min(100, actual / objetivo * 100) : 0, faltante: Math.max(0, objetivo - actual), meses, necesario };
  }

  /* ======================= Exportación ======================= */
  const Motor = {
    D, ISO, hoyISO, sumarMeses, sumarDias, inicioMes, finMes, mesDe, mesesEntre, diasEnMes, proximoDiaDelMes, partes,
    TIPOS_CUENTA, esDeuda, esLiquida, entradaTasa, promoActiva, tasaBrutaEn, capDe, netaDe, parteMia, partePapas,
    piernas, simularCuenta, calcular, valorApartadoEn, seriePatrimonio, factorLote,
    movimientosDelMes, flujoMes, gastoPromedioMensual, ahorroPromedioMensual, ingresoMensualFuentes, estadoPresupuesto,
    siguienteFecha, ocurrencias, generarRecurrentes, proximoVencimiento, eventos,
    aportacionApartado, progresoMeta,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = Motor;
  else raiz.Motor = Motor;
})(typeof window !== 'undefined' ? window : globalThis);
