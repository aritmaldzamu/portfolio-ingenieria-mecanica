/* =====================================================================
 * parser.js — Interpreta frases en español natural SIN internet ni IA,
 * con reglas y expresiones regulares propias.
 *   "metí 10000 a revolut al 9% para coche"
 *   "gasté 350 en comida con nu"
 *   "me pagaron 12,500 de sueldo"
 *   "pasa 2000 de nu a cetes"
 *   "nu ahora da 7.5%"
 * Devuelve un objeto con lo detectado y lo que falta.
 * ===================================================================== */
(function (raiz) {
  'use strict';

  /** Minúsculas, sin acentos, espacios simples. */
  function normalizar(t) {
    return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[¿?¡!]/g, ' ').replace(/\s+/g, ' ').trim();
  }
  const escapar = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const MESES = { enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12, ene: 1, feb: 2, mar: 3, abr: 4, jun: 6, jul: 7, ago: 8, sep: 9, oct: 10, nov: 11, dic: 12 };

  /** Sinónimos por id de categoría (sin el prefijo cat_). */
  const SINONIMOS = {
    comida: ['comida', 'comi', 'comer', 'restaurante', 'restaurantes', 'tacos', 'taco', 'cena', 'desayuno', 'almuerzo', 'cafe', 'cafeteria', 'starbucks', 'pizza', 'hamburguesa', 'hamburguesas', 'sushi', 'antojo', 'antojos', 'torta', 'tortas', 'cemita', 'cemitas', 'rappi', 'uber eats', 'didi food', 'lonche'],
    super: ['super', 'supermercado', 'despensa', 'walmart', 'soriana', 'chedraui', 'costco', 'bodega aurrera', 'oxxo', 'mandado', 'heb', 'mercado'],
    transporte: ['transporte', 'uber', 'didi', 'taxi', 'camion', 'metro', 'metrobus', 'pasaje', 'caseta', 'casetas', 'estacionamiento', 'peaje'],
    gasolina: ['gasolina', 'gasolinera', 'magna', 'premium', 'diesel', 'combustible', 'tanque'],
    renta: ['renta', 'alquiler', 'depa', 'departamento', 'cuarto'],
    servicios: ['servicios', 'luz', 'agua', 'cfe', 'gas', 'predial', 'mantenimiento'],
    celular: ['celular', 'telefono', 'internet', 'telcel', 'att', 'movistar', 'recarga', 'totalplay', 'izzi', 'megacable', 'plan'],
    suscripciones: ['suscripcion', 'suscripciones', 'spotify', 'netflix', 'disney', 'hbo', 'max', 'prime video', 'amazon prime', 'youtube', 'icloud', 'chatgpt', 'apple music', 'xbox', 'playstation', 'crunchyroll'],
    salud: ['salud', 'doctor', 'medico', 'farmacia', 'medicina', 'medicinas', 'dentista', 'gimnasio', 'gym', 'consulta', 'hospital', 'lentes', 'analisis'],
    ropa: ['ropa', 'zapatos', 'tenis', 'playera', 'pantalon', 'chamarra', 'shein', 'zara', 'sudadera'],
    salidas: ['salidas', 'salida', 'cine', 'bar', 'fiesta', 'antro', 'concierto', 'cervezas', 'chelas', 'boliche', 'karaoke', 'fiestas'],
    educacion: ['educacion', 'curso', 'cursos', 'libro', 'libros', 'colegiatura', 'udemy', 'coursera', 'certificacion', 'diplomado', 'escuela'],
    regalos: ['regalo', 'regalos', 'cumpleanos', 'detalle'],
    viajes: ['viaje', 'viajes', 'vuelo', 'vuelos', 'hotel', 'airbnb', 'boletos', 'avion', 'hospedaje'],
    negocio: ['negocio', 'material', 'herramienta', 'herramientas', 'proveedor', 'refacciones', 'componentes'],
    otros: ['otros', 'otro', 'varios'],
    sueldo: ['sueldo', 'quincena', 'nomina', 'salario', 'pago de la chamba'],
    freelance: ['freelance', 'proyecto', 'cliente', 'chambita', 'honorarios'],
    beca: ['beca', 'practicas', 'practicante'],
    aguinaldo: ['aguinaldo', 'prima', 'prima vacacional', 'bono', 'utilidades', 'ptu'],
    rendimientos: ['rendimientos', 'intereses'],
  };

  const VERBOS = {
    tasa: /\b(ahora da|ahora paga|ahora rinde|ya da|ya paga|da|paga|rinde|subio|bajo|cambio|tasa)\b/,
    transferencia: /\b(pasa|pase|paso|pasar|pasale|transfiere|transferi|transferir|transfer|mueve|movi|mover|traspasa|traspase|traspasar|manda|mande)\b/,
    deposito: /\b(meti|mete|meter|metele|deposite|deposita|depositar|ahorre|ahorra|ahorrar|guarde|guarda|guardar|aparte|aparta|apartar|inverti|invierte|invertir|puse|pon|poner|abone|abona)\b/,
    retiro: /\b(saque|saca|sacar|retire|retira|retirar|retiro|use|usa|tome|toma)\b/,
    ingreso: /\b(me pagaron|me depositaron|me cayo|me cayeron|me llego|me llegaron|cobre|cobro|recibi|gane|ingreso|ingresaron|me dieron|vendi)\b/,
    gasto: /\b(gaste|gasto|gastar|pague|pagaron|pagamos|pagar|compre|compra|comprar|me costo|me cobraron|cargo|cargaron|invite)\b/,
  };

  /** Busca la fecha en el texto. Devuelve {fecha, resto}. */
  function extraerFecha(t, hoy) {
    const [hy, hm, hd] = hoy.split('-').map(Number);
    const base = Date.UTC(hy, hm - 1, hd);
    const iso = ms => new Date(ms).toISOString().slice(0, 10);
    let m;
    if ((m = t.match(/\b(antier|antes de ayer|anteayer)\b/))) return { fecha: iso(base - 2 * 864e5), resto: t.replace(m[0], ' ') };
    if ((m = t.match(/\bayer\b/))) return { fecha: iso(base - 864e5), resto: t.replace(m[0], ' ') };
    if ((m = t.match(/\bhoy\b/))) return { fecha: hoy, resto: t.replace(m[0], ' ') };
    if ((m = t.match(/\b(?:el )?(\d{1,2}) de (enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)(?: de (\d{4}))?\b/))) {
      const d = +m[1], mes = MESES[m[2]]; let y = m[3] ? +m[3] : hy;
      if (!m[3] && Date.UTC(y, mes - 1, d) > base + 864e5 * 31) y--;
      return { fecha: iso(Date.UTC(y, mes - 1, d)), resto: t.replace(m[0], ' ') };
    }
    if ((m = t.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/))) {
      const d = +m[1], mes = +m[2]; let y = m[3] ? +m[3] : hy; if (y < 100) y += 2000;
      if (mes >= 1 && mes <= 12 && d >= 1 && d <= 31) return { fecha: iso(Date.UTC(y, mes - 1, d)), resto: t.replace(m[0], ' ') };
    }
    if ((m = t.match(/\bel (?:dia )?(\d{1,2})\b(?!\s*(%|por ?ciento|mil|k\b))/))) {
      const d = +m[1];
      if (d >= 1 && d <= 31) {
        let y = hy, mes = hm;
        if (d > hd) { mes--; if (mes < 1) { mes = 12; y--; } }
        return { fecha: iso(Date.UTC(y, mes - 1, d)), resto: t.replace(m[0], ' ') };
      }
    }
    return { fecha: null, resto: t };
  }

  /** Extrae una tasa "9%", "al 7.5 %", "9 por ciento". */
  function extraerTasa(t) {
    const m = t.match(/(?:\b(?:al|a|del|de|con|en)\s+)?(\d+(?:[.,]\d+)?)\s*(%|por ?ciento)/);
    if (!m) return { tasa: null, resto: t };
    return { tasa: parseFloat(m[1].replace(',', '.')), resto: t.replace(m[0], ' ') };
  }

  /** Extrae el monto: 10000, 12,500, $3,000.50, 2 mil, 10k, 1.5k. */
  function extraerMonto(t) {
    const m = t.match(/\$?\s*(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)\s*(k\b|mil\b|lucas?\b|varos?\b|pesos?\b)?/);
    if (!m) return { monto: null, resto: t };
    let n = parseFloat(m[1].replace(/,/g, ''));
    if (m[2] && /^(k|mil|luca)/.test(m[2])) n *= 1000;
    return { monto: n, resto: t.replace(m[0], ' ') };
  }

  /** Alias normalizados de una cuenta. */
  function aliasCuenta(c) {
    const out = new Set();
    const n = normalizar(c.nombre), ins = normalizar(c.institucion || '');
    out.add(n);
    if (ins && ins !== 'otra') out.add(ins);
    const p1 = n.split(' ')[0]; if (p1.length >= 2) out.add(p1);
    const i1 = ins.split(' ')[0]; if (i1.length >= 2) out.add(i1);
    if (c.tipo === 'cetes') { out.add('cetes'); out.add('cetesdirecto'); }
    if (c.tipo === 'efectivo') { out.add('efectivo'); out.add('cash'); out.add('cartera'); }
    if (c.tipo === 'credito') { out.add('tarjeta'); out.add('tdc'); out.add('credito'); out.add('tarjeta de credito'); }
    if (c.tipo === 'debito') { out.add('debito'); out.add('nomina'); }
    if (c.tipo === 'afore') out.add('afore');
    if (c.tipo === 'ppr') out.add('ppr');
    for (const x of ['mexico', 'cuenta', 'mi', 'la', 'el']) out.delete(x);
    return [...out].filter(Boolean);
  }

  /** Encuentra menciones de entidades: [{ent, pos, fin, alias}] (la más larga por entidad). */
  function menciones(t, entidades, aliasFn) {
    const out = [];
    for (const ent of entidades) {
      let mejor = null;
      for (const a of aliasFn(ent)) {
        const re = new RegExp('(^|[^a-z0-9])' + escapar(a) + '(?=$|[^a-z0-9])');
        const m = re.exec(t);
        if (m && (!mejor || a.length > mejor.alias.length)) mejor = { ent, pos: m.index + m[1].length, fin: m.index + m[1].length + a.length, alias: a };
      }
      if (mejor) out.push(mejor);
    }
    return out;
  }

  /**
   * Resuelve menciones que se enciman: gana la más larga y, en empate,
   * la entidad cuyo tipo está en `preferidos`. Devuelve ordenadas por posición.
   */
  function resolver(cands, preferidos) {
    const pref = e => (preferidos && preferidos.indexOf(e.ent.tipo) >= 0 ? preferidos.indexOf(e.ent.tipo) : 99);
    const orden = [...cands].sort((a, b) => (b.fin - b.pos) - (a.fin - a.pos) || pref(a) - pref(b));
    const ok = [];
    for (const c of orden) if (!ok.some(o => c.pos < o.fin && o.pos < c.fin)) ok.push(c);
    return ok.sort((a, b) => a.pos - b.pos);
  }
  const encima = (m, lista) => lista.some(o => m.pos < o.fin && o.pos < m.fin);

  function aliasApartado(a) {
    const n = normalizar(a.nombre);
    const out = new Set([n]);
    const vacias = new Set(['de', 'del', 'la', 'el', 'mi', 'mis', 'para', 'a', 'mi', 'irme', 'trabajar', 'fondo']);
    for (const w of n.split(' ')) if (w.length >= 4 && !vacias.has(w)) out.add(w);
    if (/emergencia/.test(n)) { out.add('emergencias'); out.add('fondo'); }
    if (/fuera/.test(n)) { out.add('irme'); out.add('extranjero'); }
    return [...out];
  }

  function aliasCategoria(c) {
    const clave = c.id.replace(/^cat_/, '');
    const out = new Set([normalizar(c.nombre), ...normalizar(c.nombre).split('/').map(s => s.trim())]);
    for (const s of SINONIMOS[clave] || []) out.add(s);
    return [...out].filter(Boolean);
  }

  /**
   * Interpreta una frase. ctx: {cuentas, apartados, categorias, hoy, cuentaPrincipalId}
   */
  function interpretar(texto, ctx) {
    const original = String(texto || '').trim();
    const cuentas = (ctx.cuentas || []).filter(c => !c.archivada);
    const apartados = ctx.apartados || [];
    const categorias = ctx.categorias || [];
    let t = ' ' + normalizar(original) + ' ';
    const res = { texto: original, tipo: null, monto: null, fecha: ctx.hoy, tasa: null, cuentaId: null, cuentaDestinoId: null, apartadoId: null, apartadoDestinoId: null, categoriaId: null, papas: 0, nota: '', supuestos: [], faltantes: [], completo: false };

    // Mis papás pagaron…
    if (/\b(mis papas|mi papa|mi mama|mis jefes|mis padres|papas)\b/.test(t)) {
      res.papas = /\b(mitad|50)\b/.test(t) ? 50 : 100;
      t = t.replace(/\b(mis papas|mi papa|mi mama|mis jefes|mis padres|papas)\b/g, ' ').replace(/\bla mitad\b/, ' ');
    }
    const f = extraerFecha(t, ctx.hoy); t = f.resto; if (f.fecha) res.fecha = f.fecha;
    const ta = extraerTasa(t); t = ta.resto; res.tasa = ta.tasa;
    const mo = extraerMonto(t); t = mo.resto; res.monto = mo.monto;

    // Intención
    const tiene = k => VERBOS[k].test(t);
    if (res.tasa != null && res.monto == null && (tiene('tasa') || /\bahora\b/.test(t))) res.tipo = 'tasa';
    else if (tiene('ingreso')) res.tipo = 'ingreso';
    else if (tiene('transferencia')) res.tipo = 'transferencia';
    else if (tiene('deposito')) res.tipo = 'deposito';
    else if (tiene('retiro')) res.tipo = 'retiro';
    else if (tiene('gasto') || res.papas) res.tipo = 'gasto';

    const rindeTipos = ['rendimiento', 'cajita', 'cetes', 'inversion', 'ppr', 'afore', 'debito', 'efectivo', 'credito'];
    const pagoTipos = ['credito', 'debito', 'efectivo', 'rendimiento', 'cajita'];
    const preferidos = (res.tipo === 'gasto' || res.tipo === 'ingreso') ? pagoTipos : rindeTipos;
    const mCuentas = resolver(menciones(t, cuentas, aliasCuenta), preferidos);
    const mAparts = resolver(menciones(t, apartados, aliasApartado).filter(m => !encima(m, mCuentas)));
    // Un alias de cuenta no debe contarse también como categoría ("nu" vs "nomina").
    const catsLibres = resolver(menciones(t, categorias, aliasCategoria).filter(m => !encima(m, mCuentas)));

    if (!res.tipo) {
      if (res.tasa != null && mCuentas.length && res.monto == null) res.tipo = 'tasa';
      else if (catsLibres.some(m => m.ent.tipo === 'ingreso')) res.tipo = 'ingreso';
      else if (catsLibres.length) res.tipo = 'gasto';
      else if (mAparts.length) res.tipo = 'deposito';
    }

    /** Elige la mejor cuenta entre varias menciones según el contexto. */
    const preferir = (lista, tipos) => {
      if (!lista.length) return null;
      const ok = lista.filter(m => tipos.includes(m.ent.tipo));
      const quiereTarjeta = /\b(tarjeta|tdc|credito)\b/.test(t);
      if (quiereTarjeta) { const c = lista.find(m => m.ent.tipo === 'credito'); if (c) return c.ent; }
      return (ok[0] || lista[0]).ent;
    };
    const principal = ctx.cuentaPrincipalId || (cuentas.find(c => c.tipo === 'debito') || cuentas[0] || {}).id || null;
    /** Texto que sigue a una preposición, para saber origen/destino. */
    const despuesDe = (pos, palabras) => palabras.some(p => new RegExp('\\b' + p + '\\s+$').test(t.slice(0, pos)));

    switch (res.tipo) {
      case 'tasa': {
        const c = preferir(mCuentas, rindeTipos);
        if (c) res.cuentaId = c.id; else res.faltantes.push('cuenta');
        break;
      }
      case 'gasto': {
        const cat = catsLibres.find(m => m.ent.tipo !== 'ingreso');
        if (cat) res.categoriaId = cat.ent.id; else { res.categoriaId = (categorias.find(c => c.id === 'cat_otros') || {}).id || null; res.supuestos.push('categoría'); }
        const c = preferir(mCuentas, pagoTipos);
        if (c) res.cuentaId = c.id;
        else if (res.papas === 100) res.cuentaId = null;
        else { res.cuentaId = principal; res.supuestos.push('cuenta'); }
        break;
      }
      case 'ingreso': {
        const cat = catsLibres.find(m => m.ent.tipo === 'ingreso');
        if (cat) res.categoriaId = cat.ent.id; else { res.categoriaId = (categorias.find(c => c.id === 'cat_otrosing') || categorias.find(c => c.tipo === 'ingreso') || {}).id || null; res.supuestos.push('categoría'); }
        const c = mCuentas.length ? mCuentas[0].ent : null;
        if (c) res.cuentaId = c.id; else { res.cuentaId = principal; res.supuestos.push('cuenta'); }
        break;
      }
      case 'transferencia': {
        // ¿Entre apartados o entre cuentas?
        if (mAparts.length >= 2 && mCuentas.length < 2) {
          res.tipo = 'traspaso';
          let [a, b] = mAparts;
          if (despuesDe(b.pos, ['de', 'desde'])) [a, b] = [b, a];
          res.apartadoId = a.ent.id; res.apartadoDestinoId = b.ent.id;
          if (mCuentas.length) res.cuentaId = mCuentas[0].ent.id;
        } else if (mCuentas.length >= 2) {
          let [a, b] = mCuentas;
          if (despuesDe(b.pos, ['de', 'desde'])) [a, b] = [b, a];
          res.cuentaId = a.ent.id; res.cuentaDestinoId = b.ent.id;
          if (mAparts.length) { res.tipo = 'deposito'; res.apartadoId = mAparts[0].ent.id; res.origen = a.ent.id; res.cuentaId = b.ent.id; res.cuentaDestinoId = null; }
        } else if (mCuentas.length === 1) {
          const c = mCuentas[0];
          if (despuesDe(c.pos, ['de', 'desde'])) { res.cuentaId = c.ent.id; res.faltantes.push('cuenta destino'); }
          else { res.cuentaDestinoId = c.ent.id; res.cuentaId = principal !== c.ent.id ? principal : null; if (res.cuentaId) res.supuestos.push('cuenta origen'); else res.faltantes.push('cuenta origen'); }
          if (mAparts.length && res.cuentaDestinoId) { res.tipo = 'deposito'; res.apartadoId = mAparts[0].ent.id; res.origen = res.cuentaId || 'externo'; res.cuentaId = res.cuentaDestinoId; res.cuentaDestinoId = null; }
        } else res.faltantes.push('cuentas');
        break;
      }
      case 'deposito': {
        const c = preferir(mCuentas.filter(m => !despuesDe(m.pos, ['de', 'desde'])), rindeTipos) || preferir(mCuentas, rindeTipos);
        if (c) res.cuentaId = c.id; else res.faltantes.push('cuenta');
        const origen = mCuentas.find(m => despuesDe(m.pos, ['de', 'desde']) && m.ent.id !== res.cuentaId);
        res.origen = origen ? origen.ent.id : (principal && principal !== res.cuentaId ? principal : 'externo');
        if (!origen) res.supuestos.push('origen del dinero');
        if (mAparts.length) res.apartadoId = mAparts[0].ent.id; else res.supuestos.push('sin apartado');
        break;
      }
      case 'retiro': {
        if (mAparts.length) res.apartadoId = mAparts[0].ent.id; else res.faltantes.push('apartado');
        const c = mCuentas.length ? mCuentas[0].ent : null;
        if (c) res.cuentaId = c.id;
        res.destino = 'liberar';
        break;
      }
      default: break;
    }

    if (res.tipo && res.tipo !== 'tasa' && !(res.monto > 0)) res.faltantes.push('monto');
    if (res.tipo === 'tasa' && res.tasa == null) res.faltantes.push('tasa');
    if (!res.tipo) res.faltantes.push('tipo de movimiento');

    // Nota: lo que sobra del texto, sin palabras vacías.
    const quitar = new Set(['de', 'del', 'a', 'al', 'en', 'con', 'para', 'por', 'la', 'el', 'los', 'las', 'mi', 'mis', 'me', 'y', 'un', 'una', 'que', 'pesos', 'peso', 'ahora', 'apartado', 'cuenta', 'desde', 'hacia']);
    let resto = t;
    for (const m of [...mCuentas, ...mAparts]) resto = resto.replace(new RegExp('(^|[^a-z0-9])' + escapar(m.alias) + '(?=$|[^a-z0-9])'), ' ');
    for (const k of Object.keys(VERBOS)) resto = resto.replace(VERBOS[k], ' ');
    const palabras = resto.split(/\s+/).filter(w => w && !quitar.has(w) && w.length > 1);
    res.nota = palabras.join(' ');
    if (res.tipo === 'gasto' || res.tipo === 'ingreso') {
      const cat = categorias.find(c => c.id === res.categoriaId);
      if (cat && normalizar(cat.nombre) === res.nota) res.nota = '';
    }
    res.completo = !!res.tipo && res.faltantes.length === 0;
    return res;
  }

  const Parser = { interpretar, normalizar, extraerMonto, extraerFecha, extraerTasa, SINONIMOS };
  if (typeof module !== 'undefined' && module.exports) module.exports = Parser;
  else raiz.Parser = Parser;
})(typeof window !== 'undefined' ? window : globalThis);
