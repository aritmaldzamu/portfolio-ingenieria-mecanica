/* =====================================================================
 * sincronizacion.js — Sincroniza los datos entre dispositivos usando un
 * repositorio PRIVADO de GitHub (archivo JSON) y un token personal.
 *
 * - El token y la configuración se guardan solo en este navegador y
 *   NUNCA se incluyen en los respaldos JSON.
 * - Fusión de tres vías (base = última versión sincronizada): si cambiaste
 *   algo en el celular y otra cosa en la compu, se conservan ambas.
 *   Si los dos cambiaron lo mismo, gana el dispositivo que sincroniza.
 * - Cada sincronización es un commit: el repo guarda el historial.
 * ===================================================================== */
(function (raiz) {
  'use strict';

  /* ======================= Fusión (pura) ======================= */

  /** JSON con llaves ordenadas para comparar objetos sin importar el orden. */
  function estable(v) {
    if (v === undefined) return 'undefined';
    if (v === null || typeof v !== 'object') return JSON.stringify(v);
    if (Array.isArray(v)) return '[' + v.map(estable).join(',') + ']';
    return '{' + Object.keys(v).filter(k => v[k] !== undefined).sort().map(k => JSON.stringify(k) + ':' + estable(v[k])).join(',') + '}';
  }
  const igual = (a, b) => estable(a) === estable(b);

  /** Valor de tres vías: si local no cambió gana remoto; si remoto no cambió gana local; si ambos, local. */
  function fusionarValor(b, l, r) {
    if (igual(l, b)) return r;
    if (igual(r, b)) return l;
    return l;
  }

  /** Fusiona listas de objetos con `id` (altas, cambios y bajas de cada lado). */
  function fusionarLista(B, L, R) {
    B = B || []; L = L || []; R = R || [];
    const mapa = xs => new Map(xs.filter(o => o && o.id != null).map(o => [o.id, o]));
    const mb = mapa(B), ml = mapa(L), mr = mapa(R);
    const ids = [];
    const vistos = new Set();
    for (const o of [...R, ...L]) if (o && o.id != null && !vistos.has(o.id)) { vistos.add(o.id); ids.push(o.id); }
    const out = [];
    for (const id of ids) {
      const b = mb.get(id), l = ml.get(id), r = mr.get(id);
      let v;
      if (igual(l, b)) v = r;            // sin cambios aquí → lo de GitHub (o su borrado)
      else if (igual(r, b)) v = l;       // sin cambios allá → lo de aquí (o su borrado)
      else v = l !== undefined ? l : r;  // ambos cambiaron: gana este dispositivo; si aquí se borró y allá se editó, se conserva
      if (v !== undefined) out.push(v);
    }
    return out;
  }

  /** Fusiona un objeto llave por llave. */
  function fusionarObjeto(B, L, R) {
    B = B || {}; L = L || {}; R = R || {};
    const out = {};
    for (const k of new Set([...Object.keys(R), ...Object.keys(L)])) {
      const v = fusionarValor(B[k], L[k], R[k]);
      if (v !== undefined) out[k] = v;
    }
    return out;
  }

  const LISTAS = ['cuentas', 'apartados', 'flujosApartado', 'movimientos', 'recurrentes', 'categorias', 'metas', 'opcionesComparador'];
  const LOCALES = ['tema', 'ocultarMontos']; // preferencias de cada dispositivo

  /** Fusión completa del estado: base (última sincronizada), local y remoto. */
  function fusionar(base, local, remoto) {
    const B = base || {}, L = local || {}, R = remoto || {};
    const out = { ...R, ...fusionarObjeto(B, L, R) };
    for (const k of LISTAS) out[k] = fusionarLista(B[k], L[k], R[k]);
    out.config = fusionarObjeto(B.config, L.config, R.config);
    for (const k of LOCALES) if (L.config && k in L.config) out.config[k] = L.config[k];
    out.presupuesto = fusionarObjeto(B.presupuesto, L.presupuesto, R.presupuesto);
    out.presupuesto.montos = fusionarObjeto((B.presupuesto || {}).montos, (L.presupuesto || {}).montos, (R.presupuesto || {}).montos);
    for (const k of ['papas', 'ppr', 'afore']) out[k] = fusionarObjeto(B[k], L[k], R[k]);
    out.ingresos = { ...fusionarObjeto(B.ingresos, L.ingresos, R.ingresos), fuentes: fusionarLista((B.ingresos || {}).fuentes, (L.ingresos || {}).fuentes, (R.ingresos || {}).fuentes) };
    out.instituciones = fusionarValor(B.instituciones, L.instituciones, R.instituciones) || L.instituciones || R.instituciones;
    return out;
  }

  /** Copia sin las preferencias propias de cada dispositivo (para comparar sin "ping-pong"). */
  function sinLocales(e) {
    const c = { ...(e.config || {}) };
    for (const k of LOCALES) delete c[k];
    return { ...e, config: c };
  }

  const Fusion = { estable, igual, fusionar, fusionarLista, fusionarObjeto, sinLocales };
  if (typeof module !== 'undefined' && module.exports) { module.exports = Fusion; return; }

  /* ======================= Navegador: GitHub ======================= */
  const suf = () => (raiz.Estado ? raiz.Estado.sufijoPerfil() : '');
  const CLAVES = { get cfg() { return 'mvf:sync:v1' + suf(); }, get base() { return 'mvf:sync:base:v1' + suf(); } };
  const ARCHIVO = 'mi-vida-financiera.json';
  const API = 'https://api.github.com';
  const A = () => raiz.App;
  const UI = () => raiz.UI;

  const leerLS = k => { try { const t = localStorage.getItem(k); return t ? JSON.parse(t) : null; } catch (e) { return null; } };
  const escribirLS = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };

  /** Texto UTF-8 ⇄ base64 (la API de GitHub usa base64). */
  function aBase64(txt) {
    const bytes = new TextEncoder().encode(txt);
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  }
  function deBase64(b64) {
    const bin = atob(String(b64).replace(/\s/g, ''));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  class ErrorSync extends Error { constructor(msg, codigo) { super(msg); this.codigo = codigo; } }

  async function gh(cfg, ruta, op) {
    op = op || {};
    let res;
    try {
      res = await fetch(API + ruta, {
        method: op.metodo || 'GET', cache: 'no-store',
        headers: { Accept: op.accept || 'application/vnd.github+json', Authorization: 'Bearer ' + cfg.token, 'X-GitHub-Api-Version': '2022-11-28', ...(op.cuerpo ? { 'Content-Type': 'application/json' } : {}) },
        body: op.cuerpo ? JSON.stringify(op.cuerpo) : undefined,
      });
    } catch (e) { throw new ErrorSync('Sin conexión a internet.', 'offline'); }
    if (res.status === 401) throw new ErrorSync('El token no es válido o ya expiró.', 'token');
    if (res.status === 403) throw new ErrorSync('El token no tiene permiso de escritura en ese repositorio (Contents: Read and write).', 'permiso');
    if (res.status === 404 && !op.permite404) throw new ErrorSync('No encontré el repositorio. Revisa el usuario, el nombre y que el token tenga acceso a él.', 'no_existe');
    if ((res.status === 409 || res.status === 422) && op.conflicto) throw new ErrorSync('Conflicto de versión.', 'conflicto');
    if (!res.ok && !(res.status === 404 && op.permite404)) throw new ErrorSync(`GitHub respondió ${res.status}.`, 'http');
    return res;
  }

  const Sync = {
    estado: 'apagado', // apagado | sincronizando | ok | error | offline
    error: null, ultima: null, _enCurso: false, _pendiente: false, _t: null,

    config() { return leerLS(CLAVES.cfg); },
    get activo() { const c = this.config(); return !!(c && c.token && c.owner && c.repo); },
    dispositivo() { return /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? 'celular' : 'computadora'; },

    /** Verifica el repositorio (debe existir y ser PRIVADO). */
    async verificar(cfg) {
      const r = await (await gh(cfg, `/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}`)).json();
      if (!r.private) throw new ErrorSync('Ese repositorio es PÚBLICO: cualquiera podría ver tus finanzas. Hazlo privado (Settings → General → Change visibility) o usa otro.', 'publico');
      return { rama: r.default_branch || 'main', url: r.html_url };
    },

    /** Lee el archivo de datos del repo. Devuelve {datos, sha} o null si aún no existe. */
    async leer(cfg) {
      const ruta = `/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/contents/${ARCHIVO}?ref=${encodeURIComponent(cfg.rama || 'main')}`;
      const res = await gh(cfg, ruta, { permite404: true });
      if (res.status === 404) return null;
      const j = await res.json();
      let txt;
      if (j.content) txt = deBase64(j.content);
      else txt = await (await gh(cfg, ruta, { accept: 'application/vnd.github.raw+json' })).text(); // archivos de más de 1 MB
      let datos;
      try { datos = JSON.parse(txt); } catch (e) { throw new ErrorSync('El archivo del repositorio no es un JSON válido.', 'json'); }
      return { datos: datos && datos.estado ? datos.estado : datos, sha: j.sha };
    },

    /** Escribe el archivo (commit). Devuelve el nuevo sha. */
    async escribir(cfg, estado, sha) {
      const contenido = JSON.stringify({ app: 'mi-vida-financiera', version: estado.version, actualizado: new Date().toISOString(), estado }, null, 1);
      const res = await gh(cfg, `/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/contents/${ARCHIVO}`, {
        metodo: 'PUT', conflicto: true,
        cuerpo: { message: `Sincronizar datos (${this.dispositivo()})`, content: aBase64(contenido), branch: cfg.rama || 'main', ...(sha ? { sha } : {}) },
      });
      const j = await res.json();
      return j.content && j.content.sha;
    },

    /** Programa una sincronización (se agrupan cambios seguidos). */
    programar(ms) {
      if (!this.activo) return;
      clearTimeout(this._t);
      this._t = setTimeout(() => this.sincronizar(), ms == null ? 2000 : ms);
    },

    /**
     * Sincroniza: trae lo de GitHub, lo fusiona con lo de aquí y sube el
     * resultado si cambió. modo: 'normal' | 'remoto' (usar GitHub) | 'local' (subir lo de aquí).
     */
    async sincronizar(modo) {
      if (!this.activo || (A() && A()._cambiandoPerfil)) return;
      if (this._enCurso) { this._pendiente = true; return; }
      this._enCurso = true; this._pendiente = false;
      this.estado = 'sincronizando'; this.error = null; this.pintar();
      const app = A(), E = raiz.Estado;
      const cfg = this.config();
      try {
        for (let intento = 0; intento < 3; intento++) {
          const remoto = await this.leer(cfg);
          // --- sección síncrona: fusionar con el estado actual ---
          const local = JSON.parse(JSON.stringify(app.estado));
          const base = leerLS(CLAVES.base);
          let res;
          if (!remoto || modo === 'local') res = local;
          else if (modo === 'remoto') res = E.normalizar(remoto.datos);
          else res = E.normalizar(fusionar(base, local, E.normalizar(remoto.datos)));
          if (modo === 'remoto') { res.config.tema = local.config.tema; res.config.ocultarMontos = local.config.ocultarMontos; }
          const subir = !remoto || !igual(sinLocales(res), sinLocales(E.normalizar(remoto.datos)));
          if (subir) res.config.ultimoRespaldo = new Date().toISOString();
          if (!igual(res, app.estado)) app.reemplazarEstado(JSON.parse(JSON.stringify(res)));
          // --- subir ---
          if (subir) {
            try { await this.escribir(cfg, res, remoto && remoto.sha); }
            catch (e) { if (e.codigo === 'conflicto') { modo = 'normal'; continue; } throw e; }
          }
          escribirLS(CLAVES.base, res);
          this.estado = 'ok'; this.ultima = new Date();
          cfg.ultima = this.ultima.toISOString(); escribirLS(CLAVES.cfg, cfg);
          break;
        }
      } catch (e) {
        this.estado = e.codigo === 'offline' ? 'offline' : 'error';
        this.error = e.message || String(e);
      } finally {
        this._enCurso = false;
        this.pintar();
        if (this._pendiente) this.programar(500);
      }
    },

    /** Conecta este dispositivo. Pregunta qué hacer si ya hay datos en ambos lados. */
    /** Detecta el usuario y el repositorio privado a partir del token. */
    async detectar(token, owner, repo) {
      const cfg = { token };
      if (!owner) owner = (await (await gh(cfg, '/user')).json()).login;
      if (!repo) {
        const lista = await (await gh(cfg, '/user/repos?per_page=100&sort=updated&affiliation=owner')).json();
        const privados = (Array.isArray(lista) ? lista : []).filter(r => r.private && (!owner || (r.owner && r.owner.login.toLowerCase() === owner.toLowerCase())));
        const r = privados.find(x => x.name.toLowerCase() === 'mis-finanzas-datos') || (privados.length === 1 ? privados[0] : null);
        if (!r) throw new ErrorSync(privados.length ? 'Tu token tiene acceso a varios repositorios privados. Escribe cuál usar en "Usuario y repositorio".' : 'No encontré tu repositorio privado. Crea "mis-finanzas-datos" (paso 1) y, al crear el token, dale acceso a ese repositorio.', 'no_existe');
        repo = r.name;
      }
      return { owner, repo };
    },

    async conectar(datos) {
      const token = datos.token.trim();
      const det = await this.detectar(token, (datos.owner || '').trim(), (datos.repo || '').trim());
      const cfg = { owner: det.owner, repo: det.repo, token };
      const info = await this.verificar(cfg);
      cfg.rama = info.rama; cfg.url = info.url;
      const remoto = await this.leer(cfg);
      const app = A();
      const hayLocal = app.estado.cuentas.length || app.estado.movimientos.length;
      let modo = 'local';
      if (remoto && remoto.datos && (remoto.datos.cuentas || []).length) modo = hayLocal ? await this.preguntarModo(remoto.datos) : 'remoto';
      if (!modo) return false;
      escribirLS(CLAVES.cfg, cfg);
      escribirLS(CLAVES.base, null);
      await this.sincronizar(modo);
      return true;
    },

    preguntarModo(remotoDatos) {
      return new Promise(res => {
        let listo = false;
        const fin = v => { if (!listo) { listo = true; res(v); } };
        const n = (remotoDatos.movimientos || []).length + (remotoDatos.flujosApartado || []).length;
        const app = A();
        UI().modal({
          titulo: 'Ya hay datos en GitHub', icono: 'refresh', ancho: 'angosto',
          cuerpo: `<p class="suave">En el repositorio hay ${(remotoDatos.cuentas || []).length} cuentas y ${n} movimientos. En este dispositivo hay ${app.estado.cuentas.length} cuentas y ${app.estado.movimientos.length + app.estado.flujosApartado.length} movimientos. ¿Qué hago?</p>
            <div class="pila mt" style="gap:8px">
              <button class="btn btn-primario" data-m="remoto">Usar los datos de GitHub (recomendado)</button>
              <button class="btn" data-m="normal">Combinar ambos</button>
              <button class="btn btn-peligro" data-m="local">Reemplazar GitHub con los de este dispositivo</button>
            </div>
            <p class="nota mt">"Usar los de GitHub" es lo correcto si ya registraste todo en tu otro dispositivo. Lo que había aquí se reemplaza.</p>`,
          alCerrar: () => fin(null),
          alMontar(el, api) { el.querySelectorAll('[data-m]').forEach(b => b.addEventListener('click', () => { fin(b.dataset.m); api.cerrar(); })); },
        });
      });
    },

    desconectar() { escribirLS(CLAVES.cfg, null); escribirLS(CLAVES.base, null); this.estado = 'apagado'; this.error = null; this.pintar(); },

    /** Texto corto del estado para la barra superior. */
    resumen() {
      if (!this.activo) return null;
      const cfg = this.config();
      const ult = this.ultima || (cfg.ultima ? new Date(cfg.ultima) : null);
      const hace = ult ? Math.round((Date.now() - ult.getTime()) / 60000) : null;
      const cuando = hace == null ? '' : hace < 1 ? 'hace un momento' : hace < 60 ? `hace ${hace} min` : hace < 1440 ? `hace ${Math.round(hace / 60)} h` : `hace ${Math.round(hace / 1440)} días`;
      switch (this.estado) {
        case 'sincronizando': return { clase: '', icono: 'refresh', texto: 'Sincronizando…', girar: true };
        case 'offline': return { clase: 'atrasado', icono: 'alert', texto: 'Sin conexión: se sincroniza al volver' };
        case 'error': return { clase: 'atrasado', icono: 'alert', texto: 'Error al sincronizar' };
        default: return { clase: '', icono: 'check', texto: ult ? `Sincronizado ${cuando}` : 'Sincronización activa' };
      }
    },

    pintar() {
      const app = A();
      if (app && app.estado) app.pintarRespaldo();
      if (raiz.VistaConfig) raiz.VistaConfig.pintarSync();
    },

    iniciar() {
      if (this.activo) this.sincronizar();
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') this.programar(300); });
      window.addEventListener('online', () => this.programar(300));
      setInterval(() => { if (document.visibilityState === 'visible' && !this._enCurso) this.sincronizar(); }, 60000);
    },
  };

  raiz.Sync = Object.assign(Sync, Fusion);
})(typeof window !== 'undefined' ? window : globalThis);
