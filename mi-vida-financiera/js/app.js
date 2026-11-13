/* =====================================================================
 * app.js — Arranque, navegación por hash, guardado automático,
 * respaldo (JSON/CSV), acciones globales y contador en vivo.
 * ===================================================================== */
(function () {
  'use strict';
  const { Motor: M, Estado: E, Formato: F, UI, Graficas, Demo } = window;

  const NAV = [
    { grupo: 'General', items: [
      { r: 'dashboard', t: 'Inicio', i: 'home' },
      { r: 'apartados', t: 'Apartados', i: 'layers' },
      { r: 'cuentas', t: 'Cuentas', i: 'wallet' },
      { r: 'comparador', t: 'Comparador', i: 'percent' },
      { r: 'movimientos', t: 'Movimientos', i: 'swap' },
    ] },
    { grupo: 'Planeación', items: [
      { r: 'presupuesto', t: 'Presupuesto', i: 'pie' },
      { r: 'metas', t: 'Metas de ahorro', i: 'target' },
      { r: 'proyecciones', t: 'Proyecciones', i: 'chart' },
      { r: 'calendario', t: 'Calendario', i: 'calendar' },
    ] },
    { grupo: 'Patrimonio', items: [
      { r: 'deudas', t: 'Deudas y tarjetas', i: 'card' },
      { r: 'retiro', t: 'PPR y retiro', i: 'umbrella' },
      { r: 'ingresos', t: 'Ingresos', i: 'briefcase' },
      { r: 'config', t: 'Configuración', i: 'settings' },
    ] },
  ];
  const TABS = [{ r: 'dashboard', t: 'Inicio', i: 'home' }, { r: 'apartados', t: 'Apartados', i: 'layers' }, { fab: true }, { r: 'movimientos', t: 'Movimientos', i: 'swap' }, { mas: true, t: 'Más', i: 'grid' }];

  const App = {
    estado: null, calc: null, hoy: M.hoyISO(), ruta: 'dashboard', params: [],
    vistas: {}, acciones: {},
    registrar(nombre, vista) { this.vistas[nombre] = vista; },
    accion(nombre, fn) { this.acciones[nombre] = fn; },

    /* ---------- Búsquedas rápidas ---------- */
    cuenta(id) { return this.estado.cuentas.find(c => c.id === id); },
    apartado(id) { return this.estado.apartados.find(a => a.id === id); },
    categoria(id) { return this.estado.categorias.find(c => c.id === id); },
    nombreCuenta(id) { const c = this.cuenta(id); return c ? c.nombre : (id === 'externo' ? 'Fuera de mis cuentas' : '—'); },
    opCuentas(filtro, extras) {
      const lista = this.estado.cuentas.filter(c => !c.archivada && (!filtro || filtro(c))).map(c => ({ v: c.id, l: `${c.nombre}${c.ultimos4 ? ' ·' + c.ultimos4 : ''}` }));
      return [...(extras || []), ...lista];
    },
    opCategorias(tipo) { return this.estado.categorias.filter(c => !tipo || c.tipo === tipo).map(c => ({ v: c.id, l: c.nombre })); },
    opApartados(extras) { return [...(extras || []), ...this.estado.apartados.map(a => ({ v: a.id, l: a.nombre }))]; },

    /* ---------- Estado ---------- */
    recalcular() {
      this.hoy = M.hoyISO();
      this.calc = M.calcular(this.estado, this.hoy);
    },
    /**
     * Aplica un cambio al estado, recalcula, guarda y repinta.
     * Guarda una copia previa para poder deshacer.
     */
    mutar(fn, mensaje, op) {
      op = op || {};
      const antes = JSON.stringify(this.estado);
      fn(this.estado);
      this.recalcular(); this.guardar(); this.render(false);
      if (mensaje) UI.toast(mensaje, op.deshacer === false ? {} : { deshacer: () => { this.estado = E.normalizar(JSON.parse(antes)); this.recalcular(); this.guardar(); this.render(false); UI.toast('Cambio deshecho'); } });
    },
    _tGuardar: null, _avisoError: false,
    guardar(inmediato) {
      clearTimeout(this._tGuardar);
      const go = () => {
        const ok = E.guardar(this.estado);
        if (!ok && !this._avisoError) { this._avisoError = true; UI.toast('No se pudo guardar en este navegador (¿modo privado o espacio lleno?). Exporta un respaldo.', { error: true, duracion: 6000 }); }
        if (ok) this._avisoError = false;
      };
      if (inmediato) go(); else this._tGuardar = setTimeout(go, 250);
    },

    /* ---------- Navegación ---------- */
    navegar(r) { location.hash = '#/' + r; },
    leerHash() {
      const h = (location.hash || '#/dashboard').replace(/^#\/?/, '').split('/').map(decodeURIComponent);
      this.ruta = this.vistas[h[0]] ? h[0] : 'dashboard';
      this.params = h.slice(1);
    },
    render(animar) {
      const vista = this.vistas[this.ruta];
      const cont = UI.$('#vista');
      document.documentElement.setAttribute('data-theme', this.estado.config.tema === 'claro' ? 'light' : 'dark');
      Graficas.limpiar();
      const scroll = window.scrollY;
      const titulo = typeof vista.titulo === 'function' ? vista.titulo(this) : vista.titulo;
      UI.$('#titulo').textContent = titulo;
      UI.$('#subtitulo').textContent = (typeof vista.sub === 'function' ? vista.sub(this) : vista.sub) || '';
      document.title = `${titulo} · Mi Vida Financiera`;
      cont.innerHTML = vista.render(this) || '';
      cont.classList.remove('vista-anim');
      if (animar) { void cont.offsetWidth; cont.classList.add('vista-anim'); }
      UI.pintarIconos(cont);
      if (vista.despues) vista.despues(this, cont);
      UI.animarBarras(cont);
      if (animar) UI.animarNumeros(cont); else window.scrollTo(0, scroll);
      this.pintarNav();
      this.pintarRespaldo();
    },
    pintarNav() {
      const nAlertas = window.Consejos.alertas(this.estado, this.calc).filter(a => a.nivel === 'peligro').length;
      UI.$('#nav-lateral').innerHTML = NAV.map(g => `<div class="nav-grupo">${g.grupo}</div>` + g.items.map(it =>
        `<a class="nav-item ${this.ruta === it.r ? 'activo' : ''}" href="#/${it.r}" ${this.ruta === it.r ? 'aria-current="page"' : ''}>${UI.icono(it.i)}<span>${it.t}</span>${it.r === 'dashboard' && nAlertas ? `<span class="badge">${nAlertas}</span>` : ''}</a>`).join('')).join('');
      const enTabs = ['dashboard', 'apartados', 'movimientos'];
      UI.$('#tabbar').innerHTML = TABS.map(t => {
        if (t.fab) return `<button class="tab tab-fab" data-accion="nuevo-rapido" aria-label="Agregar movimiento"><span class="fab-circulo">${UI.icono('plus')}</span></button>`;
        if (t.mas) return `<button class="tab ${!enTabs.includes(this.ruta) ? 'activo' : ''}" data-accion="menu-mas">${UI.icono(t.i)}<span>${t.t}</span></button>`;
        return `<a class="tab ${this.ruta === t.r ? 'activo' : ''}" href="#/${t.r}">${UI.icono(t.i)}<span>${t.t}</span></a>`;
      }).join('');
    },
    diasDesdeRespaldo() {
      const u = this.estado.config.ultimoRespaldo;
      return u ? M.D(this.hoy) - M.D(u.slice(0, 10)) : null;
    },
    pintarRespaldo() {
      const d = this.diasDesdeRespaldo();
      const hayDatos = this.estado.cuentas.length || this.estado.movimientos.length;
      const atrasado = hayDatos && (d == null || d > 14);
      const txt = d == null ? 'Sin respaldo' : d === 0 ? 'Respaldo: hoy' : `Último respaldo hace ${d} ${d === 1 ? 'día' : 'días'}`;
      UI.$('#aviso-respaldo').innerHTML = hayDatos ? `<button class="aviso-respaldo ${atrasado ? 'atrasado' : ''}" data-accion="exportar-json" title="Exportar respaldo JSON">${UI.icono(atrasado ? 'alert' : 'download')}<span class="txt">${txt}</span></button>` : '';
      UI.$('#sidebar-pie').innerHTML = `<div class="respaldo-mini">
          <div class="fila-flex" style="gap:8px">${UI.icono('lock', 'ico-sm')}<b>Tus datos no salen de aquí</b></div>
          <span>Se guardan solo en este navegador. ${d == null ? 'Aún no has respaldado.' : `Último respaldo: ${d === 0 ? 'hoy' : 'hace ' + d + ' días'}.`}</span>
          <button class="btn btn-sm" data-accion="exportar-json">${UI.icono('download')}Exportar respaldo</button>
        </div>`;
      const priv = this.estado.config.ocultarMontos;
      document.body.classList.toggle('privado', !!priv);
      UI.$('#btn-privado').innerHTML = UI.icono(priv ? 'eyeOff' : 'eye');
      const claro = this.estado.config.tema === 'claro';
      document.documentElement.setAttribute('data-theme', claro ? 'light' : 'dark');
      UI.$('#btn-tema').innerHTML = UI.icono(claro ? 'moon' : 'sun');
      const meta = document.querySelector('meta[name=theme-color]'); if (meta) meta.content = claro ? '#f4f5f9' : '#0a0b10';
    },

    /* ---------- Respaldo ---------- */
    exportarJSON() {
      this.estado.config.ultimoRespaldo = new Date().toISOString();
      const datos = { app: 'mi-vida-financiera', version: E.VERSION, exportado: new Date().toISOString(), estado: this.estado };
      UI.descargar(`mi-vida-financiera-${this.hoy}.json`, JSON.stringify(datos, null, 2), 'application/json');
      this.guardar(true); this.pintarRespaldo();
      UI.toast('Respaldo descargado. Guárdalo en un lugar seguro.');
    },
    importarJSON() {
      const inp = document.createElement('input');
      inp.type = 'file'; inp.accept = 'application/json,.json';
      inp.onchange = () => {
        const f = inp.files && inp.files[0]; if (!f) return;
        const lector = new FileReader();
        lector.onload = async () => {
          let datos;
          try { datos = JSON.parse(lector.result); } catch (e) { UI.toast('El archivo no es un JSON válido.', { error: true }); return; }
          const est = datos && datos.estado ? datos.estado : datos;
          if (!est || !Array.isArray(est.cuentas) || !est.config) { UI.toast('Ese archivo no parece un respaldo de Mi Vida Financiera.', { error: true }); return; }
          const ok = await UI.confirmar({ titulo: 'Importar respaldo', mensaje: `Se reemplazarán tus datos actuales por los del archivo <b>${UI.esc(f.name)}</b> (${est.cuentas.length} cuentas, ${(est.movimientos || []).length} movimientos).`, textoOk: 'Importar y reemplazar' });
          if (!ok) return;
          this.estado = E.normalizar(est);
          this.recalcular(); this.guardar(true); this.render(true);
          UI.toast('Datos importados correctamente.');
        };
        lector.readAsText(f);
      };
      inp.click();
    },
    exportarCSV() {
      const q = v => { const s = String(v == null ? '' : v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
      const filas = [['fecha', 'tipo', 'monto', 'mi_parte', 'papas_pct', 'categoria', 'cuenta', 'cuenta_destino', 'apartado', 'tasa', 'nota']];
      for (const mv of [...this.estado.movimientos].sort((a, b) => a.fecha.localeCompare(b.fecha))) {
        filas.push([mv.fecha, mv.tipo, mv.monto, mv.tipo === 'gasto' ? M.parteMia(mv).toFixed(2) : mv.monto, mv.papas || 0, (this.categoria(mv.categoriaId) || {}).nombre || '', this.nombreCuenta(mv.cuentaId), mv.cuentaDestinoId ? this.nombreCuenta(mv.cuentaDestinoId) : '', '', '', mv.nota || '']);
      }
      for (const f of [...this.estado.flujosApartado].sort((a, b) => a.fecha.localeCompare(b.fecha))) {
        filas.push([f.fecha, f.tipo + ' apartado', f.monto, f.monto, 0, '', this.nombreCuenta(f.cuentaId), f.cuentaDestinoId ? this.nombreCuenta(f.cuentaDestinoId) : '', (this.apartado(f.apartadoId) || {}).nombre || '', f.tasa != null ? f.tasa : '', f.nota || '']);
      }
      UI.descargar(`movimientos-${this.hoy}.csv`, '﻿' + filas.map(r => r.map(q).join(',')).join('\n'), 'text/csv;charset=utf-8');
      UI.toast('CSV de movimientos descargado.');
    },
    async borrarTodo() {
      const ok = await UI.confirmar({ titulo: 'Borrar todos los datos', peligro: true, escribir: 'BORRAR', mensaje: 'Se eliminarán todas tus cuentas, apartados, movimientos y configuración de este navegador. <b>No se puede deshacer</b>; exporta un respaldo antes si lo necesitas.', textoOk: 'Borrar todo' });
      if (!ok) return;
      const tema = this.estado.config.tema;
      this.estado = E.estadoVacio(); this.estado.config.tema = tema;
      this.recalcular(); this.guardar(true); this.navegar('dashboard'); this.render(true);
      UI.toast('Se borraron todos los datos.');
    },
    async cargarDemo() {
      if (this.estado.cuentas.length || this.estado.movimientos.length) {
        const ok = await UI.confirmar({ titulo: 'Cargar datos de ejemplo', mensaje: 'Esto <b>reemplaza</b> tus datos actuales por datos de ejemplo. Si quieres conservarlos, exporta un respaldo primero.', textoOk: 'Reemplazar con ejemplo' });
        if (!ok) return;
      }
      const tema = this.estado.config.tema;
      this.estado = E.normalizar(Demo.generar(this.hoy));
      this.estado.config.tema = tema;
      this.recalcular(); this.guardar(true); this.navegar('dashboard'); this.render(true);
      UI.toast('Datos de ejemplo cargados. Las tasas son ejemplos: verifícalas en cada app.');
    },

    /* ---------- Contador en vivo ("dinero trabajando") ---------- */
    iniciarVivo() {
      const tick = () => {
        const ahora = new Date();
        const frac = (ahora.getHours() * 3600 + ahora.getMinutes() * 60 + ahora.getSeconds() + ahora.getMilliseconds() / 1000) / 86400;
        document.querySelectorAll('[data-vivo]').forEach(el => {
          const v = Number(el.dataset.vivo) * frac;
          el.textContent = F.dinero(v, { dec: Number(el.dataset.dec || 4) });
        });
      };
      tick(); setInterval(tick, 120);
    },

    /* ---------- Menú "Más" en celular ---------- */
    menuMas() {
      const items = NAV.flatMap(g => g.items).filter(i => !['dashboard', 'apartados', 'movimientos'].includes(i.r));
      const md = UI.modal({
        titulo: 'Más secciones', icono: 'grid',
        cuerpo: `<div class="tarjetas" style="grid-template-columns:repeat(2,minmax(0,1fr));gap:10px">${items.map(i => `<a class="card card-sm fila-flex" href="#/${i.r}" style="gap:10px;color:var(--text)">${UI.burbuja(i.i, 'var(--accent)', 'sm')}<b style="font-weight:600;font-size:13px">${i.t}</b></a>`).join('')}</div>
          <div class="divisor"></div>
          <div class="fila-flex"><button class="btn" data-accion="comando">${UI.icono('sparkles')}Registro rápido</button><button class="btn" data-accion="tema">${UI.icono('sun')}Tema</button><button class="btn" data-accion="exportar-json">${UI.icono('download')}Respaldo</button></div>`,
        alMontar(el, api) { el.querySelectorAll('a').forEach(a => a.addEventListener('click', () => api.cerrar())); },
      });
      void md;
    },

    /* ---------- Arranque ---------- */
    init() {
      const cargado = E.cargar();
      this.estado = cargado || E.estadoVacio();
      F.setMoneda(this.estado.config.moneda);
      const n = M.generarRecurrentes(this.estado, M.hoyISO(), () => E.nuevoId('mov'));
      this.recalcular();
      if (n) { this.guardar(true); setTimeout(() => UI.toast(`Se registraron ${n} movimiento${n === 1 ? '' : 's'} recurrente${n === 1 ? '' : 's'} pendiente${n === 1 ? '' : 's'}.`), 400); }
      UI.pintarIconos(document);
      this.leerHash();
      this.render(true);

      window.addEventListener('hashchange', () => { this.leerHash(); this.render(true); window.scrollTo(0, 0); });
      // Acciones delegadas: cualquier elemento con data-accion
      document.addEventListener('click', e => {
        const el = e.target.closest('[data-accion]');
        if (!el) return;
        const fn = this.acciones[el.dataset.accion];
        if (fn) { e.preventDefault(); fn(el.dataset, el, e); }
      });
      document.addEventListener('keydown', e => {
        const escribiendo = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement && document.activeElement.tagName);
        if (e.key === 'Escape' && UI.cerrarModalSuperior()) { e.preventDefault(); return; }
        if (e.key === '/' && !escribiendo && !UI.hayModal) { e.preventDefault(); window.Comando.abrir(); }
      });
      UI.$('#btn-comando').addEventListener('click', () => window.Comando.abrir());
      UI.$('#btn-tema').addEventListener('click', () => this.acciones.tema());
      UI.$('#btn-privado').addEventListener('click', () => { this.estado.config.ocultarMontos = !this.estado.config.ocultarMontos; this.guardar(); this.pintarRespaldo(); });
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') this.guardar(true);
        else if (M.hoyISO() !== this.hoy) { M.generarRecurrentes(this.estado, M.hoyISO(), () => E.nuevoId('mov')); this.recalcular(); this.render(false); }
      });
      window.addEventListener('beforeunload', () => this.guardar(true));
      this.iniciarVivo();
    },
  };

  /* ---------- Acciones globales ---------- */
  App.accion('tema', () => { App.estado.config.tema = App.estado.config.tema === 'claro' ? 'oscuro' : 'claro'; App.guardar(); App.pintarRespaldo(); App.render(false); });
  App.accion('exportar-json', () => App.exportarJSON());
  App.accion('importar-json', () => App.importarJSON());
  App.accion('exportar-csv', () => App.exportarCSV());
  App.accion('borrar-todo', () => App.borrarTodo());
  App.accion('cargar-demo', () => App.cargarDemo());
  App.accion('menu-mas', () => App.menuMas());
  App.accion('comando', () => { UI.cerrarModalSuperior(); window.Comando.abrir(); });
  App.accion('ir', d => App.navegar(d.ruta));
  App.accion('nuevo-rapido', () => window.Forms.movimiento({}));

  window.App = App;
  document.addEventListener('DOMContentLoaded', () => App.init());
})();
