'use strict';
const AMEN = [
  ['power220', 'Power outlets'], ['ac', 'Air conditioning'], ['chairs', 'Chairs'], ['desk', 'Desk / table'],
  ['clean', 'Cleanliness'], ['light', 'Good lighting'], ['wifi', 'Wi-Fi'], ['wc', 'Toilet nearby'],
];
const $app = document.getElementById('app');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const stars = (v) => { const n = Math.round(v || 0); return `<span class="stars">${'★'.repeat(n)}<span class="off">${'★'.repeat(5 - n)}</span></span>`; };
const fmtDate = (t) => new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const api = async (path, opts) => {
  const r = await fetch('/api' + path, opts);
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || 'Network error');
  return d;
};
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

// ---------- Home ----------
async function home() {
  $app.innerHTML = `
    <div class="card">
      <h1>Enter ship name</h1>
      <input id="q" type="text" placeholder="Ship name…" autocomplete="off" autofocus>
      <div id="results"></div>
    </div>
    <div class="card"><h2>Top rated tally rooms</h2><div id="top" class="muted">Loading…</div></div>`;
  const q = document.getElementById('q'), res = document.getElementById('results');
  const item = (s) => {
    const r = s.avg_rating ?? s.seed_rating;
    return `<a class="ship-item" href="#/ship/${s.id}"><span>${esc(s.name)}<br><small>${s.review_count} reviews</small></span>${r ? stars(r) : '<small>no rating</small>'}</a>`;
  };
  const search = debounce(async () => {
    const v = q.value.trim();
    if (v.length < 2) { res.innerHTML = ''; return; }
    const { ships } = await api('/ships?q=' + encodeURIComponent(v)).catch(() => ({ ships: [] }));
    res.innerHTML = (ships.map(item).join('') || '<p class="muted">No ship found with this name.</p>') +
      `<a class="btn sec block" style="margin-top:12px" href="#/new?name=${encodeURIComponent(v)}">➕ Add "${esc(v)}"</a>`;
  }, 250);
  q.addEventListener('input', search);
  api('/top').then(({ ships }) => {
    document.getElementById('top').innerHTML = ships.length ? ships.map(item).join('') : 'No ships yet.';
  }).catch(() => {});
}

// ---------- Scheda nave ----------
async function ship(id) {
  $app.innerHTML = '<p class="muted">Loading…</p>';
  let s;
  try { s = await api('/ships/' + id); } catch (e) { $app.innerHTML = `<div class="card">${esc(e.message)}</div>`; return; }
  const amen = AMEN.map(([k, label]) => {
    const p = s.amenities[k];
    const cls = p == null ? 'u' : p >= 0.5 ? 'y' : 'n';
    return `<div class="${cls}">${label}${p == null ? '' : `<span class="pct">${Math.round(p * 100)}%</span>`}</div>`;
  }).join('');
  $app.innerHTML = `
    <a href="#/" class="link">← Search another ship</a>
    <div class="card" style="margin-top:10px">
      <h1>${esc(s.name)}</h1>
      <div class="row">
        <div>${s.rating ? `<span class="big">${s.rating.toFixed(1)}</span> ${stars(s.rating)}` : '<span class="muted">No rating</span>'}</div>
        <span class="badge">${s.review_count} reviews</span>
      </div>
      <p class="muted">${s.last_update ? `Last updated: ${fmtDate(s.last_update)}` : (s.seed_rating ? 'Initial rating only, no details yet.' : '')}
      ${s.review_count ? '<br>Rating and amenities are based on the latest 5 reviews.' : ''}</p>
      <a class="btn block" href="#/ship/${s.id}/update">✏️ Update this tally room</a>
    </div>
    <div class="card"><h2>Amenities</h2><div class="amen">${amen}</div></div>
    ${s.photos.length ? `<div class="card"><h2>Photos</h2><div class="photos">${s.photos.map((p) => `<img loading="lazy" src="/api/photos/${p.id}" data-full="/api/photos/${p.id}" alt="Tally room photo">`).join('')}</div></div>` : ''}
    <div class="card"><h2>Update history</h2>
      ${s.reviews.length ? s.reviews.map((r) => `
        <div class="rev">
          <div class="row">${stars(r.rating)}<span class="muted">${fmtDate(r.created_at)}</span></div>
          <div class="muted">${AMEN.filter(([k]) => r.amenities[k]).map(([, l]) => '✔ ' + l).join(' · ') || 'No amenities reported'}</div>
          ${r.comment ? `<p>${esc(r.comment)}</p>` : ''}
          <button class="link" data-report="${r.id}" style="background:none;border:0;color:var(--mut);font-size:.78rem;padding:0;cursor:pointer">Report</button>
        </div>`).join('') : '<p class="muted">No detailed reviews yet. Be the first!</p>'}
    </div>`;
  $app.querySelectorAll('[data-full]').forEach((img) => img.addEventListener('click', () => {
    const lb = document.createElement('div'); lb.className = 'lightbox';
    lb.innerHTML = `<img src="${img.dataset.full}" alt="">`; lb.onclick = () => lb.remove(); document.body.append(lb);
  }));
  $app.querySelectorAll('[data-report]').forEach((b) => b.addEventListener('click', async () => {
    const reason = prompt('Why are you reporting this review?'); if (reason === null) return;
    await api(`/reviews/${b.dataset.report}/report`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ reason }) }).catch(() => {});
    b.textContent = 'Reported, thank you'; b.disabled = true;
  }));
}

// ---------- Form recensione (nuova nave o aggiornamento) ----------
async function compress(file, max = 1280) {
  const bmp = await createImageBitmap(file).catch(() => null);
  if (!bmp) throw new Error('Unreadable image');
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  let blob = await new Promise((r) => c.toBlob(r, 'image/webp', 0.8));
  if (!blob || blob.type !== 'image/webp') blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.8));
  return blob;
}

async function form({ shipId, name }) {
  let prev = {};
  if (shipId) {
    try { const s = await api('/ships/' + shipId); name = s.name; AMEN.forEach(([k]) => { prev[k] = s.amenities[k] != null && s.amenities[k] >= 0.5; }); }
    catch (e) { $app.innerHTML = `<div class="card">${esc(e.message)}</div>`; return; }
  }
  let rating = 0; const photos = [];
  $app.innerHTML = `
    <a href="#/${shipId ? 'ship/' + shipId : ''}" class="link">← Back</a>
    <form class="card" id="f" style="margin-top:10px" novalidate>
      <h1>${shipId ? 'Update this tally room' : 'Add a ship'}</h1>
      ${shipId ? `<p class="muted">Check how the tally room of <b>${esc(name)}</b> is today. The boxes are pre-filled with the current status: change whatever is different.</p>` :
        `<label class="l" for="sn">Ship name</label><input id="sn" type="text" value="${esc(name || '')}" maxlength="60" required>`}
      <label class="l">Overall rating</label>
      <div class="rate-in" id="rate">${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-n="${n}" aria-label="${n} stars">★</button>`).join('')}</div>
      <label class="l">What is there / how is it</label>
      ${AMEN.map(([k, l]) => `<label class="chk"><input type="checkbox" name="${k}" ${prev[k] ? 'checked' : ''}> ${l}</label>`).join('')}
      <label class="l" for="cm">Notes (optional)</label>
      <textarea id="cm" rows="3" maxlength="800" placeholder="E.g. dirty, AC not working, key from the second officer…"></textarea>
      <label class="l">Photos (max 3)</label>
      <input id="ph" type="file" accept="image/*" multiple>
      <div class="thumbs" id="th"></div>
      <input class="hp" type="text" name="website" tabindex="-1" autocomplete="off">
      <div id="msg"></div>
      <button class="btn block" id="go" style="margin-top:16px" type="submit">Submit review</button>
      <p class="muted">Your review is anonymous and will appear after approval.</p>
    </form>`;
  const rateBtns = [...document.querySelectorAll('#rate button')];
  rateBtns.forEach((b) => b.addEventListener('click', () => { rating = +b.dataset.n; rateBtns.forEach((x) => x.classList.toggle('on', +x.dataset.n <= rating)); }));
  const th = document.getElementById('th');
  document.getElementById('ph').addEventListener('change', async (e) => {
    photos.length = 0; th.innerHTML = '';
    for (const f of [...e.target.files].slice(0, 3)) {
      try { const b = await compress(f); photos.push(b); const i = new Image(); i.src = URL.createObjectURL(b); th.append(i); }
      catch { /* ignora file non leggibili */ }
    }
  });
  document.getElementById('f').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('msg'), go = document.getElementById('go');
    const fail = (t) => { msg.innerHTML = `<div class="msg err">${esc(t)}</div>`; };
    if (!rating) return fail('Please choose a rating from 1 to 5 stars.');
    const fd = new FormData();
    if (shipId) fd.append('ship_id', shipId);
    else { const n = document.getElementById('sn').value.trim(); if (n.length < 2) return fail('Please enter the ship name.'); fd.append('ship_name', n); }
    fd.append('rating', rating);
    fd.append('amenities', JSON.stringify(Object.fromEntries(AMEN.map(([k]) => [k, e.target.elements[k].checked]))));
    fd.append('comment', document.getElementById('cm').value);
    fd.append('website', e.target.elements.website.value);
    photos.forEach((b, i) => fd.append('photos', b, `foto${i}.${b.type === 'image/webp' ? 'webp' : 'jpg'}`));
    go.disabled = true; go.textContent = 'Sending…';
    try {
      await api('/reviews', { method: 'POST', body: fd });
      $app.innerHTML = `<div class="card"><div class="msg">✅ Thank you! Your review has been sent and will appear after approval.</div><a class="btn block" href="#/">Back to search</a></div>`;
    } catch (er) { fail(er.message); go.disabled = false; go.textContent = 'Submit review'; }
  });
}

// ---------- Router ----------
function route() {
  const h = location.hash.replace(/^#/, '') || '/';
  let m;
  window.scrollTo(0, 0);
  if ((m = h.match(/^\/ship\/(\d+)\/update$/))) return form({ shipId: +m[1] });
  if ((m = h.match(/^\/ship\/(\d+)$/))) return ship(+m[1]);
  if (h.startsWith("/new")) return form({ name: new URLSearchParams(h.split('?')[1] || '').get("name") || '' });
  return home();
}
addEventListener('hashchange', route);
route();
