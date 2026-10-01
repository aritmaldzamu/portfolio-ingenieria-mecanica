const DEFAULT_SETTINGS = { activeAddress: 0, activeResume: 0, overwrite: false, uploadResume: true, floatingButton: true, autoOnStep: false, addCertifications: false };
const $ = (id) => document.getElementById(id);

async function load() {
  const { profile, settings: saved, resumes = [] } = await chrome.storage.local.get(['profile', 'settings', 'resumes']);
  const settings = { ...DEFAULT_SETTINGS, ...(saved || {}) };
  const p = profile?.personal || {};
  $('who').textContent = profile ? `${p.firstName || ''} ${p.lastName || ''}`.trim() : 'sin perfil';

  const addr = $('address');
  addr.innerHTML = '';
  (profile?.addresses || []).forEach((a, i) => addr.add(new Option(a.label || `Dirección ${i + 1}`, i)));
  addr.value = settings.activeAddress;

  const res = $('resume');
  res.innerHTML = '';
  res.add(new Option('No subir CV', '-1'));
  resumes.forEach((r, i) => res.add(new Option(r.name, i)));
  res.value = settings.uploadResume && resumes.length ? settings.activeResume : -1;

  for (const k of ['overwrite', 'floatingButton', 'autoOnStep', 'addCertifications']) $(k).checked = !!settings[k];
  return settings;
}

async function save(patch) {
  const { settings } = await chrome.storage.local.get('settings');
  await chrome.storage.local.set({ settings: { ...DEFAULT_SETTINGS, ...(settings || {}), ...patch } });
}

$('address').onchange = (e) => save({ activeAddress: Number(e.target.value) });
$('resume').onchange = (e) => {
  const v = Number(e.target.value);
  save(v < 0 ? { uploadResume: false } : { uploadResume: true, activeResume: v });
};
for (const k of ['overwrite', 'floatingButton', 'autoOnStep', 'addCertifications']) $(k).onchange = (e) => save({ [k]: e.target.checked });
$('options').onclick = (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
};

$('fill').onclick = async () => {
  const btn = $('fill');
  const out = $('result');
  btn.disabled = true;
  btn.textContent = 'Llenando…';
  out.hidden = true;
  const r = await chrome.runtime.sendMessage({ type: 'WDAF_FILL_ACTIVE' });
  btn.disabled = false;
  btn.textContent = 'Llenar esta página';
  out.hidden = false;
  out.classList.toggle('err', !!r?.error);
  if (r?.error) out.textContent = r.error === 'no-profile' ? 'Primero guarda tu perfil en las opciones.' : r.error;
  else if (r?.busy) out.textContent = 'Ya se está llenando…';
  else out.textContent = `✔ ${r?.filled ?? 0} campos llenados · ⚠ ${r?.pending ?? 0} pendientes. Revisa el panel en la página.`;
};

load();
