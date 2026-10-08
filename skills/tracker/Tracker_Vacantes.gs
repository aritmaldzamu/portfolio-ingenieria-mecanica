/**
 * Tracker de vacantes de Arith — puente entre las skills de Gemini
 * `buscador-vacantes` y `seguimiento-postulaciones`.
 *
 * Instalación: en la hoja "Tracker_Vacantes_Arith" → Extensiones → Apps Script,
 * pega este archivo completo, guarda y recarga la hoja. Aparece el menú "Vacantes".
 *
 * Cada skill termina su respuesta con un BLOQUE_TRACKER (columnas separadas por " | ").
 * "Importar bloque de Gemini" lo lee por nombre de columna, así que el bloque puede
 * traer todas las columnas (buscador) o solo algunas (seguimiento). También acepta
 * tablas Markdown, por ejemplo el antiguo vacantes_encontradas.md de Claude.
 */

const HOJA = 'Vacantes';
const HOJA_LOG = 'Historial';
const DIAS_SIN_RESPUESTA = 21;
// Gemini lee Google Docs de Drive mucho mejor que hojas de cálculo: el script
// mantiene este Doc como copia de texto del tracker para las skills.
const DOC_GEMINI = 'Tracker_Vacantes_Arith_Gemini';
const COLUMNAS_DOC = ['ID', 'Empresa', 'Puesto', 'Ciudad', 'Estado', 'Fecha estado', 'Score', 'Próxima acción', 'Fecha límite', 'Link'];

const COLUMNAS = [
  'ID', 'Fecha encontrada', 'Empresa', 'Puesto', 'Ciudad', 'Modalidad', 'País', 'Fuente',
  'Link', 'Exp. pedida', 'Score', 'CV base', 'Título sugerido', 'Resalta', 'Estado',
  'Fecha estado', 'Próxima acción', 'Fecha límite', 'Notas',
];

const ESTADOS = [
  'Nueva', 'Por aplicar', 'Aplicado', 'En proceso', 'Oferta',
  'Rechazado', 'Sin respuesta', 'Descartada', 'Cerrada',
];

const COLORES_ESTADO = {
  'Nueva': '#f1f3f4', 'Por aplicar': '#fff4cc', 'Aplicado': '#e8eaed', 'En proceso': '#d2e3fc',
  'Oferta': '#ceead6', 'Rechazado': '#fad2cf', 'Sin respuesta': '#dadce0',
  'Descartada': '#f8f9fa', 'Cerrada': '#f8f9fa',
};

// Nombres alternativos de columna (normalizados) → columna del tracker.
const ALIAS_COLUMNAS = {
  'vacante': 'Puesto', 'puesto': 'Puesto', 'position': 'Puesto', 'job title': 'Puesto',
  'ubicacion': 'Ciudad', 'location': 'Ciudad', 'tipo': 'Modalidad', 'pais': 'País',
  'estatus': 'Estado', 'status': 'Estado', 'fecha': 'Fecha encontrada',
  'cv a usar': 'CV base', 'cv': 'CV base', 'experiencia': 'Exp. pedida',
  'ultima actividad': 'Fecha estado', 'nota': 'Notas', 'url': 'Link', 'enlace': 'Link',
  'company': 'Empresa',
};

// Lo que dice la skill (en minúsculas, sin acentos) → estado válido.
const ALIAS_ESTADOS = {
  'nueva': 'Nueva', 'nuevo': 'Nueva', 'por aplicar': 'Por aplicar', 'pendiente': 'Por aplicar',
  'aplicado': 'Aplicado', 'aplicada': 'Aplicado', 'applied': 'Aplicado',
  'en proceso': 'En proceso', 'entrevista': 'En proceso', 'prueba tecnica': 'En proceso',
  'oferta': 'Oferta', 'offer': 'Oferta',
  'rechazado': 'Rechazado', 'rechazada': 'Rechazado', 'rejected': 'Rechazado',
  'sin respuesta': 'Sin respuesta', 'descartada': 'Descartada', 'descartado': 'Descartada',
  'cerrada': 'Cerrada', 'cerrado': 'Cerrada', 'closed': 'Cerrada', 'expirada': 'Cerrada',
};

// Estados que solo pone el buscador: nunca pisan un estado que ya existe.
const ESTADOS_INICIALES = ['Nueva', 'Por aplicar'];

const PALABRAS_VACIAS = new Set([
  'de', 'del', 'la', 'el', 'en', 'y', 'e', 'a', 'the', 'of', 'and', 'for', 'jr', 'junior',
  'sr', 'i', 'ii', 'trainee', 'mexico', 'mx',
]);

// ---------------------------------------------------------------- Menú y UI

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Vacantes')
    .addItem('Importar bloque de Gemini…', 'abrirImportador')
    .addItem(`Marcar "Sin respuesta" (${DIAS_SIN_RESPUESTA}+ días)`, 'marcarSinRespuesta')
    .addSeparator()
    .addItem('Actualizar copia para Gemini (Doc)', 'actualizarDocGemini')
    .addItem('Configurar / reparar hoja', 'configurarHoja')
    .addItem('Activar revisión diaria automática', 'activarRevisionDiaria')
    .addToUi();
}

function abrirImportador() {
  const html = HtmlService.createHtmlOutput(`
    <style>
      body { font-family: Arial, sans-serif; margin: 12px; }
      textarea { width: 100%; height: 300px; font-family: monospace; font-size: 12px; }
      button { margin-top: 8px; padding: 8px 16px; }
      pre { white-space: pre-wrap; font-size: 12px; background: #f1f3f4; padding: 8px; }
    </style>
    <p>Pega aquí el <b>BLOQUE_TRACKER</b> que entregó Gemini (o una tabla Markdown):</p>
    <textarea id="t"></textarea><br>
    <button id="b" onclick="importar()">Importar</button>
    <pre id="r"></pre>
    <script>
      function importar() {
        const b = document.getElementById('b');
        b.disabled = true;
        document.getElementById('r').textContent = 'Importando…';
        google.script.run
          .withSuccessHandler(function (msg) { document.getElementById('r').textContent = msg; b.disabled = false; })
          .withFailureHandler(function (e) { document.getElementById('r').textContent = 'Error: ' + e.message; b.disabled = false; })
          .importarBloque(document.getElementById('t').value);
      }
    </script>
  `).setWidth(760).setHeight(520);
  SpreadsheetApp.getUi().showModalDialog(html, 'Importar bloque de Gemini');
}

// ---------------------------------------------------------- Acciones de hoja

function configurarHoja() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName(HOJA) || ss.insertSheet(HOJA);
  const actuales = hoja.getLastColumn() ? hoja.getRange(1, 1, 1, hoja.getLastColumn()).getValues()[0] : [];
  // Agrega al final las columnas que falten, sin mover las existentes.
  const faltantes = COLUMNAS.filter(c => actuales.indexOf(c) === -1);
  const encabezado = actuales.filter(String).concat(faltantes);
  hoja.getRange(1, 1, 1, encabezado.length).setValues([encabezado])
    .setFontWeight('bold').setBackground('#1f3a5f').setFontColor('#ffffff');
  hoja.setFrozenRows(1);
  hoja.getRange(2, 1, hoja.getMaxRows() - 1, encabezado.length).setNumberFormat('@');

  const colEstado = encabezado.indexOf('Estado') + 1;
  const rangoEstado = hoja.getRange(2, colEstado, hoja.getMaxRows() - 1, 1);
  rangoEstado.setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(ESTADOS, true).setAllowInvalid(false).build());

  const rangoFilas = hoja.getRange(2, 1, hoja.getMaxRows() - 1, encabezado.length);
  const letra = columnaALetra_(colEstado);
  hoja.setConditionalFormatRules(Object.keys(COLORES_ESTADO).map(estado =>
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied(`=$${letra}2="${estado}"`)
      .setBackground(COLORES_ESTADO[estado])
      .setRanges([rangoFilas])
      .build()));

  if (!hoja.getFilter()) hoja.getRange(1, 1, hoja.getMaxRows(), encabezado.length).createFilter();

  const log = ss.getSheetByName(HOJA_LOG) || ss.insertSheet(HOJA_LOG);
  if (log.getLastRow() === 0) {
    log.appendRow(['Fecha', 'ID', 'Empresa', 'Puesto', 'Acción', 'Detalle']);
    log.getRange(1, 1, 1, 6).setFontWeight('bold');
    log.setFrozenRows(1);
  }
  return encabezado;
}

function importarBloque(texto) {
  const encabezado = configurarHoja();
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJA);
  const datos = hoja.getLastRow() > 1
    ? hoja.getRange(2, 1, hoja.getLastRow() - 1, encabezado.length).getValues()
    : [];

  const res = fusionarBloque_(texto, encabezado, datos, hoyISO_());
  if (res.errores.length && !res.filasLeidas) {
    return 'No se importó nada.\n' + res.errores.join('\n');
  }
  if (res.datos.length) {
    hoja.getRange(2, 1, res.datos.length, encabezado.length).setValues(res.datos);
  }
  registrar_(res.historial);
  ordenarHoja_(hoja, encabezado);
  const doc = actualizarDocGeminiSeguro_();

  return [
    `Filas leídas: ${res.filasLeidas}`,
    `Nuevas: ${res.nuevas} · Actualizadas: ${res.actualizadas} · Sin cambios: ${res.sinCambios}`,
    doc,
    res.errores.length ? '\nAvisos:\n' + res.errores.join('\n') : '',
  ].join('\n');
}

function marcarSinRespuesta() {
  const encabezado = configurarHoja();
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJA);
  if (hoja.getLastRow() < 2) return;
  const datos = hoja.getRange(2, 1, hoja.getLastRow() - 1, encabezado.length).getValues();
  const res = marcarSinRespuesta_(encabezado, datos, hoyISO_(), DIAS_SIN_RESPUESTA);
  if (res.historial.length) {
    hoja.getRange(2, 1, datos.length, encabezado.length).setValues(res.datos);
    registrar_(res.historial);
  }
  actualizarDocGeminiSeguro_();
  try {
    SpreadsheetApp.getUi().alert(`Marcadas como "Sin respuesta": ${res.historial.length}`);
  } catch (e) {
    // Sin UI cuando corre desde el disparador diario.
  }
}

function activarRevisionDiaria() {
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'marcarSinRespuesta')
    .forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('marcarSinRespuesta').timeBased().everyDays(1).atHour(7).create();
  SpreadsheetApp.getUi().alert('Listo: cada día a las 7:00 se marcarán las postulaciones sin respuesta.');
}

/** Crea o reescribe el Google Doc que leen las skills de Gemini. */
function actualizarDocGemini() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const encabezado = configurarHoja();
  const hoja = ss.getSheetByName(HOJA);
  const datos = hoja.getLastRow() > 1
    ? hoja.getRange(2, 1, hoja.getLastRow() - 1, encabezado.length).getValues()
    : [];
  const ahora = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');

  const props = PropertiesService.getDocumentProperties();
  let doc = null;
  try {
    const id = props.getProperty('docGeminiId');
    if (id && !DriveApp.getFileById(id).isTrashed()) doc = DocumentApp.openById(id);
  } catch (e) {
    doc = null; // lo borraron o no hay acceso: se crea otro
  }
  if (!doc) {
    doc = DocumentApp.create(DOC_GEMINI);
    props.setProperty('docGeminiId', doc.getId());
    // Lo deja en la misma carpeta que la hoja.
    const archivo = DriveApp.getFileById(doc.getId());
    const carpetas = DriveApp.getFileById(ss.getId()).getParents();
    if (carpetas.hasNext()) archivo.moveTo(carpetas.next());
  }
  doc.getBody().setText(textoParaGemini_(encabezado, datos, ahora, ss.getUrl()));
  doc.saveAndClose();
  return doc.getUrl();
}

function actualizarDocGeminiSeguro_() {
  try {
    actualizarDocGemini();
    return `Copia para Gemini actualizada (Doc "${DOC_GEMINI}").`;
  } catch (e) {
    return `No se pudo actualizar el Doc "${DOC_GEMINI}": ${e.message}`;
  }
}

function registrar_(historial) {
  if (!historial.length) return;
  const log = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJA_LOG);
  const ahora = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
  log.getRange(log.getLastRow() + 1, 1, historial.length, 6)
    .setValues(historial.map(h => [ahora, h.id, h.empresa, h.puesto, h.accion, h.detalle]));
}

// Activas primero (En proceso, Oferta, Por aplicar, Aplicado…), luego por score.
function ordenarHoja_(hoja, encabezado) {
  const n = hoja.getLastRow() - 1;
  if (n < 2) return;
  const rango = hoja.getRange(2, 1, n, encabezado.length);
  const iE = encabezado.indexOf('Estado');
  const iS = encabezado.indexOf('Score');
  const iF = encabezado.indexOf('Fecha estado');
  const prioridad = ['Oferta', 'En proceso', 'Por aplicar', 'Aplicado', 'Nueva', 'Sin respuesta', 'Rechazado', 'Descartada', 'Cerrada'];
  const filas = rango.getValues().sort((a, b) => {
    const pa = prioridad.indexOf(a[iE]), pb = prioridad.indexOf(b[iE]);
    if (pa !== pb) return (pa < 0 ? 99 : pa) - (pb < 0 ? 99 : pb);
    const sa = Number(a[iS]) || 0, sb = Number(b[iS]) || 0;
    if (sa !== sb) return sb - sa;
    return String(b[iF]).localeCompare(String(a[iF]));
  });
  rango.setValues(filas);
}

// ------------------------------------------- Lógica pura (sin servicios de Google)

/**
 * Fusiona un bloque de texto con las filas existentes.
 * Devuelve las filas resultantes (existentes + nuevas) y un resumen.
 */
function fusionarBloque_(texto, encabezado, datosOriginales, hoy) {
  const datos = datosOriginales.map(f => f.slice());
  const idx = {};
  encabezado.forEach((c, i) => { idx[c] = i; });
  const res = { datos, nuevas: 0, actualizadas: 0, sinCambios: 0, filasLeidas: 0, errores: [], historial: [] };

  const bloque = leerBloque_(texto);
  res.errores.push(...bloque.errores);
  if (!bloque.columnas) return res;

  bloque.filas.forEach(({ linea, valores }) => {
    res.filasLeidas++;
    const v = {};
    bloque.columnas.forEach((col, i) => {
      if (col && valores[i] !== undefined && valores[i] !== '') v[col] = valores[i];
    });
    if (v['Estado'] !== undefined) {
      const e = normalizarEstado_(v['Estado']);
      if (!e.estado) {
        res.errores.push(`Línea ${linea}: estado "${v['Estado']}" no reconocido; se ignoró el estado.`);
        delete v['Estado'];
      } else {
        v['Estado'] = e.estado;
        if (e.dudoso) v['Notas'] = [v['Notas'], '(estado dudoso)'].filter(Boolean).join(' ');
      }
    }
    if (!v['ID'] && !(v['Empresa'] && v['Puesto'])) {
      res.errores.push(`Línea ${linea}: falta ID o Empresa + Puesto; se omitió.`);
      return;
    }

    const i = buscarFila_(datos, idx, v);
    if (i === -1) {
      const fila = encabezado.map(() => '');
      Object.keys(v).forEach(col => { if (idx[col] !== undefined) fila[idx[col]] = v[col]; });
      if (!fila[idx['ID']]) fila[idx['ID']] = generarId_(v);
      if (!fila[idx['Fecha encontrada']]) fila[idx['Fecha encontrada']] = hoy;
      if (!fila[idx['Estado']]) fila[idx['Estado']] = 'Por aplicar';
      if (!fila[idx['Fecha estado']]) fila[idx['Fecha estado']] = hoy;
      datos.push(fila);
      res.nuevas++;
      res.historial.push(entradaLog_(fila, idx, 'Nueva', `Estado: ${fila[idx['Estado']]}`));
      return;
    }

    const fila = datos[i];
    const cambios = [];
    // El buscador volvió a encontrar una vacante que ya avanzó (Aplicado, En proceso…):
    // solo rellena celdas vacías, sin tocar estado, fechas ni próxima acción.
    const estadoActual = String(fila[idx['Estado']] || '').trim();
    const soloRellenar = Boolean(estadoActual) && ESTADOS_INICIALES.indexOf(estadoActual) === -1 &&
      (!v['Estado'] || ESTADOS_INICIALES.indexOf(v['Estado']) !== -1);
    Object.keys(v).forEach(col => {
      const c = idx[col];
      if (c === undefined || col === 'ID') return;
      const viejo = String(fila[c] === null || fila[c] === undefined ? '' : fila[c]).trim();
      const nuevo = String(v[col]).trim();
      if (viejo === nuevo) return;
      // Empresa y Puesto se quedan como se registraron (el correo suele traer otra variante).
      if ((col === 'Fecha encontrada' || col === 'Empresa' || col === 'Puesto') && viejo) return;
      if (soloRellenar && (viejo || col === 'Estado' || col === 'Fecha estado')) return;
      if (col === 'Estado') {
        if (viejo && ESTADOS_INICIALES.indexOf(nuevo) !== -1 && ESTADOS_INICIALES.indexOf(viejo) === -1) return;
        fila[c] = nuevo;
        if (!v['Fecha estado']) fila[idx['Fecha estado']] = hoy;
        cambios.push(`Estado: ${viejo || '—'} → ${nuevo}`);
        return;
      }
      if (col === 'Notas' && viejo) {
        if (viejo.indexOf(nuevo) !== -1) return;
        fila[c] = `${viejo} · ${nuevo}`;
        cambios.push('Notas');
        return;
      }
      fila[c] = nuevo;
      cambios.push(col);
    });
    if (cambios.length) {
      res.actualizadas++;
      res.historial.push(entradaLog_(fila, idx, 'Actualizada', cambios.join('; ')));
    } else {
      res.sinCambios++;
    }
  });
  return res;
}

/** Encuentra el encabezado del bloque y separa sus filas. */
function leerBloque_(texto) {
  const lineas = String(texto || '').split(/\r?\n/);
  const out = { columnas: null, filas: [], errores: [] };
  let n = 0;
  let bordes = false; // tabla Markdown con "|" al inicio y al final de cada línea
  for (; n < lineas.length; n++) {
    if (lineas[n].indexOf('|') === -1) continue;
    bordes = lineas[n].trim().charAt(0) === '|';
    const cols = partirLinea_(lineas[n], bordes).map(normalizarColumna_);
    const conocidas = cols.filter(Boolean);
    if (conocidas.length >= 2 && (conocidas.indexOf('ID') !== -1 || conocidas.indexOf('Empresa') !== -1)) {
      out.columnas = cols;
      break;
    }
  }
  if (!out.columnas) {
    out.errores.push('No encontré el encabezado del bloque (una línea con "ID | ..." o "Empresa | ...").');
    return out;
  }
  for (let i = n + 1; i < lineas.length; i++) {
    const linea = lineas[i].trim();
    if (/^FIN_BLOQUE/i.test(linea)) break;
    if (!linea || linea.indexOf('|') === -1 || /^`{3}/.test(linea)) continue;
    if (/^\|?\s*:?-{2,}/.test(linea)) continue; // separador de tabla Markdown
    let valores = partirLinea_(linea, bordes);
    while (valores.length > out.columnas.length && valores[valores.length - 1] === '') valores.pop();
    if (valores.length > out.columnas.length && out.columnas[out.columnas.length - 1] === 'Notas') {
      // Un "|" de más dentro de Notas: se junta en la última columna.
      valores = valores.slice(0, out.columnas.length - 1)
        .concat([valores.slice(out.columnas.length - 1).join(' / ')]);
    }
    if (valores.length < out.columnas.length) {
      valores = valores.concat(new Array(out.columnas.length - valores.length).fill(''));
    }
    if (valores.length !== out.columnas.length) {
      out.errores.push(`Línea ${i + 1}: tiene ${valores.length} columnas y el encabezado ${out.columnas.length}; se omitió.`);
      continue;
    }
    out.filas.push({ linea: i + 1, valores });
  }
  return out;
}

function partirLinea_(linea, bordes) {
  let s = String(linea).trim();
  if (bordes && s.charAt(0) === '|') s = s.slice(1);
  if (bordes && s.charAt(s.length - 1) === '|') s = s.slice(0, -1);
  return s.split('|').map(x => x.trim().replace(/^\*\*(.*)\*\*$/, '$1'));
}

function normalizarColumna_(nombre) {
  const n = normalizar_(nombre);
  const directa = COLUMNAS.find(c => normalizar_(c) === n);
  return directa || ALIAS_COLUMNAS[n] || null;
}

function normalizarEstado_(texto) {
  const dudoso = /\(\?\)|dudoso/i.test(texto);
  const n = normalizar_(String(texto).replace(/\(\?\)|\(estado dudoso\)/gi, ''));
  if (ALIAS_ESTADOS[n]) return { estado: ALIAS_ESTADOS[n], dudoso };
  const clave = Object.keys(ALIAS_ESTADOS).find(k => n.indexOf(k) !== -1);
  return { estado: clave ? ALIAS_ESTADOS[clave] : null, dudoso };
}

/** Busca por ID del portal (link), luego por ID, luego por empresa + puesto parecido. */
function buscarFila_(datos, idx, v) {
  const clave = claveLink_(v['Link']);
  if (clave) {
    const i = datos.findIndex(f => claveLink_(f[idx['Link']]) === clave);
    if (i !== -1) return i;
  }
  if (v['ID']) {
    const id = String(v['ID']).trim().toLowerCase();
    const i = datos.findIndex(f => String(f[idx['ID']]).trim().toLowerCase() === id);
    if (i !== -1) return i;
  }
  if (v['Empresa'] && v['Puesto']) {
    const emp = normalizar_(v['Empresa']);
    const tok = tokens_(v['Puesto']);
    const ciudad = normalizar_(v['Ciudad'] || '');
    let mejor = -1, mejorScore = 0, empate = false;
    datos.forEach((f, i) => {
      const e2 = normalizar_(f[idx['Empresa']]);
      if (!e2 || !(e2 === emp || e2.indexOf(emp) !== -1 || emp.indexOf(e2) !== -1)) return;
      let s = jaccard_(tok, tokens_(f[idx['Puesto']]));
      const c2 = normalizar_(f[idx['Ciudad']] || '');
      if (ciudad && c2 && ciudad !== c2) s -= 0.3;
      if (s > mejorScore + 1e-9) { mejor = i; mejorScore = s; empate = false; } else if (Math.abs(s - mejorScore) < 1e-9 && s > 0) { empate = true; }
    });
    if (mejor !== -1 && mejorScore >= 0.5 && !empate) return mejor;
  }
  return -1;
}

/** ID de la vacante dentro del portal, para reconocerla aunque cambie el resto del link. */
function claveLink_(link) {
  const s = String(link || '');
  let m;
  if ((m = s.match(/linkedin\.com\/jobs\/view\/(?:[^\/?#]*-)?(\d{6,})/i))) return 'li:' + m[1];
  if ((m = s.match(/linkedin\.com\/.*currentJobId=(\d{6,})/i))) return 'li:' + m[1];
  if ((m = s.match(/indeed\.[a-z.]+\/.*[?&](?:jk|vjk)=([a-f0-9]{10,})/i))) return 'in:' + m[1].toLowerCase();
  if ((m = s.match(/occ\.com\.mx\/empleo\/oferta\/(\d{5,})/i))) return 'occ:' + m[1];
  if ((m = s.match(/computrabajo\.com\/.*-([A-F0-9]{24,})/i))) return 'ct:' + m[1].toUpperCase();
  const limpio = s.trim().replace(/[?#].*$/, '').replace(/\/+$/, '').toLowerCase();
  return /^https?:\/\//.test(limpio) ? 'url:' + limpio : '';
}

function generarId_(v) {
  return [v['Empresa'], v['Puesto'], v['Ciudad']]
    .filter(Boolean).map(normalizar_).join(' ')
    .split(' ').filter(Boolean).slice(0, 8).join('-');
}

/** Texto del Doc para Gemini: resumen + todas las filas en formato BLOQUE_TRACKER. */
function textoParaGemini_(encabezado, datos, ahora, urlHoja) {
  const idx = {};
  encabezado.forEach((c, i) => { idx[c] = i; });
  const conteo = {};
  datos.forEach(f => { const e = f[idx['Estado']] || 'Sin estado'; conteo[e] = (conteo[e] || 0) + 1; });
  const limpiar = v => String(v === null || v === undefined ? '' : (v instanceof Date ? aISO_(v) : v))
    .replace(/[|\r\n]+/g, ' / ').trim();
  return [
    'TRACKER DE VACANTES DE ARITH — copia de texto para Gemini',
    `Actualizado: ${ahora}. Lo genera automáticamente la hoja Tracker_Vacantes_Arith; no lo edites a mano.`,
    urlHoja ? `Hoja original: ${urlHoja}` : '',
    '',
    `Total: ${datos.length} vacantes · ` + ESTADOS.filter(e => conteo[e]).map(e => `${e}: ${conteo[e]}`).join(' · '),
    '',
    'BLOQUE_TRACKER v1',
    COLUMNAS_DOC.join(' | '),
    ...datos.map(f => COLUMNAS_DOC.map(c => (idx[c] === undefined ? '' : limpiar(f[idx[c]]))).join(' | ')),
    'FIN_BLOQUE',
  ].join('\n');
}

function marcarSinRespuesta_(encabezado, datosOriginales, hoy, dias) {
  const datos = datosOriginales.map(f => f.slice());
  const iE = encabezado.indexOf('Estado');
  const iF = encabezado.indexOf('Fecha estado');
  const historial = [];
  const idx = {};
  encabezado.forEach((c, i) => { idx[c] = i; });
  datos.forEach(f => {
    if (f[iE] !== 'Aplicado') return;
    const fecha = aISO_(f[iF]);
    if (!fecha || diasEntre_(fecha, hoy) < dias) return;
    f[iE] = 'Sin respuesta';
    f[iF] = hoy;
    historial.push(entradaLog_(f, idx, 'Actualizada', `Estado: Aplicado → Sin respuesta (desde ${fecha})`));
  });
  return { datos, historial };
}

// ------------------------------------------------------------------ Utilidades

function normalizar_(s) {
  return String(s || '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ').trim();
}

function tokens_(s) {
  return new Set(normalizar_(s).split(' ').filter(t => t && !PALABRAS_VACIAS.has(t)));
}

function jaccard_(a, b) {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  a.forEach(t => { if (b.has(t)) inter++; });
  return inter / (a.size + b.size - inter);
}

function entradaLog_(fila, idx, accion, detalle) {
  return { id: fila[idx['ID']], empresa: fila[idx['Empresa']], puesto: fila[idx['Puesto']], accion, detalle };
}

function aISO_(valor) {
  if (valor instanceof Date) {
    return `${valor.getFullYear()}-${String(valor.getMonth() + 1).padStart(2, '0')}-${String(valor.getDate()).padStart(2, '0')}`;
  }
  const m = String(valor || '').match(/(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : '';
}

function diasEntre_(desde, hasta) {
  return Math.round((Date.parse(hasta + 'T00:00:00Z') - Date.parse(desde + 'T00:00:00Z')) / 86400000);
}

function hoyISO_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function columnaALetra_(n) {
  let s = '';
  for (; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}

if (typeof module !== 'undefined') {
  module.exports = { fusionarBloque_, marcarSinRespuesta_, textoParaGemini_, claveLink_, generarId_, COLUMNAS };
}
