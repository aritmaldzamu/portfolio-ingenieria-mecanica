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
