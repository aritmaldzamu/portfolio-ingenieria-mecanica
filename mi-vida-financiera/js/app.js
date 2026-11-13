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
      if (this._cambiandoPerfil) return; // ya se cambió de persona: no escribir en el perfil nuevo
      const go = () => {
        const ok = E.guardar(this.estado);
        if (!ok && !this._avisoError) { this._avisoError = true; UI.toast('No se pudo guardar en este navegador (¿modo privado o espacio lleno?). Exporta un respaldo.', { error: true, duracion: 6000 }); }
        if (ok) this._avisoError = false;
      };
      if (inmediato) go(); else this._tGuardar = setTimeout(go, 250);
      if (window.Sync) window.Sync.programar();
    },
    /** Reemplaza el estado con el que llegó de otro dispositivo (sin volver a programar sincronización). */
    reemplazarEstado(nuevo) {
      this.estado = E.normalizar(nuevo);
      F.setMoneda(this.estado.config.moneda);
      this.recalcular();
      E.guardar(this.estado);
      this.render(false);
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
      const sync = window.Sync && window.Sync.resumen();
      if (sync) {
        UI.$('#aviso-respaldo').innerHTML = `<button class="aviso-respaldo ${sync.clase}" data-accion="ir" data-ruta="config" title="Sincronización con GitHub">${UI.icono(sync.icono, sync.girar ? 'girando' : '')}<span class="txt">${sync.texto}</span></button>`;
        UI.$('#sidebar-pie').innerHTML = `<div class="respaldo-mini">
            <div class="fila-flex" style="gap:8px">${UI.icono('refresh', 'ico-sm')}<b>Sincronización activa</b></div>
            <span>Tus cambios se guardan en tu repositorio privado de GitHub y aparecen en tus otros dispositivos. ${UI.esc(sync.texto)}.</span>
            <button class="btn btn-sm" data-accion="sincronizar-ahora">${UI.icono('refresh')}Sincronizar ahora</button>
          </div>`;
      } else {
        UI.$('#aviso-respaldo').innerHTML = hayDatos ? `<button class="aviso-respaldo ${atrasado ? 'atrasado' : ''}" data-accion="exportar-json" title="Exportar respaldo JSON">${UI.icono(atrasado ? 'alert' : 'download')}<span class="txt">${txt}</span></button>` : '';
        UI.$('#sidebar-pie').innerHTML = `<div class="respaldo-mini">
            <div class="fila-flex" style="gap:8px">${UI.icono('lock', 'ico-sm')}<b>Tus datos no salen de aquí</b></div>
            <span>Se guardan solo en este navegador. ${d == null ? 'Aún no has respaldado.' : `Último respaldo: ${d === 0 ? 'hoy' : 'hace ' + d + ' días'}.`}</span>
            <button class="btn btn-sm" data-accion="exportar-json">${UI.icono('download')}Exportar respaldo</button>
            <a class="btn btn-sm btn-fantasma" href="#/config">${UI.icono('refresh')}Sincronizar dispositivos</a>
          </div>`;
      }
      this.pintarPerfil();
      const priv = this.estado.config.ocultarMontos;
      document.body.classList.toggle('privado', !!priv);
      UI.$('#btn-privado').innerHTML = UI.icono(priv ? 'eyeOff' : 'eye');
      const claro = this.estado.config.tema === 'claro';
      document.documentElement.setAttribute('data-theme', claro ? 'light' : 'dark');
      UI.$('#btn-tema').innerHTML = UI.icono(claro ? 'moon' : 'sun');
      const meta = document.querySelector('meta[name=theme-color]'); if (meta) meta.content = claro ? '#f4f5f9' : '#0a0b10';
    },

    /* ---------- Perfiles: varias personas en el mismo dispositivo ---------- */
    colorPerfil(id) { let h = 0; for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return UI.COLORES[h % UI.COLORES.length]; },
    inicial(nombre) { return (String(nombre || '').trim()[0] || '?').toUpperCase(); },
    pintarPerfil() {
      const pf = E.perfiles();
      const yo = pf.lista.find(p => p.id === pf.activo);
      // Mantener el nombre del perfil igual al nombre de Configuración
      if (yo && (this.estado.config.nombre || '') !== (yo.nombre || '') && this.estado.config.nombre) { yo.nombre = this.estado.config.nombre; E.guardarPerfiles(pf); }
      const b = UI.$('#btn-perfil');
      if (!b) return;
      const nombre = (yo && yo.nombre) || this.estado.config.nombre || '';
      b.textContent = nombre ? this.inicial(nombre) : '';
      if (!nombre) b.innerHTML = UI.icono('users', 'ico-sm');
      b.style.setProperty('--c', this.colorPerfil(pf.activo));
      b.title = `${nombre || 'Sin nombre'} · cambiar de persona`;
    },
    cambiarPerfil(id) {
      const pf = E.perfiles();
      if (pf.activo === id) return;
      this.guardar(true);
      this._cambiandoPerfil = true;
      if (window.Sync) clearTimeout(window.Sync._t);
      pf.activo = id; E.guardarPerfiles(pf);
      location.hash = '#/dashboard';
      location.reload();
    },
    menuPerfiles() {
      const pf = E.perfiles();
      const md = UI.modal({
        titulo: '¿Quién usa la app?', icono: 'users', ancho: 'angosto',
        subtitulo: 'Cada persona tiene sus propios datos en este dispositivo.',
        cuerpo: `<div class="lista">${pf.lista.map(p => `<div class="fila ${p.id === pf.activo ? '' : 'clic'}" data-perfil="${p.id}">
            <span class="avatar-btn" style="--c:${this.colorPerfil(p.id)}">${UI.esc(this.inicial(p.nombre || (p.id === pf.activo ? this.estado.config.nombre : '')))}</span>
            <div class="fila-txt"><div class="fila-titulo">${UI.esc(p.nombre || (p.id === pf.activo && this.estado.config.nombre) || 'Sin nombre')}</div><div class="fila-sub">${p.id === pf.activo ? 'Usando ahora' : 'Toca para cambiar'}</div></div>
            ${p.id === pf.activo ? '<span class="chip verde">Activo</span>' : `<button class="btn-icono sm" data-borrar-perfil="${p.id}" aria-label="Eliminar perfil">${UI.icono('trash')}</button>`}
          </div>`).join('')}</div>
          <button class="btn mt" data-nuevo-perfil style="width:100%">${UI.icono('plus')}Agregar otra persona</button>
          <p class="nota mt">Los perfiles no tienen contraseña: cualquiera con este dispositivo puede cambiar de persona. Para total privacidad, que cada quien use la app en su propio celular (mismo link).</p>`,
        alMontar: (el, api) => {
          el.querySelectorAll('[data-perfil]').forEach(f => f.addEventListener('click', e => { if (e.target.closest('[data-borrar-perfil]')) return; if (f.dataset.perfil !== pf.activo) { api.cerrar(); this.cambiarPerfil(f.dataset.perfil); } }));
          el.querySelector('[data-nuevo-perfil]').addEventListener('click', () => { api.cerrar(); this.nuevoPerfil(); });
          el.querySelectorAll('[data-borrar-perfil]').forEach(b => b.addEventListener('click', async () => {
            const p = pf.lista.find(x => x.id === b.dataset.borrarPerfil);
            const ok = await UI.confirmar({ titulo: `Eliminar a ${p.nombre || 'este perfil'}`, peligro: true, mensaje: 'Se borrarán sus datos de este dispositivo (si tenía sincronización, sus datos siguen en su GitHub).', textoOk: 'Eliminar perfil' });
            if (!ok) return;
            const sf = E.sufijoPerfil(p.id);
            try { ['mvf:estado:v1', 'mvf:sync:v1', 'mvf:sync:base:v1'].forEach(k => localStorage.removeItem(k + sf)); } catch (e) { /* nada */ }
            const nuevo = E.perfiles(); nuevo.lista = nuevo.lista.filter(x => x.id !== p.id); E.guardarPerfiles(nuevo);
            api.cerrar(); this.menuPerfiles(); UI.toast('Perfil eliminado');
          }));
        },
      });
      void md;
    },
    nuevoPerfil() {
      UI.formulario({
        titulo: 'Agregar persona', icono: 'users', subtitulo: 'Tendrá sus propios datos, separados de los tuyos.',
        campos: [{ n: 'nombre', l: '¿Cómo se llama?', req: true, ph: 'Ej. Ana' }], textoGuardar: 'Crear y cambiar',
        onGuardar: (x) => {
          const pf = E.perfiles();
          // Asegura que el perfil actual quede con su nombre en la lista
          const yo = pf.lista.find(p => p.id === pf.activo); if (yo && !yo.nombre) yo.nombre = this.estado.config.nombre || 'Yo';
          const id = 'p' + Date.now().toString(36);
          pf.lista.push({ id, nombre: x.nombre.trim() });
          E.guardarPerfiles(pf);
          const est = E.estadoVacio(); est.config.nombre = x.nombre.trim(); est.config.tema = this.estado.config.tema;
          try { localStorage.setItem(E.claveEstado(id), JSON.stringify(est)); } catch (e) { return 'No se pudo crear el perfil (almacenamiento lleno o bloqueado).'; }
          this.cambiarPerfil(id);
        },
      });
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
          const ok = await UI.confirmar({ titulo: 'Importar respaldo', mensaje: `Se reemplazarán tus datos actuales por los del archivo <b>${UI.esc(f.name)}</b> (${est.cuentas.length} cuentas, ${(est.movimientos || []).length} movimientos).${window.Sync && window.Sync.activo ? ' <b>También se reemplazarán en tus otros dispositivos</b> (GitHub guarda la versión anterior en su historial).' : ''}`, textoOk: 'Importar y reemplazar' });
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
      const ok = await UI.confirmar({ titulo: 'Borrar todos los datos', peligro: true, escribir: 'BORRAR', mensaje: 'Se eliminarán todas tus cuentas, apartados, movimientos y configuración de este navegador. <b>No se puede deshacer</b>; exporta un respaldo antes si lo necesitas.' + (window.Sync && window.Sync.activo ? ' <b>Como tienes la sincronización activa, también se borrarán en tus otros dispositivos</b> (el historial del repositorio de GitHub conserva la versión anterior).' : ''), textoOk: 'Borrar todo' });
      if (!ok) return;
      const tema = this.estado.config.tema;
      this.estado = E.estadoVacio(); this.estado.config.tema = tema;
      this.recalcular(); this.guardar(true); this.navegar('dashboard'); this.render(true);
      UI.toast('Se borraron todos los datos.');
    },
    async cargarDemo() {
      if (this.estado.cuentas.length || this.estado.movimientos.length) {
        const ok = await UI.confirmar({ titulo: 'Cargar datos de ejemplo', mensaje: 'Esto <b>reemplaza</b> tus datos actuales por datos de ejemplo. Si quieres conservarlos, exporta un respaldo primero.' + (window.Sync && window.Sync.activo ? ' <b>Ojo: con la sincronización activa también se reemplazarán en tus otros dispositivos.</b>' : ''), textoOk: 'Reemplazar con ejemplo' });
        if (!ok) return;
      }
      const tema = this.estado.config.tema, nombre = this.estado.config.nombre;
      this.estado = E.normalizar(Demo.generar(this.hoy));
      this.estado.config.tema = tema; this.estado.config.nombre = nombre;
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
        cuerpo: `<div class="tarjetas" style="grid-template-columns:repeat(2,minmax(0,1fr));gap:10px">${items.map(i => `<a class="card card-sm fila-flex" href="#/${i.r}" style="gap:10px;color:var(--text);flex-wrap:nowrap">${UI.burbuja(i.i, 'var(--accent)', 'sm')}<b style="font-weight:600;font-size:13px">${i.t}</b></a>`).join('')}</div>
          <div class="divisor"></div>
          <div class="fila-flex"><button class="btn" data-accion="perfiles">${UI.icono('users')}Cambiar de persona</button><button class="btn" data-accion="comando">${UI.icono('sparkles')}Registro rápido</button><button class="btn" data-accion="tema">${UI.icono('sun')}Tema</button><button class="btn" data-accion="exportar-json">${UI.icono('download')}Respaldo</button></div>`,
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
      UI.$('#btn-perfil').addEventListener('click', () => this.menuPerfiles());
      UI.$('#btn-privado').addEventListener('click', () => { this.estado.config.ocultarMontos = !this.estado.config.ocultarMontos; this.guardar(); this.pintarRespaldo(); });
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') this.guardar(true);
        else if (M.hoyISO() !== this.hoy) { M.generarRecurrentes(this.estado, M.hoyISO(), () => E.nuevoId('mov')); this.recalcular(); this.render(false); }
      });
      window.addEventListener('beforeunload', () => this.guardar(true));
      this.iniciarVivo();
      if (window.Sync) window.Sync.iniciar();
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
  App.accion('perfiles', () => { UI.cerrarModalSuperior(); App.menuPerfiles(); });
  App.accion('sincronizar-ahora', () => window.Sync && window.Sync.sincronizar());

  window.App = App;
  document.addEventListener('DOMContentLoaded', () => App.init());
})();
