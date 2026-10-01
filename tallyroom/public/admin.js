'use strict';
const AMEN = { power220: '220V', ac: 'Clima', chairs: 'Sedie', desk: 'Tavolo', clean: 'Pulizia', light: 'Luci', wifi: 'Wi-Fi', wc: 'Bagno' };
const $app = document.getElementById('app');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let pw = sessionStorage.getItem('tr_admin') || '';

async function api(path, method = 'GET', body) {
  const r = await fetch('/api/admin' + path, {
    method,
    headers: { authorization: 'Bearer ' + pw, ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const d = await r.json().catch(() => ({}));
  if (r.status === 401) { sessionStorage.removeItem('tr_admin'); pw = ''; login('Password errata'); throw new Error('401'); }
  if (!r.ok) throw new Error(d.error || 'Errore');
  return d;
}

function login(msg = '') {
  $app.innerHTML = `<form class="card" id="lf"><h1>Accesso admin</h1>${msg ? `<div class="msg err">${esc(msg)}</div>` : ''}
    <input id="pw" type="password" placeholder="Password" autocomplete="current-password" style="width:100%;padding:13px;border:1px solid var(--line);border-radius:10px;font:inherit">
    <button class="btn block" style="margin-top:12px">Entra</button></form>`;
  document.getElementById('lf').onsubmit = (e) => { e.preventDefault(); pw = document.getElementById('pw').value; sessionStorage.setItem('tr_admin', pw); load(); };
}

async function load() {
  let q;
  try { q = await api('/queue'); } catch { return; }
  $app.innerHTML = `
    <div class="card"><h2>Da approvare (${q.reviews.length})</h2>
    ${q.reviews.map((r) => `
      <div class="rev" data-id="${r.id}">
        <b>${esc(r.ship_name)}</b> ${r.ship_status === 'pending' ? '<span class="badge">NAVE NUOVA</span>' : ''}
        <div class="stars">${'★'.repeat(r.rating)}</div>
        <div class="muted">${Object.entries(AMEN).map(([k, l]) => (r.amenities[k] ? '✔ ' : '✘ ') + l).join(' · ')}</div>
        ${r.comment ? `<p>${esc(r.comment)}</p>` : ''}
        ${r.photo_ids ? `<div class="thumbs">${r.photo_ids.split(',').map((p) => `<img data-photo="${p}" alt="">`).join('')}</div>` : ''}
        <div class="row" style="margin-top:10px"><button class="btn ok" data-a="approve">Approva</button><button class="btn bad" data-a="reject">Rifiuta</button></div>
      </div>`).join('') || '<p class="muted">Niente in coda 🎉</p>'}
    </div>
    <div class="card"><h2>Segnalazioni (${q.reports.length})</h2>
    ${q.reports.map((r) => `
      <div class="rev" data-rep="${r.id}" data-id="${r.review_id}">
        <b>${esc(r.ship_name)}</b> <span class="stars">${'★'.repeat(r.rating)}</span>
        <p>${esc(r.comment) || '<i>senza testo</i>'}</p><p class="muted">Motivo: ${esc(r.reason) || '—'}</p>
        <div class="row"><button class="btn bad" data-a="delete">Elimina recensione</button><button class="btn sec" data-a="dismiss">Ignora</button></div>
      </div>`).join('') || '<p class="muted">Nessuna segnalazione.</p>'}
    </div>
    <div class="card"><h2>Importa lista navi</h2>
      <p class="muted">Una nave per riga: <code>nome;voto</code> (voto da 1 a 5, anche decimale). Navi già presenti vengono aggiornate. Ora nel database: ${q.ships} navi.</p>
      <textarea id="csv" rows="6" placeholder="GRIMALDI EUROPE;4&#10;EXCELSIOR;2.5" style="width:100%;padding:10px;border:1px solid var(--line);border-radius:10px;font:inherit"></textarea>
      <input type="file" id="csvf" accept=".csv,.txt" style="margin:8px 0">
      <button class="btn block" id="imp">Importa</button><div id="impmsg" style="margin-top:8px"></div>
    </div>`;
  $app.querySelectorAll('[data-a]').forEach((b) => b.addEventListener('click', async () => {
    const box = b.closest('[data-id]'), id = box.dataset.id, a = b.dataset.a;
    if (a === 'delete' && !confirm('Eliminare definitivamente la recensione?')) return;
    if (a === 'dismiss') await api(`/reports/${box.dataset.rep}/dismiss`, 'POST');
    else {
      await api(`/reviews/${id}/${a}`, 'POST');
      if (box.dataset.rep) await api(`/reports/${box.dataset.rep}/dismiss`, 'POST').catch(() => {});
    }
    load();
  }));
  $app.querySelectorAll('img[data-photo]').forEach(async (img) => {
    const r = await fetch('/api/photos/' + img.dataset.photo, { headers: { authorization: 'Bearer ' + pw } });
    if (r.ok) img.src = URL.createObjectURL(await r.blob());
  });
  document.getElementById('csvf').onchange = async (e) => { document.getElementById('csv').value = await e.target.files[0].text(); };
  document.getElementById('imp').onclick = async () => {
    const m = document.getElementById('impmsg');
    try { const d = await api('/import', 'POST', { csv: document.getElementById('csv').value }); m.innerHTML = `<div class="msg">Importate ${d.imported} navi.</div>`; setTimeout(load, 1200); }
    catch (e) { m.innerHTML = `<div class="msg err">${esc(e.message)}</div>`; }
  };
}
pw ? load() : login();
