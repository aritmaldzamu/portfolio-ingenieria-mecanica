/* =====================================================================
 * estado.js — Modelo de datos, valores por defecto y persistencia.
 * Todo se guarda en localStorage del navegador (nada sale del equipo).
 * ===================================================================== */
(function (raiz) {
  'use strict';
  const CLAVE = 'mvf:estado:v1';
  const VERSION = 1;

  let contador = 0;
  /** Identificador corto y único. */
  function nuevoId(prefijo) {
    contador++;
    return (prefijo || 'id') + '_' + Date.now().toString(36) + contador.toString(36) + Math.random().toString(36).slice(2, 6);
  }
  /** Marca de orden para eventos del mismo día. */
  function marca() { contador++; return Date.now() * 1000 + (contador % 1000); }

  /* ---------- Tabla del ISR anual (Anexo 8 RMF 2025; vigente desde 2023) ---------- */
  const TABLA_ISR_2025 = [
    { li: 0.01, cuota: 0, pct: 1.92 },
    { li: 8952.50, cuota: 171.88, pct: 6.40 },
    { li: 75984.56, cuota: 4461.94, pct: 10.88 },
    { li: 133536.08, cuota: 10723.55, pct: 16.00 },
    { li: 155229.81, cuota: 14194.54, pct: 17.92 },
    { li: 185852.58, cuota: 19682.13, pct: 21.36 },
    { li: 374837.89, cuota: 60049.40, pct: 23.52 },
    { li: 590796.00, cuota: 110842.74, pct: 30.00 },
    { li: 1127926.85, cuota: 271981.99, pct: 32.00 },
    { li: 1503902.47, cuota: 392294.17, pct: 34.00 },
    { li: 4511707.38, cuota: 1414947.85, pct: 35.00 },
  ];

  /* ---------- Categorías predefinidas ---------- */
  const CATEGORIAS = [
    ['comida', 'Comida', '#f97362', 'utensils', 'deseo'],
    ['super', 'Súper', '#f5a524', 'cart', 'necesidad'],
    ['transporte', 'Transporte', '#4aa8ff', 'bus', 'necesidad'],
    ['gasolina', 'Gasolina', '#e5734a', 'fuel', 'necesidad'],
    ['renta', 'Renta', '#a78bfa', 'home', 'necesidad'],
    ['servicios', 'Servicios', '#facc15', 'zap', 'necesidad'],
    ['celular', 'Celular/Internet', '#38bdf8', 'phone', 'necesidad'],
    ['suscripciones', 'Suscripciones', '#c084fc', 'tv', 'deseo'],
    ['salud', 'Salud', '#34d399', 'heart', 'necesidad'],
    ['ropa', 'Ropa', '#f472b6', 'shirt', 'deseo'],
    ['salidas', 'Salidas', '#fb7185', 'music', 'deseo'],
    ['educacion', 'Educación/Cursos', '#60a5fa', 'book', 'necesidad'],
    ['regalos', 'Regalos', '#f0abfc', 'gift', 'deseo'],
    ['viajes', 'Viajes', '#2dd4bf', 'plane', 'deseo'],
    ['negocio', 'Negocio', '#818cf8', 'store', 'ahorro'],
    ['otros', 'Otros', '#94a3b8', 'dots', 'deseo'],
  ].map(([id, nombre, color, icono, grupo]) => ({ id: 'cat_' + id, nombre, color, icono, grupo, tipo: 'gasto' }));

  const CATEGORIAS_INGRESO = [
    ['sueldo', 'Sueldo', '#2fd197', 'briefcase'],
    ['freelance', 'Freelance', '#22c55e', 'laptop'],
    ['beca', 'Beca de practicante', '#4ade80', 'graduation'],
    ['aguinaldo', 'Aguinaldo / prima', '#86efac', 'gift'],
    ['rendimientos', 'Rendimientos', '#10b981', 'trending'],
    ['otrosing', 'Otros ingresos', '#6ee7b7', 'coins'],
  ].map(([id, nombre, color, icono]) => ({ id: 'cat_' + id, nombre, color, icono, grupo: 'ingreso', tipo: 'ingreso' }));

  const INSTITUCIONES = ['Nu México', 'Revolut', 'Openbank', 'Mercado Pago', 'Cetesdirecto', 'GBM', 'BBVA', 'Banorte', 'Santander', 'Banamex', 'HSBC', 'Hey Banco', 'Klar', 'Stori', 'Afore', 'Efectivo', 'Otra'];

  /** Configuración económica por defecto (todas editables). */
  function configDefecto() {
    return {
      nombre: '', moneda: 'MXN', tema: 'oscuro', mesInicio: 1,
      inflacion: 3.8, inflacionFecha: '2026-11-01',
      umaDiaria: 113.14, umaFecha: '2025-02-01',
      retencionISR: 0.90, retencionFecha: '2026-01-01',
      tasaReferencia: 7.00, tasaReferenciaFecha: '2026-11-01',
      tablaISR: TABLA_ISR_2025.map(f => ({ ...f })), tablaISRFecha: '2025-01-01',
      subsidioPct: 13.8, subsidioTope: 10171, imssPct: 2.375, imssExcedentePct: 0.40, factorIntegracion: 1.0493,
      fondoMeses: 6,
      escenarios: { conservador: 5, base: 8, optimista: 11 },
      cuentaPrincipalId: null,
      ultimoRespaldo: null,
      ocultarMontos: false,
      edad: 23,
    };
  }

  /** Estado vacío inicial. */
  function estadoVacio() {
    return {
      version: VERSION,
      config: configDefecto(),
      cuentas: [], apartados: [], flujosApartado: [], movimientos: [], recurrentes: [],
      categorias: [...CATEGORIAS, ...CATEGORIAS_INGRESO].map(c => ({ ...c })),
      instituciones: [...INSTITUCIONES],
      presupuesto: { plantilla: 'personalizado', ingreso: null, montos: {} },
      papas: {}, // categoriaId -> % que cubren mis papás
      metas: [],
      opcionesComparador: [],
      ppr: { aportacionMensual: 1000, rendimiento: 9, edadRetiro: 65, ingresoAnual: null, tasaMarginal: null },
      afore: { saldo: 0, aportacionesVoluntarias: 0, rendimiento: 8, actualizado: null },
      ingresos: { fuentes: [] },
      demo: false,
    };
  }

  /** Completa un estado cargado con los campos que falten (migración suave). */
  function normalizar(e) {
    const base = estadoVacio();
    const out = { ...base, ...(e || {}) };
    out.config = { ...base.config, ...((e && e.config) || {}) };
    out.config.escenarios = { ...base.config.escenarios, ...((e && e.config && e.config.escenarios) || {}) };
    for (const k of ['cuentas', 'apartados', 'flujosApartado', 'movimientos', 'recurrentes', 'metas', 'opcionesComparador']) if (!Array.isArray(out[k])) out[k] = [];
    if (!Array.isArray(out.categorias) || !out.categorias.length) out.categorias = base.categorias;
    if (!Array.isArray(out.instituciones)) out.instituciones = base.instituciones;
    out.presupuesto = { ...base.presupuesto, ...(out.presupuesto || {}) };
    out.presupuesto.montos = out.presupuesto.montos || {};
    out.ppr = { ...base.ppr, ...(out.ppr || {}) };
    out.afore = { ...base.afore, ...(out.afore || {}) };
    out.ingresos = { fuentes: [], ...(out.ingresos || {}) };
    out.papas = out.papas || {};
    for (const c of out.cuentas) { c.historialSaldos = c.historialSaldos || []; c.historialTasas = c.historialTasas || []; }
    out.version = VERSION;
    return out;
  }

  /* ---------- Perfiles (varias personas en el mismo dispositivo) ---------- */
  const CLAVE_PERFILES = 'mvf:perfiles:v1';
  function perfiles() {
    let p = null;
    try { p = JSON.parse(localStorage.getItem(CLAVE_PERFILES) || 'null'); } catch (e) { p = null; }
    if (!p || !Array.isArray(p.lista) || !p.lista.length) p = { activo: 'principal', lista: [{ id: 'principal', nombre: '' }] };
    if (!p.lista.some(x => x.id === p.activo)) p.activo = p.lista[0].id;
    return p;
  }
  function guardarPerfiles(p) { try { localStorage.setItem(CLAVE_PERFILES, JSON.stringify(p)); return true; } catch (e) { return false; } }
  /** Sufijo de las claves de localStorage del perfil activo ('' para el principal). */
  function sufijoPerfil(id) { id = id || perfiles().activo; return id === 'principal' ? '' : ':' + id; }
  function claveEstado(id) { return CLAVE + sufijoPerfil(id); }

  /* ---------- Persistencia ---------- */
  let ultimoError = null;
  function cargar() {
    try {
      const txt = localStorage.getItem(claveEstado());
      if (!txt) return null;
      return normalizar(JSON.parse(txt));
    } catch (err) { ultimoError = err; return null; }
  }
  function guardar(estado) {
    try { localStorage.setItem(claveEstado(), JSON.stringify(estado)); ultimoError = null; return true; }
    catch (err) { ultimoError = err; return false; }
  }
  function borrar(id) { try { localStorage.removeItem(claveEstado(id)); } catch (err) { ultimoError = err; } }

  const Estado = {
    CLAVE, CLAVE_PERFILES, perfiles, guardarPerfiles, sufijoPerfil, claveEstado, VERSION, TABLA_ISR_2025, CATEGORIAS, CATEGORIAS_INGRESO, INSTITUCIONES,
    nuevoId, marca, configDefecto, estadoVacio, normalizar, cargar, guardar, borrar,
    get ultimoError() { return ultimoError; },
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = Estado;
  else raiz.Estado = Estado;
})(typeof window !== 'undefined' ? window : globalThis);
