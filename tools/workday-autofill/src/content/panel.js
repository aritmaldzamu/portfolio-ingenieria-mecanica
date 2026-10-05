// Panel flotante dentro de la página (Shadow DOM para que el CSS de Workday no lo afecte):
// botón "Llenar", resumen de lo que se llenó y lista de pendientes clicables.
(() => {
  const WD = (window.__WDAF = window.__WDAF || {});
  if (WD.panel) return;

  const CSS = `
    :host { all: initial; }
    * { box-sizing: border-box; font-family: "Segoe UI", system-ui, sans-serif; }
    .wrap { position: fixed; right: 16px; bottom: 16px; z-index: 2147483646; display: flex; flex-direction: column; align-items: flex-end; gap: 8px; }
    .fab { border: 0; border-radius: 999px; padding: 10px 16px; background: #0b5cad; color: #fff; font-size: 14px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 14px rgba(0,0,0,.25); }
    .fab:hover { background: #094a8c; }
    .fab[disabled] { opacity: .7; cursor: progress; }
    .card { width: 340px; max-height: 60vh; overflow: auto; background: #fff; color: #1f2937; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,.25); padding: 12px 14px; font-size: 13px; line-height: 1.35; }
    .card[hidden] { display: none; }
    .row { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
    h3 { margin: 0 0 6px; font-size: 14px; }
    .stats { display: flex; gap: 10px; margin: 6px 0 8px; flex-wrap: wrap; }
    .pill { border-radius: 999px; padding: 2px 8px; font-weight: 600; font-size: 12px; }
    .ok { background: #dcfce7; color: #166534; } .warn { background: #fef3c7; color: #92400e; } .muted { background: #e5e7eb; color: #374151; }
    ul { list-style: none; margin: 0; padding: 0; }
    li { padding: 5px 6px; border-radius: 6px; cursor: pointer; display: flex; gap: 6px; }
    li:hover { background: #f3f4f6; }
    li small { color: #6b7280; display: block; }
    .x { background: none; border: 0; font-size: 18px; cursor: pointer; color: #6b7280; }
    .actions { display: flex; gap: 6px; margin-top: 10px; flex-wrap: wrap; }
    .btn { border: 1px solid #d1d5db; background: #f9fafb; border-radius: 8px; padding: 5px 9px; font-size: 12px; cursor: pointer; }
    .note { color: #6b7280; font-size: 12px; margin-top: 8px; }
    details summary { cursor: pointer; color: #374151; margin-top: 6px; }
  `;

  let host;
  let root;
  let marked = [];

  function ensure() {
    if (host && host.isConnected) return root;
    host = document.createElement('div');
    host.id = 'wdaf-root';
    root = host.attachShadow({ mode: 'open' });
    root.innerHTML = `<style>${CSS}</style>
      <div class="wrap">
        <div class="card" hidden></div>
        <button class="fab" hidden title="Alt+Shift+L">⚡ Autollenar</button>
      </div>`;
    (document.body || document.documentElement).appendChild(host);
    root.querySelector('.fab').addEventListener('click', () => WD.fill?.());
    return root;
  }

  function showButton(show) {
    ensure().querySelector('.fab').hidden = !show;
  }

  function setBusy(busy) {
    const fab = ensure().querySelector('.fab');
    fab.disabled = busy;
    fab.textContent = busy ? '⏳ Llenando…' : '⚡ Autollenar';
    if (busy) {
      const card = root.querySelector('.card');
      card.hidden = false;
      card.innerHTML = '<h3>Llenando…</h3><div class="note">No toques la página unos segundos.</div>';
    }
  }

  function clearMarks() {
    for (const m of marked) {
      m.el.style.outline = m.outline;
      m.el.style.outlineOffset = m.offset;
    }
    marked = [];
  }

  function mark(el, color, dashed) {
    if (!el || !el.style) return;
    marked.push({ el, outline: el.style.outline, offset: el.style.outlineOffset });
    el.style.outline = `2px ${dashed ? 'dashed' : 'solid'} ${color}`;
    el.style.outlineOffset = '2px';
  }

  function targetOf(f) {
    if (f.kind === 'radio' || f.kind === 'checkbox' || f.kind === 'file') return f.container || f.el.parentElement;
    return f.el;
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  }

  const STATUS_TEXT = { failed: 'No pude seleccionarlo', nodata: 'Falta el dato en tu perfil', unknown: 'Pregunta nueva: contéstala y la recordaré' };

  /** items: [{ f, status: filled|kept|failed|nodata|unknown, rule, note }] */
  function render(items, { message, notes = [] } = {}) {
    const r = ensure();
    clearMarks();
    const card = r.querySelector('.card');
    card.hidden = false;
    if (message) {
      card.innerHTML = `<div class="row"><h3>Autollenado</h3><button class="x">×</button></div><div>${esc(message)}</div>`;
      card.querySelector('.x').onclick = () => (card.hidden = true);
      return;
    }
    const filled = items.filter((i) => i.status === 'filled');
    const kept = items.filter((i) => i.status === 'kept');
    const pending = items.filter((i) => i.status === 'failed' || i.status === 'nodata' || (i.status === 'unknown' && i.f.required));
    const optional = items.filter((i) => i.status === 'unknown' && !i.f.required);
    filled.forEach((i) => mark(targetOf(i.f), '#16a34a'));
    pending.forEach((i) => mark(targetOf(i.f), '#f59e0b', true));

    const li = (i, idx, group) => `<li data-g="${group}" data-i="${idx}"><span>${i.status === 'unknown' ? '❔' : '⚠️'}</span><span>${esc(i.f.label || '(sin etiqueta)')}${i.f.required ? ' *' : ''}<small>${esc(i.note || STATUS_TEXT[i.status] || '')}${i.rule ? ' · ' + esc(i.rule) : ''}</small></span></li>`;
    card.innerHTML = `
      <div class="row"><h3>Autollenado</h3><button class="x" title="Cerrar">×</button></div>
      <div class="stats">
        <span class="pill ok">✔ ${filled.length} llenados</span>
        <span class="pill warn">⚠ ${pending.length} pendientes</span>
        ${kept.length ? `<span class="pill muted">${kept.length} ya tenían valor</span>` : ''}
      </div>
      ${notes.map((n) => `<div class="note" style="color:#166534;margin:0 0 6px">✔ ${esc(n)}</div>`).join('')}
      ${pending.length ? `<ul>${pending.map((i, n) => li(i, n, 'p')).join('')}</ul>` : '<div>Todo lo reconocido quedó lleno. Revisa y da <b>Next</b>.</div>'}
      ${optional.length ? `<details><summary>${optional.length} campos opcionales no reconocidos</summary><ul>${optional.map((i, n) => li(i, n, 'o')).join('')}</ul></details>` : ''}
      <div class="actions">
        <button class="btn" data-a="again">Volver a llenar</button>
        <button class="btn" data-a="learn" title="Guarda lo que contestaste a mano para llenarlo solo la próxima vez">💾 Recordar mis respuestas</button>
        <button class="btn" data-a="copy">Copiar preguntas sin respuesta</button>
        <button class="btn" data-a="diag">Copiar diagnóstico</button>
        <button class="btn" data-a="clear">Quitar marcas</button>
      </div>
      <div class="note">Verde = lo llené yo. Naranja = revísalo tú. Contesta los naranjas y lo recordaré para la próxima. Nunca doy clic en Next/Submit.</div>`;
    card.querySelector('.x').onclick = () => {
      card.hidden = true;
      clearMarks();
    };
    card.querySelectorAll('li').forEach((el) => {
      el.onclick = () => {
        const item = (el.dataset.g === 'p' ? pending : optional)[Number(el.dataset.i)];
        const t = targetOf(item.f);
        t.scrollIntoView({ block: 'center', behavior: 'smooth' });
        item.f.el.focus?.({ preventScroll: true });
      };
    });
    card.querySelector('[data-a="again"]').onclick = () => WD.fill?.();
    card.querySelector('[data-a="clear"]').onclick = clearMarks;
    card.querySelector('[data-a="learn"]').onclick = async (ev) => {
      const n = await WD.learn.snapshot();
      ev.target.textContent = n ? `💾 Guardé ${n} respuesta(s) ✔` : '💾 Nada nuevo que guardar';
    };
    card.querySelector('[data-a="diag"]').onclick = async (ev) => {
      // estructura de los campos problemáticos (sin valores escritos) para poder ajustar reglas
      const html = (el) =>
        (el?.outerHTML || '')
          .replace(/\svalue="[^"]*"/g, '')
          .replace(/\s(class|style)="[^"]*"/g, '')
          .replace(/\s+/g, ' ')
          .slice(0, 1500);
      const report = {
        url: location.host + location.pathname,
        paso: document.querySelector('[data-automation-id="progressBarActiveStep"]')?.textContent?.trim() || '',
        version: chrome.runtime.getManifest().version,
        campos: [...pending, ...optional].map((i) => ({
          estado: i.status,
          etiqueta: i.f.label,
          tipo: i.f.kind,
          regla: i.rule || '',
          nota: i.note || '',
          tokens: i.f.tokens,
          html: html(i.f.container || i.f.el),
        })),
      };
      try {
        await navigator.clipboard.writeText(JSON.stringify(report, null, 1));
        ev.target.textContent = 'Diagnóstico copiado ✔';
      } catch (_) {
        ev.target.textContent = 'No se pudo copiar';
      }
    };
    card.querySelector('[data-a="copy"]').onclick = async (ev) => {
      const qs = [...pending, ...optional].filter((i) => i.status === 'unknown' || i.status === 'failed').map((i) => i.f.label).filter(Boolean);
      const json = JSON.stringify(
        [...new Set(qs)].map((q) => ({ question: q.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim(), answer: '' })),
        null,
        2
      );
      try {
        await navigator.clipboard.writeText(json);
        ev.target.textContent = 'Copiado ✔ (pégalo en "answers")';
      } catch (_) {
        ev.target.textContent = 'No se pudo copiar';
      }
    };
  }

  WD.panel = { ensure, showButton, setBusy, render, clearMarks };
})();
