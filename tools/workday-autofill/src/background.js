// Service worker: atajo de teclado, puente popup -> pestaña y perfil inicial.
const CONTENT_FILES = ['src/content/utils.js', 'src/content/fields.js', 'src/content/rules.js', 'src/content/widgets.js', 'src/content/learn.js', 'src/content/panel.js', 'src/content/main.js'];

const isBlank = (v) => v == null || v === '' || (Array.isArray(v) && !v.length);

/**
 * Al instalar: carga el perfil de ejemplo. Al actualizar: completa SOLO los
 * datos de dirección que estén vacíos en tu perfil guardado (por etiqueta,
 * p.ej. "Puebla") y los campos nuevos, sin pisar nada que ya hayas escrito.
 */
chrome.runtime.onInstalled.addListener(async () => {
  const example = await (await fetch(chrome.runtime.getURL('profile.example.json'))).json();
  const { profile } = await chrome.storage.local.get('profile');
  if (!profile) return chrome.storage.local.set({ profile: example });
  const mine = (profile.addresses = profile.addresses || []);
  for (const ex of example.addresses || []) {
    const cur = mine.find((a) => a.label === ex.label);
    if (!cur) {
      mine.push(ex);
      continue;
    }
    for (const [k, v] of Object.entries(ex)) if (isBlank(cur[k]) && !isBlank(v)) cur[k] = v;
  }
  // campos nuevos de versiones recientes (CURP, RFC…): se agregan vacíos o con el valor de ejemplo
  for (const sec of ['personal', 'preferences']) {
    profile[sec] = profile[sec] || {};
    for (const [k, v] of Object.entries(example[sec] || {})) if (!(k in profile[sec])) profile[sec][k] = v;
  }
  await chrome.storage.local.set({ profile });
});

/**
 * CVs incluidos en la extensión (carpeta cvs/): se cargan solos. Uno que borres en
 * Opciones no vuelve a aparecer en la siguiente actualización.
 */
chrome.runtime.onInstalled.addListener(async () => {
  const { resumes = [], settings = {} } = await chrome.storage.local.get(['resumes', 'settings']);
  const seen = new Set(settings.bundledCvs || []);
  const list = await (await fetch(chrome.runtime.getURL('cvs/cvs.json'))).json();
  let added = 0;
  for (const cv of list) {
    if (seen.has(cv.file) || resumes.some((r) => r.name === cv.file)) {
      seen.add(cv.file);
      continue;
    }
    const buf = await (await fetch(chrome.runtime.getURL(`cvs/${cv.file}`))).arrayBuffer();
    const bytes = new Uint8Array(buf);
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    resumes.push({ name: cv.file, label: cv.label, type: 'application/pdf', size: bytes.length, dataB64: btoa(bin), bundled: true });
    seen.add(cv.file);
    added++;
  }
  const next = { ...settings, bundledCvs: [...seen] };
  // si no tenías CV elegido, usar el recomendado
  if (added && settings.activeResume == null) {
    next.activeResume = Math.max(0, resumes.findIndex((r) => r.name === list[0].file));
    next.uploadResume = true;
  }
  await chrome.storage.local.set({ resumes, settings: next });
});

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

/** El script ya está en todas las páginas; si la pestaña se abrió antes de instalar, se inyecta al pedirlo. */
async function fillTab(tab) {
  if (!tab?.id) return { error: 'Sin pestaña activa' };
  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'WDAF_PING' });
  } catch (_) {
    try {
      await chrome.scripting.executeScript({ target: { tabId: tab.id, allFrames: true }, files: CONTENT_FILES });
    } catch (e) {
      return { error: `No puedo acceder a esta página (${e.message})` };
    }
  }
  try {
    return await chrome.tabs.sendMessage(tab.id, { type: 'WDAF_FILL' });
  } catch (e) {
    return { error: e.message };
  }
}

chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'fill-page') fillTab(await activeTab());
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'WDAF_FILL_ACTIVE') {
    activeTab().then(fillTab).then(sendResponse);
    return true;
  }
  return false;
});
