const $ = (id) => document.getElementById(id);
const editor = $('editor');

function setStatus(msg, cls = '') {
  $('status').textContent = msg;
  $('status').className = cls;
}

/** Revisa la estructura y devuelve advertencias legibles (no bloquean el guardado). */
function check(p) {
  const w = [];
  const need = (cond, msg) => cond || w.push(msg);
  need(p && typeof p === 'object', 'El perfil debe ser un objeto JSON.');
  if (!p || typeof p !== 'object') return w;
  const per = p.personal || {};
  need(per.firstName, 'Falta personal.firstName');
  need(per.lastName, 'Falta personal.lastName');
  need(per.email, 'Falta personal.email');
  need(per.phone?.number, 'Falta personal.phone.number');
  need(Array.isArray(p.addresses) && p.addresses.length, 'Agrega al menos una dirección en "addresses".');
  (p.addresses || []).forEach((a, i) => {
    const missing = ['country', 'state', 'city', 'postalCode', 'line1'].filter((k) => !a[k] || (Array.isArray(a[k]) && !a[k].length));
    if (missing.length) w.push(`Dirección "${a.label || i + 1}": faltan ${missing.join(', ')}`);
  });
  for (const k of ['experience', 'education', 'languages', 'websites', 'skills', 'answers']) {
    if (p[k] != null && !Array.isArray(p[k])) w.push(`"${k}" debe ser una lista [ ... ]`);
  }
  (p.education || []).forEach((e, i) => {
    if (!e.start) w.push(`Educación ${i + 1}: falta "start" (año de inicio)`);
  });
  (p.answers || []).forEach((a, i) => {
    try {
      new RegExp(a.question);
    } catch (e) {
      w.push(`answers[${i}]: la expresión "${a.question}" no es válida (${e.message})`);
    }
  });
  return w;
}

function parseEditor() {
  try {
    return { value: JSON.parse(editor.value) };
  } catch (e) {
    const m = String(e.message).match(/position (\d+)/);
    let where = '';
    if (m) {
      const upTo = editor.value.slice(0, Number(m[1]));
      where = ` (línea ${upTo.split('\n').length})`;
      editor.focus();
      editor.setSelectionRange(Number(m[1]), Number(m[1]) + 1);
    }
    return { error: `JSON inválido${where}: ${e.message}` };
  }
}

function showWarnings(list) {
  $('warnings').innerHTML = '';
  for (const t of list) {
    const li = document.createElement('li');
    li.textContent = t;
    $('warnings').appendChild(li);
  }
}

/** chrome.storage ordena las llaves alfabéticamente; recuperar el orden legible del ejemplo. */
function ordered(value, template) {
  if (Array.isArray(value)) return value.map((v) => ordered(v, Array.isArray(template) ? template[0] : undefined));
  if (!value || typeof value !== 'object') return value;
  const t = template && typeof template === 'object' && !Array.isArray(template) ? template : {};
  const keys = [...Object.keys(t).filter((k) => k in value), ...Object.keys(value).filter((k) => !(k in t))];
  return Object.fromEntries(keys.map((k) => [k, ordered(value[k], t[k])]));
}

async function loadProfile() {
  const { profile } = await chrome.storage.local.get('profile');
  const ex = await example();
  editor.value = JSON.stringify(profile ? ordered(profile, ex) : ex, null, 2);
  showWarnings(check(profile || {}));
}

async function example() {
  const r = await fetch(chrome.runtime.getURL('profile.example.json'));
  return r.json();
}

$('save').onclick = async () => {
  const { value, error } = parseEditor();
  if (error) return setStatus(error, 'err');
  await chrome.storage.local.set({ profile: value });
  const w = check(value);
  showWarnings(w);
  setStatus(w.length ? `Guardado con ${w.length} advertencia(s)` : 'Guardado ✔', w.length ? '' : 'ok');
};

$('format').onclick = () => {
  const { value, error } = parseEditor();
  if (error) return setStatus(error, 'err');
  editor.value = JSON.stringify(value, null, 2);
  setStatus('');
};

$('export').onclick = () => {
  const blob = new Blob([editor.value], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'perfil-autollenado.json';
  a.click();
  URL.revokeObjectURL(a.href);
};

$('importFile').onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  editor.value = await file.text();
  const { value, error } = parseEditor();
  if (error) return setStatus(error, 'err');
  editor.value = JSON.stringify(value, null, 2);
  setStatus('Importado. Revisa y da Guardar.');
  e.target.value = '';
};

$('reset').onclick = async () => {
  if (!confirm('¿Reemplazar el editor con el perfil de ejemplo? (no se guarda hasta que des Guardar)')) return;
  editor.value = JSON.stringify(await example(), null, 2);
  setStatus('Ejemplo cargado. Da Guardar para usarlo.');
};

// Ctrl+S guarda
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault();
    $('save').click();
  }
});

// ---------- CVs ----------
function toBase64(buf) {
  const bytes = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

async function renderResumes() {
  const { resumes = [] } = await chrome.storage.local.get('resumes');
  const ul = $('resumes');
  ul.innerHTML = '';
  if (!resumes.length) ul.innerHTML = '<li class="muted">Sin CVs guardados.</li>';
  resumes.forEach((r, i) => {
    const li = document.createElement('li');
    li.innerHTML = `<span></span><button>Quitar</button>`;
    li.querySelector('span').textContent = `${r.label ? r.label + ' — ' : ''}${r.name} · ${(r.size / 1024).toFixed(0)} KB`;
    li.querySelector('button').onclick = async () => {
      resumes.splice(i, 1);
      await chrome.storage.local.set({ resumes });
      renderResumes();
    };
    ul.appendChild(li);
  });
}

$('resumeFile').onchange = async (e) => {
  const { resumes = [] } = await chrome.storage.local.get('resumes');
  for (const f of e.target.files) {
    resumes.push({ name: f.name, type: f.type || 'application/pdf', size: f.size, dataB64: toBase64(await f.arrayBuffer()) });
  }
  await chrome.storage.local.set({ resumes });
  e.target.value = '';
  renderResumes();
};

// ---------- respuestas aprendidas ----------
async function renderLearned() {
  const { learned = {} } = await chrome.storage.local.get('learned');
  const q = $('learnedFilter').value.toLowerCase();
  const ul = $('learned');
  ul.innerHTML = '';
  const entries = Object.entries(learned)
    .filter(([, v]) => !q || v.label.toLowerCase().includes(q))
    .sort((a, b) => String(b[1].at).localeCompare(String(a[1].at)));
  if (!entries.length) ul.innerHTML = '<li class="muted">Aún no hay respuestas aprendidas. Contesta a mano una pregunta nueva en un formulario de empleo.</li>';
  for (const [key, v] of entries) {
    const li = document.createElement('li');
    li.innerHTML = '<span class="q"><span></span><small></small></span><input><button>Borrar</button>';
    li.querySelector('.q span').textContent = v.label;
    li.querySelector('.q small').textContent = `${v.host || ''} · ${String(v.at || '').slice(0, 10)}`;
    const input = li.querySelector('input');
    input.value = Array.isArray(v.value) ? v.value.join(' | ') : String(v.value);
    input.onchange = async () => {
      const { learned: cur = {} } = await chrome.storage.local.get('learned');
      if (!cur[key]) return;
      const raw = input.value.trim();
      cur[key].value = typeof v.value === 'boolean' ? /^(true|si|sí|yes|1)$/i.test(raw) : Array.isArray(v.value) ? raw.split(/\s*\|\s*/).filter(Boolean) : raw;
      await chrome.storage.local.set({ learned: cur });
      setStatus('Respuesta actualizada ✔', 'ok');
    };
    li.querySelector('button').onclick = async () => {
      const { learned: cur = {} } = await chrome.storage.local.get('learned');
      delete cur[key];
      await chrome.storage.local.set({ learned: cur });
      renderLearned();
    };
    ul.appendChild(li);
  }
}
$('learnedFilter').oninput = renderLearned;
$('learnedClear').onclick = async () => {
  if (!confirm('¿Borrar todas las respuestas aprendidas?')) return;
  await chrome.storage.local.set({ learned: {} });
  renderLearned();
};
chrome.storage.onChanged.addListener((ch) => ch.learned && renderLearned());

loadProfile();
renderResumes();
renderLearned();
