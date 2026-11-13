/* =====================================================================
 * consejos.js — Alertas inteligentes y mensajes de proyección en
 * lenguaje natural. Puro (sin DOM): devuelve textos con <strong>.
 * ===================================================================== */
(function (raiz) {
  'use strict';
  const nodo = typeof module !== 'undefined' && module.exports;
  const M = nodo ? require('./motor.js') : raiz.Motor;
  const Fz = nodo ? require('./finanzas.js') : raiz.Finanzas;
  const F = nodo ? require('./formato.js') : raiz.Formato;

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const b = s => `<strong>${s}</strong>`;
  const $ = (n, op) => F.dinero(n, op);

  /* ---------- Opciones donde poner dinero (mis cuentas que rinden + externas) ---------- */
  function opcionesRendimiento(estado, calc, incluirExistente) {
    const cfg = estado.config;
    const ops = [];
    for (const c of estado.cuentas) {
      if (c.archivada || M.esDeuda(c) || !c.historialTasas.length) continue;
      if (!['rendimiento', 'cajita', 'cetes', 'inversion'].includes(c.tipo)) continue;
      const e = calc.cuentas[c.id].entrada;
      if (!e) continue;
      ops.push({ id: c.id, nombre: c.nombre, propia: true, tramos: e.tramos, promo: calc.cuentas[c.id].promo, saldoExistente: incluirExistente ? Math.max(0, calc.cuentas[c.id].saldo) : 0, retencion: c.aplicaISR ? cfg.retencionISR : 0, capitalizacion: M.capDe(c), plazo: c.plazo, color: c.color });
    }
    for (const o of estado.opcionesComparador || []) ops.push({ id: o.id, nombre: o.nombre, propia: false, tramos: o.tramos, promo: o.promo && Number(o.promo.tasa) > 0 ? o.promo : null, saldoExistente: 0, retencion: o.aplicaISR !== false ? cfg.retencionISR : 0, capitalizacion: o.capitalizacion || 'diaria', plazo: o.plazo, color: o.color });
    return ops;
  }

  /** Mejor opción para un monto (por ganancia a 12 meses). */
  function mejorOpcion(estado, calc, monto, excluirId) {
    let mejor = null;
    for (const op of opcionesRendimiento(estado, calc, true)) {
      if (op.id === excluirId) continue;
      const g = Fz.gananciaOpcion(monto, op, 12);
      if (!mejor || g.ganancia > mejor.ganancia) mejor = { ...g, op };
    }
    return mejor;
  }

  /* ======================= Alertas ======================= */
  const PESO = { peligro: 0, aviso: 1, info: 2, exito: 3 };

  function alertas(estado, calc) {
    const hoy = calc.hoy, dHoy = M.D(hoy);
    const out = [];
    const add = (nivel, icono, titulo, texto, ruta) => out.push({ nivel, icono, titulo, texto, ruta });

    // 1) Presupuesto del mes
    const pres = M.estadoPresupuesto(estado, M.mesDe(hoy));
    for (const f of pres.filas) {
      if (!(f.presupuesto > 0)) continue;
      if (f.pct > 100.5) add('peligro', 'alert', `Te pasaste ${Math.round(f.pct - 100)} % en ${esc(f.cat.nombre)}`, `Llevas ${b($(f.gastado))} de ${$(f.presupuesto)} este mes.`, 'presupuesto');
      else if (f.pct >= 85) add('aviso', 'pie', `Vas en ${Math.round(f.pct)} % de ${esc(f.cat.nombre)}`, `Te quedan ${b($(f.restante))} para el resto del mes.`, 'presupuesto');
    }

    // 2) Dinero sin rendimiento
    for (const c of estado.cuentas) {
      if (c.archivada || M.esDeuda(c) || ['afore', 'ppr'].includes(c.tipo)) continue;
      const cc = calc.cuentas[c.id];
      if (cc.tasaBruta > 0 || cc.saldo < 3000) continue;
      const mejor = mejorOpcion(estado, calc, cc.saldo, c.id);
      if (mejor && mejor.ganancia > 50) add('aviso', 'coins', `Tienes ${$(cc.saldo, { dec: 0 })} en ${esc(c.nombre)} con 0 % de rendimiento`, `En ${b(esc(mejor.op.nombre))} ganarías ~${b($(mejor.ganancia, { dec: 0 }))} al año (neto, tasa marginal ${F.pct(mejor.tasa)}).`, 'comparador');
    }

    // 3) Tarjetas: corte, pago y utilización
    for (const c of estado.cuentas) {
      if (c.archivada || c.tipo !== 'credito' || !c.credito) continue;
      const cc = calc.cuentas[c.id];
      const corte = M.proximoDiaDelMes(hoy, Number(c.credito.diaCorte) || 1);
      const pago = M.proximoDiaDelMes(hoy, Number(c.credito.diaPago) || 1);
      const dc = M.D(corte) - dHoy, dp = M.D(pago) - dHoy;
      if (dc <= 5) add(dc <= 1 ? 'aviso' : 'info', 'card', `Tu ${esc(c.nombre)} corta ${F.relativo(dc)}`, `Saldo actual ${b($(cc.saldo))}. Lo que compres después del corte se paga hasta el siguiente mes.`, 'deudas');
      if (dp <= 7 && cc.saldo > 0) add(dp <= 2 ? 'peligro' : 'aviso', 'clock', `Paga tu ${esc(c.nombre)} ${F.relativo(dp)}`, `Pago para no generar intereses: ${b($(Number(c.credito.pagoNoIntereses) || cc.saldo))} (fecha límite ${F.fecha(pago, 'sinAnio')}).`, 'deudas');
      const lim = Number(c.credito.limite) || 0;
      if (lim > 0 && cc.saldo / lim > 0.3) add(cc.saldo / lim > 0.5 ? 'peligro' : 'aviso', 'percent', `Usas ${Math.round(cc.saldo / lim * 100)} % de la línea de ${esc(c.nombre)}`, 'Mantenerla debajo de 30 % ayuda a tu historial en Buró de Crédito.', 'deudas');
    }

    // 4) Cetes por vencer y promociones por terminar
    for (const c of estado.cuentas) {
      if (c.archivada) continue;
      if (c.tipo === 'cetes' && c.fechaVencimiento) {
        const v = M.proximoVencimiento(c, hoy); const d = M.D(v) - dHoy;
        if (d >= 0 && d <= 7) add('info', 'landmark', `Tus Cetes vencen ${F.relativo(d)}`, c.reinvertir ? `Se reinvertirán a ${c.plazo || 28} días. Revisa si la tasa sigue conviniendo.` : 'No tienes reinversión: el dinero dejará de rendir.', 'cuentas');
      }
      const e = calc.cuentas[c.id] && calc.cuentas[c.id].entrada;
      if (e && e.promo && Number(e.promo.dias) > 0) {
        const fin = M.D(e.fecha) + Number(e.promo.dias) - dHoy;
        if (fin >= 0 && fin <= 10) add('aviso', 'clock', `Termina la promoción de ${esc(c.nombre)} ${F.relativo(fin)}`, `Después rendirá a su tasa normal. Usa el comparador para decidir si mover el dinero.`, 'comparador');
      }
    }

    // 5) Tasas sin actualizar
    for (const c of estado.cuentas) {
      if (c.archivada || M.esDeuda(c) || !['rendimiento', 'cajita', 'cetes', 'inversion'].includes(c.tipo)) continue;
      const e = calc.cuentas[c.id].entrada;
      if (e && dHoy - M.D(e.fecha) > 75) add('info', 'refresh', `Verifica la tasa de ${esc(c.nombre)}`, `No la actualizas desde hace ${dHoy - M.D(e.fecha)} días. Las tasas cambian seguido.`, 'cuentas');
    }

    // 6) Apartados que exceden el saldo de la cuenta
    for (const c of estado.cuentas) {
      const s = calc.sinAsignar[c.id];
      if (s != null && (calc.asignado[c.id] || 0) > 0 && s < -Math.max(50, 0.01 * Math.abs(calc.cuentas[c.id].saldo))) add('aviso', 'layers', `Tus apartados en ${esc(c.nombre)} suman más que su saldo`, `Faltan ${b($(-s))}. Actualiza el saldo o registra el retiro correspondiente.`, 'apartados');
    }

    // 7) Tasa de ahorro del mes anterior y fondo de emergencia
    const ant = M.flujoMes(estado, M.mesDe(M.sumarMeses(M.inicioMes(hoy), -1)));
    if (ant.ingresos > 0 && ant.tasaAhorro < 10) add('aviso', 'trendingDown', `El mes pasado ahorraste ${Math.round(ant.tasaAhorro)} %`, 'Una buena meta es ahorrar al menos 20 % de lo que ganas.', 'presupuesto');
    const fondo = estado.apartados.find(a => a.esFondo);
    const gp = M.gastoPromedioMensual(estado, hoy);
    if (fondo && gp > 0) {
      const meses = calc.apartados[fondo.id].valor / gp;
      if (meses < 3) add('info', 'shield', `Tu fondo de emergencia cubre ${meses.toFixed(1)} meses`, `La meta recomendada es de ${estado.config.fondoMeses} meses (${$(gp * estado.config.fondoMeses, { dec: 0 })}).`, 'metas');
    }

    // 8) Respaldo
    const ult = estado.config.ultimoRespaldo;
    const diasResp = ult ? dHoy - M.D(ult.slice(0, 10)) : null;
    if ((estado.cuentas.length || estado.movimientos.length) && (diasResp == null || diasResp > 14)) add('aviso', 'download', diasResp == null ? 'Aún no respaldas tus datos' : `Tu último respaldo fue hace ${diasResp} días`, 'Tus datos viven solo en este navegador. Exporta un JSON y guárdalo en un lugar seguro.', 'config');

    return out.sort((a, b2) => PESO[a.nivel] - PESO[b2.nivel]);
  }

  /** Pagos y eventos de los próximos `dias` días. */
  function proximosPagos(estado, calc, dias) {
    return M.eventos(estado, calc, calc.hoy, M.sumarDias(calc.hoy, dias || 14)).filter(e => e.tipo !== 'ingreso' && e.tipo !== 'meta');
  }

  /* ======================= Proyección de apartados ======================= */

  /** Redondea hacia arriba a múltiplos de `m`. */
  const redArriba = (n, m) => Math.ceil(n / m) * m;

  /**
   * Proyección de un apartado: serie histórica real + futura,
   * y mensajes en lenguaje natural.
   */
  function proyeccionApartado(estado, calc, ap, pmtManual) {
    const hoy = calc.hoy;
    const ca = calc.apartados[ap.id] || { valor: 0, aportado: 0, ganado: 0, tasa: 0, lotes: [] };
    const pmt = pmtManual != null ? pmtManual : M.aportacionApartado(estado, ap.id, hoy);
    // Si el apartado aún no tiene dinero, se proyecta con la tasa ponderada de mis cuentas.
    const tasa = ca.valor > 0 ? ca.tasa : calc.tasaPonderada;
    const meta = Number(ap.meta) || 0;
    const nombre = b(esc(ap.nombre));

    // Horizonte: hasta la fecha meta, o hasta alcanzar la meta, o 12 meses.
    let horizonte = 12;
    const mesesMeta = meta > 0 ? Fz.mesesParaMeta(ca.valor, pmt, tasa, meta, 'diaria') : null;
    if (ap.fechaMeta) horizonte = Math.max(1, Math.ceil(M.mesesEntre(hoy, ap.fechaMeta)));
    else if (mesesMeta != null && isFinite(mesesMeta)) horizonte = Math.max(6, Math.min(120, mesesMeta + 1));
    horizonte = Math.min(horizonte, 120);

    // Serie histórica (fin de cada mes desde el primer depósito).
    const serie = [];
    const lotes = (calc.porApartado[ap.id] || []);
    if (lotes.length) {
      const primero = M.inicioMes(M.ISO(Math.min(...lotes.map(l => l.dia))));
      for (let f = primero, g = 0; M.D(f) < M.D(M.inicioMes(hoy)) && g < 240; f = M.sumarMeses(f, 1), g++) {
        const fin = M.finMes(f);
        const v = M.valorApartadoEn(estado, calc, ap.id, fin);
        serie.push({ fecha: fin, aportado: v.aportado, rendimiento: v.ganado, total: v.valor, futuro: false });
      }
    }
    serie.push({ fecha: hoy, aportado: ca.aportado, rendimiento: ca.ganado, total: ca.valor, futuro: false, hoy: true });
    for (let m = 1; m <= horizonte; m++) {
      const vf = Fz.valorFuturo(ca.valor, pmt, tasa, m, 'diaria');
      serie.push({ fecha: M.sumarMeses(hoy, m), aportado: ca.aportado + pmt * m, rendimiento: ca.ganado + vf.rendimiento, total: vf.total, futuro: true });
    }

    // Mensajes
    const lineas = [];
    const fin = serie[serie.length - 1];
    const ritmo = pmt > 0 ? `Si sigues ahorrando ${b($(pmt, { dec: 0 }) + ' al mes')}` : 'Aunque ya no aportes nada';
    if (meta > 0 && ca.valor >= meta) {
      lineas.push(`¡Ya alcanzaste tu meta de ${nombre}! Llevas ${b($(ca.valor))}, ${Math.round(ca.valor / meta * 100)} % de lo que te propusiste.`);
    } else {
      if (ap.fechaMeta) {
        lineas.push(`${ritmo}, el ${b(F.fecha(ap.fechaMeta, 'larga'))} tendrás ${b($(fin.total, { dec: 0 }))} en ${nombre} (de los cuales ${b($(fin.rendimiento, { dec: 0 }))} serán rendimientos).`);
      } else {
        lineas.push(`${ritmo}, en ${F.duracion(horizonte)} (${F.fecha(fin.fecha, 'media')}) tendrás ${b($(fin.total, { dec: 0 }))} en ${nombre} (de los cuales ${b($(fin.rendimiento, { dec: 0 }))} serán rendimientos).`);
      }
      if (meta > 0) {
        const faltan = meta - ca.valor;
        let txt = `Te faltan ${b($(faltan, { dec: 0 }))} para tu meta de ${nombre}. `;
        if (pmt > 0 && isFinite(mesesMeta)) {
          txt += `Al ritmo actual llegas en ${b(F.duracion(mesesMeta))} (${F.fecha(M.sumarMeses(hoy, mesesMeta), 'mes')})`;
          const mas = redArriba(pmt * 1.5, 500);
          const m2 = Fz.mesesParaMeta(ca.valor, mas, tasa, meta, 'diaria');
          if (isFinite(m2) && m2 < mesesMeta) txt += `; si subes a ${b($(mas, { dec: 0 }) + '/mes')} llegas en ${b(F.duracion(m2))}.`;
          else txt += '.';
        } else {
          const sug = redArriba(faltan / 12, 100);
          txt += `Con ${b($(sug, { dec: 0 }) + '/mes')} llegarías en aproximadamente un año.`;
        }
        lineas.push(txt);
        if (ap.fechaMeta) {
          const n = Math.max(1, Math.ceil(M.mesesEntre(hoy, ap.fechaMeta)));
          const nec = Fz.aportacionNecesaria(ca.valor, meta, tasa, n, 'diaria');
          if (nec > pmt + 1) lineas.push(`Para llegar a tiempo (${F.fecha(ap.fechaMeta, 'media')}) necesitas ahorrar ${b($(nec, { dec: 0 }) + '/mes')}.`);
          else if (pmt > 0) lineas.push(`Vas a tiempo: con ${$(nec, { dec: 0 })}/mes también llegarías.`);
        }
      }
    }
    return { pmt, tasa, valor: ca.valor, meta, serie, lineas, mesesMeta, horizonte, fin };
  }

  /** Lo que generaron todos los apartados en lo que va del mes. */
  function generadoApartadosMes(estado, calc) {
    const corte = M.finMes(M.sumarMeses(M.inicioMes(calc.hoy), -1));
    let total = 0;
    for (const a of estado.apartados) {
      const hoyV = calc.apartados[a.id];
      const antes = M.valorApartadoEn(estado, calc, a.id, corte);
      // Aportaciones netas del mes (depósitos − retiros) a valor nominal
      const flujos = (calc.porApartado[a.id] || []).filter(l => l.dia > M.D(corte) && l.dia <= calc.dHoy).reduce((s, l) => s + l.monto, 0);
      total += hoyV.valor - antes.valor - flujos;
    }
    return Math.max(0, total);
  }

  /** Mensajes del dashboard. */
  function mensajesDashboard(estado, calc) {
    const out = [];
    const gen = generadoApartadosMes(estado, calc);
    if (gen > 0.5) {
      // ¿Qué gastos fijos cubre?
      const fijos = (estado.recurrentes || []).filter(r => r.tipo === 'gasto' && r.activo !== false && r.frecuencia === 'mensual' && !(Number(r.papas) >= 100)).sort((x, y) => x.monto - y.monto);
      const cubre = []; let acum = 0;
      const comun = /^(plan|gimnasio|gym|renta|luz|internet|seguro|celular|agua|colegiatura|recibo|pago|mensualidad|suscripci)/i;
      const nom = n => comun.test(n) ? n.charAt(0).toLowerCase() + n.slice(1) : n;
      for (const r of fijos) if (acum + Number(r.monto) <= gen) { acum += Number(r.monto); cubre.push('tu ' + esc(nom(r.nombre))); }
      let txt = `Este mes tus apartados generaron ${b($(gen))}.`;
      if (cubre.length) txt += ` Eso cubre ${F.lista(cubre)}.`;
      else if (fijos.length) txt += ` Eso ya es el ${Math.round(gen / fijos[0].monto * 100)} % de tu ${esc(nom(fijos[0].nombre))}.`;
      out.push(txt);
    }
    const anual = calc.rendimiento.anual;
    if (anual > 0) out.push(`Tu dinero trabaja: a las tasas actuales tus cuentas te generarán ~${b($(anual, { dec: 0 }))} en un año sin que hagas nada.`);
    const ahorro = M.ahorroPromedioMensual(estado, calc.hoy);
    if (ahorro > 0) {
      const vf = Fz.valorFuturo(calc.patrimonio, ahorro, calc.tasaPonderada, 12, 'diaria');
      out.push(`Si sigues ahorrando ${b($(ahorro, { dec: 0 }) + ' al mes')}, en un año tu patrimonio será de ${b($(vf.total, { dec: 0 }))}.`);
    }
    // El apartado con meta más cercano a cumplirse
    let cercano = null;
    for (const a of estado.apartados) {
      if (!(Number(a.meta) > 0)) continue;
      const p = proyeccionApartado(estado, calc, a);
      if (p.valor < p.meta && isFinite(p.mesesMeta) && (!cercano || p.mesesMeta < cercano.p.mesesMeta)) cercano = { a, p };
    }
    if (cercano) out.push(cercano.p.lineas[cercano.p.lineas.length > 1 ? 1 : 0]);
    return out;
  }

  const Consejos = { opcionesRendimiento, mejorOpcion, alertas, proximosPagos, proyeccionApartado, generadoApartadosMes, mensajesDashboard, esc };
  if (nodo) module.exports = Consejos; else raiz.Consejos = Consejos;
})(typeof window !== 'undefined' ? window : globalThis);
