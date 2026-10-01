'use strict';
const AMEN = { power220: '220V', ac: 'AC', chairs: 'Chairs', desk: 'Desk', clean: 'Clean', light: 'Light', wc: 'WC' };
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
  if (r.status === 503) { login(d.error); throw new Error('503'); }
  if (r.status === 401) { sessionStorage.removeItem('tr_admin'); pw = ''; login('Wrong password'); throw new Error('401'); }
  if (!r.ok) throw new Error(d.error || 'Error');
  return d;
}

function login(msg = '') {
  $app.innerHTML = `<form class="card" id="lf"><h1 class="t">Admin login</h1>${msg ? `<div class="msg err">${esc(msg)}</div>` : ''}
    <input id="pw" type="password" placeholder="Password" autocomplete="current-password" style="width:100%;padding:13px;border:1px solid var(--line);border-radius:10px;font:inherit">
    <button class="btn block" style="margin-top:12px">Log in</button></form>`;
  document.getElementById('lf').onsubmit = (e) => { e.preventDefault(); pw = document.getElementById('pw').value; sessionStorage.setItem('tr_admin', pw); load(); };
}

async function load() {
  let q;
  try { q = await api('/queue'); } catch { return; }
  $app.innerHTML = `
    <div class="card"><h2>Pending approval (${q.reviews.length})</h2>
    ${q.reviews.map((r) => `
      <div class="rev" data-id="${r.id}">
        <b>${esc(r.ship_name)}</b> ${r.ship_status === 'pending' ? '<span class="badge">NEW SHIP</span>' : ''}
        ${r.has_tally === 0 ? '<div class="npchip">✕ TALLY ROOM NOT PRESENT</div>' : `<div class="stars">${'★'.repeat(r.rating)}</div>
        <div class="muted">${Object.entries(AMEN).map(([k, l]) => (r.amenities[k] === 'y' ? '✔ ' : r.amenities[k] === 'n' ? '✘ ' : '? ') + l).join(' · ')}${r.capacity ? ' · Capacity: ' + ['', '1-2', '3-5', '6-10', '10+'][r.capacity] + ' people' : ''}</div>`}
        ${r.comment ? `<p>${esc(r.comment)}</p>` : ''}
        ${r.photo_ids ? `<div class="thumbs">${r.photo_ids.split(',').map((p) => `<img data-photo="${p}" alt="">`).join('')}</div>` : ''}
        <div class="row" style="margin-top:10px"><button class="btn ok" data-a="approve">Approve</button><button class="btn bad" data-a="reject">Reject</button></div>
      </div>`).join('') || '<p class="muted">Nothing in the queue 🎉</p>'}
    </div>
    <div class="card"><h2>Reports (${q.reports.length})</h2>
    ${q.reports.map((r) => `
      <div class="rev" data-rep="${r.id}" data-id="${r.review_id}">
        <b>${esc(r.ship_name)}</b> <span class="stars">${'★'.repeat(r.rating)}</span>
        <p>${esc(r.comment) || '<i>no text</i>'}</p><p class="muted">Reason: ${esc(r.reason) || '—'}</p>
        <div class="row"><button class="btn bad" data-a="delete">Delete review</button><button class="btn sec" data-a="dismiss">Dismiss</button></div>
      </div>`).join('') || '<p class="muted">No reports.</p>'}
    </div>
    <div class="card"><h2>Backup</h2>
      <p class="muted">A full backup of the database is emailed to you every 7 days. You can also download one now (photos are not included).</p>
      <button class="btn block" id="bk" type="button">Download backup now</button>
    </div>
    <div class="card"><h2>Home page news</h2>
      <p class="muted">Checks every news source used on the home page and shows which ones respond.</p>
      <button class="btn block" id="nw" type="button">Check news sources</button>
      <div id="nwr" style="margin-top:10px"></div>
    </div>
    <div class="card"><h2>Manage vessels</h2>
      <p class="muted">Search a vessel to delete it together with all its reviews and photos. This cannot be undone.</p>
      <input id="vq" type="text" placeholder="Search vessel (2+ letters), or leave empty for the newest" autocomplete="off" style="width:100%;padding:13px;border:1.5px solid var(--line);border-radius:12px;font:inherit;background:var(--card);color:var(--ink)">
      <div id="vlist" style="margin-top:6px"></div>
    </div>
    <div class="card"><h2>Import ship list</h2>
      <p class="muted">One ship per line: <code>name;rating</code> (rating 1 to 5, decimals allowed). Existing ships are updated. Ships in the database now: ${q.ships}.</p>
      <textarea id="csv" rows="6" placeholder="GRIMALDI EUROPE;4&#10;EXCELSIOR;2.5" style="width:100%;padding:10px;border:1px solid var(--line);border-radius:10px;font:inherit"></textarea>
      <input type="file" id="csvf" accept=".csv,.txt" style="margin:8px 0">
      <button class="btn block" id="imp">Import</button><div id="impmsg" style="margin-top:8px"></div>
    </div>`;
  $app.querySelectorAll('[data-a]').forEach((b) => b.addEventListener('click', async () => {
    const box = b.closest('[data-id]'), id = box.dataset.id, a = b.dataset.a;
    if (a === 'delete' && !confirm('Permanently delete this review?')) return;
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
  document.getElementById('nw').onclick = async () => {
    const b = document.getElementById('nw'), out = document.getElementById('nwr'); b.disabled = true; out.textContent = 'Checking…';
    try {
      const d = await api('/news-check');
      out.innerHTML = d.feeds.map((f) => `<div class="nrow ${f.error ? 'bad' : 'ok'}"><b>${esc(f.source)}</b><small>${f.error ? esc(f.error) + (f.preview ? ' · ' + esc(f.preview) : '') : f.items + ' headlines'}</small></div>`).join('')
        + `<p class="muted" style="margin-top:8px">${d.picked.length ? 'Shown on the home page:' : 'Nothing to show on the home page right now.'}</p>`
        + d.picked.map((n) => `<div class="nrow ok"><b>${esc(n.title)}</b><small>${esc(n.source)}</small></div>`).join('');
    } catch (e) { out.textContent = e.message; } finally { b.disabled = false; }
  };
  document.getElementById('bk').onclick = async () => {
    const b = document.getElementById('bk'); b.disabled = true;
    try {
      const r = await fetch('/api/admin/backup', { headers: { authorization: 'Bearer ' + pw } });
      if (!r.ok) throw new Error('Backup failed');
      const a = document.createElement('a'); a.href = URL.createObjectURL(await r.blob());
      a.download = 'tallyrooms-backup-' + new Date().toISOString().slice(0, 10) + '.sql'; document.body.append(a); a.click(); a.remove();
    } catch (e) { alert(e.message); } finally { b.disabled = false; }
  };
  const vq = document.getElementById('vq'), vlist = document.getElementById('vlist');
  async function loadShips() {
    try {
      const { ships } = await api('/ships?q=' + encodeURIComponent(vq.value.trim()));
      vlist.innerHTML = ships.map((s) => `
        <div class="vrow">
          <span class="vn"><b>${esc(s.name)}</b><small>${s.reviews} review${s.reviews === 1 ? '' : 's'}${s.pending ? `, ${s.pending} pending` : ''}${s.status === 'pending' ? ' · not published' : ''}</small></span>
          <button class="btn bad sm" type="button" data-del="${s.id}" data-name="${esc(s.name)}" data-n="${s.reviews}">Delete</button>
        </div>`).join('') || '<p class="muted">No vessel found.</p>';
    } catch { /* 401 is handled by api() */ }
  }
  let vt; vq.addEventListener('input', () => { clearTimeout(vt); vt = setTimeout(loadShips, 250); });
  vlist.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-del]'); if (!b) return;
    if (!confirm(`Delete "${b.dataset.name}" and its ${b.dataset.n} review(s), photos included?\n\nThis cannot be undone.`)) return;
    b.disabled = true;
    try { await api(`/ships/${b.dataset.del}/delete`, 'POST'); await loadShips(); } catch (er) { alert(er.message); b.disabled = false; }
  });
  loadShips();
  document.getElementById('csvf').onchange = async (e) => { document.getElementById('csv').value = await e.target.files[0].text(); };
  document.getElementById('imp').onclick = async () => {
    const m = document.getElementById('impmsg');
    try { const d = await api('/import', 'POST', { csv: document.getElementById('csv').value }); m.innerHTML = `<div class="msg">Imported ${d.imported} ships.</div>`; setTimeout(load, 1200); }
    catch (e) { m.innerHTML = `<div class="msg err">${esc(e.message)}</div>`; }
  };
}
pw ? load() : login();
