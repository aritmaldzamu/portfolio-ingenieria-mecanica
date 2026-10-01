// Service worker: atajo de teclado, puente popup -> pestaña y perfil inicial.
const CONTENT_FILES = ['src/content/utils.js', 'src/content/fields.js', 'src/content/rules.js', 'src/content/widgets.js', 'src/content/panel.js', 'src/content/main.js'];

chrome.runtime.onInstalled.addListener(async () => {
  const { profile } = await chrome.storage.local.get('profile');
  if (profile) return;
  const res = await fetch(chrome.runtime.getURL('profile.example.json'));
  await chrome.storage.local.set({ profile: await res.json() });
});

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

/** En sitios Workday el script ya está cargado; en otros (Greenhouse, Lever…) se inyecta al pedirlo. */
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
