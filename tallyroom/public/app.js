'use strict';

// ---------- Icons (inline SVG, Lucide-style) ----------
const P = {
  power220: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
  ac: '<path d="M12 2v20M2 12h20M4.9 4.9l14.2 14.2M19.1 4.9 4.9 19.1"/><path d="m9.5 3.5 2.5 2 2.5-2M9.5 20.5l2.5-2 2.5 2M3.5 9.5l2 2.5-2 2.5M20.5 9.5l-2 2.5 2 2.5"/>',
  chairs: '<path d="M19 9V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v3"/><path d="M3 16a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5a2 2 0 0 0-4 0v2a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1v-2a2 2 0 0 0-4 0z"/><path d="M5 18v2M19 18v2"/>',
  desk: '<rect x="2" y="6" width="20" height="4" rx="1.5"/><path d="M5 10v10M19 10v10M9 14h6"/>',
  clean: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 3v4M21 5h-4M5 17v4M7 19H3"/>',
  light: '<path d="M9 18h6M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1V17h6v-.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2z"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  wifi: '<path d="M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01"/>',
  wc: '<path d="M13 4.56v16.16a1 1 0 0 1-1.24.97L5 20V5.56a2 2 0 0 1 1.5-1.94l4-1A2 2 0 0 1 13 4.56z"/><path d="M13 4h3a2 2 0 0 1 2 2v14M2 20h3M13 20h9M10 12v.01"/>',
  hardhat: '<path d="M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5"/><path d="M14 6a6 6 0 0 1 6 6v3"/><path d="M4 15v-3a6 6 0 0 1 6-6"/><rect x="2" y="15" width="20" height="4" rx="1"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  ship: '<path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1 .6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M19.4 14.9 21 9l-9-3-9 3 1.6 5.9"/><path d="M12 6V2M8 8.5V12M16 8.5V12"/>',
  anchor: '<circle cx="12" cy="5" r="2.5"/><path d="M12 7.5V21M7 11h10M4 15a8 8 0 0 0 16 0"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  back: '<path d="m15 18-6-6 6-6"/>',
  camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z"/><circle cx="12" cy="13" r="3"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  trophy: '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 0 0 12 0z"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  history: '<path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><path d="M12 7v5l4 2"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',
};
const icon = (k) => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${P[k] || ''}</svg>`;
const star = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/></svg>';

const AMEN = [
  ['power220', '220V power'], ['ac', 'Air conditioning'], ['chairs', 'Chairs'], ['desk', 'Desk / table'],
  ['clean', 'Cleanliness'], ['light', 'Good lighting'], ['wc', 'Toilet nearby'],
];
// approximate capacity buckets (people that fit inside)
const CAP = [null, '1-2', '3-5', '6-10', '10+'];
const CAP_NAME = [null, 'Tiny', 'Small', 'Medium', 'Large'];

document.getElementById('brand').innerHTML = `${icon('anchor')}Tally Room <span>Reviews</span>`;
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
const pillNP = '<span class="pill np">' + '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/></svg>NOT PRESENT</span>';
const pill = (r) => (r ? `<span class="pill">${star}${Number(r).toFixed(1)}</span>` : '<span class="pill none">No rating</span>');


// ---------- Hero artwork: container ship (generated, no external assets) ----------
function wave(y, amp) {
  let d = `M-400 ${y}`;
  for (let x = -400; x < 800; x += 100) d += `c25 0 25 ${amp} 50 ${amp}s25-${amp} 50-${amp}`;
  return d + 'V400H-400z';
}
function shipArt() {
  const tones = ['#ffffff', '#e4f2ff', '#cdebff', '#a9d4fa', '#7fb8f2', '#ffffff', '#d7ecff', '#ffd166'];
  let boxes = '', seed = 7;
  const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  const cw = 13, ch = 7.2, x0 = 112, x1 = 330;
  for (let x = x0, i = 0; x + cw <= x1; x += cw + 1, i++) {
    const mid = 1 - Math.abs((x - (x0 + x1) / 2) / ((x1 - x0) / 2));
    const levels = 3 + Math.round(mid * 2 + rnd());
    for (let l = 0; l < levels; l++) {
      const t = tones[Math.floor(rnd() * tones.length)];
      boxes += `<rect x="${x}" y="${72 - (l + 1) * (ch + .8)}" width="${cw}" height="${ch}" rx="1" fill="${t}" opacity="${t === '#ffd166' ? 0.95 : 0.92}"/>`;
    }
  }
  return `
  <svg class="art" viewBox="0 0 380 150" role="img" aria-label="Container ship at sea">
    <defs><linearGradient id="wf" gradientUnits="userSpaceOnUse" x1="0" y1="104" x2="0" y2="150"><stop offset="0" stop-color="#fff" stop-opacity=".3"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient><linearGradient id="wf2" gradientUnits="userSpaceOnUse" x1="0" y1="116" x2="0" y2="150"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>
    <g class="ship">
      <g>${boxes}</g>
      <path d="M28 72h318l-12 20q-3 6-10 6H46q-12 0-16-10z" fill="#ffffff"/>
      <path d="M32 90h310l-8 8H48q-10 0-16-8z" fill="#083a78" opacity=".55"/>
      <rect x="40" y="38" width="48" height="34" rx="2" fill="#f4f9ff"/>
      <rect x="36" y="28" width="56" height="11" rx="2" fill="#ffffff"/>
      <rect x="40" y="31" width="48" height="4" rx="1" fill="#126FD5" opacity=".75"/>
      <g fill="#126FD5" opacity=".55"><rect x="44" y="46" width="40" height="3"/><rect x="44" y="54" width="40" height="3"/><rect x="44" y="62" width="40" height="3"/></g>
      <rect x="96" y="22" width="12" height="50" rx="2" fill="#cdebff"/><rect x="96" y="22" width="12" height="7" rx="2" fill="#126FD5" opacity=".7"/>
      <path d="M62 28V14M54 18h16" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>
    </g>
    <path class="w1" d="${wave(104, 8)}" fill="url(#wf)"/>
    <path class="w2" d="${wave(116, 8)}" fill="url(#wf2)"/>
  </svg>`;
}

// ---------- Home ----------
async function home() {
  $app.innerHTML = `
    <section class="hero">
      ${shipArt()}
      <h1>Find your <b>Tally Room</b></h1>
      <p>Real reviews from port workers: ratings, photos and what you will find on board.</p>
      <svg class="wave" viewBox="0 0 1200 34" preserveAspectRatio="none" aria-hidden="true"><path d="M0 34V14c150 20 300 20 450 6s300-20 450-6 200 16 300 6v14z"/></svg>
    </section>
    <div class="searchbox">
      <label class="search" role="search">${icon('search')}<input id="q" type="search" name="vsl-q" placeholder="Enter Vessel Name" aria-label="Vessel name" autocomplete="off" autocorrect="off" autocapitalize="characters" spellcheck="false" enterkeyhint="search" inputmode="search" data-lpignore="true" data-1p-ignore data-form-type="other"></label>
      <div class="card results" id="results" hidden></div>
    </div>
    <div class="card"><h2>${icon('trophy')} Top rated Tally Rooms</h2><div id="top" class="muted">Loading…</div></div>
    <div class="safety" role="note">${icon('hardhat')}<span>SAFETY FIRST</span>${icon('hardhat')}</div>`;
  const q = document.getElementById('q'), res = document.getElementById('results');
  const item = (s, i) => `
    <a class="ship-item" href="#/ship/${s.id}">
      ${i != null ? `<span class="rank">${i + 1}</span>` : ''}
      <span class="ship-ico">${icon('ship')}</span>
      <span class="nm"><b>${esc(s.name)}</b><small>${s.review_count} ${s.review_count === 1 ? 'review' : 'reviews'}</small></span>
      ${s.not_present ? pillNP : pill(s.avg_rating ?? s.seed_rating)}
    </a>`;
  const search = debounce(async () => {
    const v = q.value.trim();
    if (v.length < 2) { res.hidden = true; res.innerHTML = ''; return; }
    const { ships } = await api('/ships?q=' + encodeURIComponent(v)).catch(() => ({ ships: [] }));
    res.hidden = false;
    res.innerHTML = (ships.map((s) => item(s)).join('') || '<p class="empty">No vessel found with this name.</p>') +
      `<a class="btn sec block" style="margin-top:12px" href="#/new?name=${encodeURIComponent(v)}">${icon('plus')} Add "${esc(v.toUpperCase())}"</a>`;
  }, 250);
  q.addEventListener('input', search);
  api('/top').then(({ ships }) => {
    document.getElementById('top').innerHTML = ships.length ? ships.map((s, i) => item(s, i)).join('') : '<p class="empty">No ships yet.</p>';
  }).catch(() => { document.getElementById('top').textContent = ''; });
}

// ---------- Ship page ----------
async function ship(id) {
  $app.innerHTML = '<p class="muted" style="padding-top:20px">Loading…</p>';
  let s;
  try { s = await api('/ships/' + id); } catch (e) { $app.innerHTML = `<a class="back" href="#/">${icon('back')} Back</a><div class="card">${esc(e.message)}</div>`; return; }
  const amen = AMEN.map(([k, label]) => {
    const v = s.amenities[k];                     // { yes, no } or null when nobody answered
    let cls = 'u', sub = 'Unknown or not available';
    if (v && v.yes > v.no) { cls = 'y'; sub = `${Math.round((100 * v.yes) / (v.yes + v.no))}% say yes`; }
    else if (v && v.no > v.yes) { cls = 'n'; sub = 'Not available'; }          // red only when someone answered NO
    else if (v) sub = 'Mixed reports';
    return `<div class="am ${cls}"><span class="ic">${icon(cls === 'n' ? 'x' : k)}</span><span class="tx"><span>${label}</span><small>${sub}</small></span></div>`;
  }).join('') + `<div class="am ${s.capacity ? 'y' : 'u'}"><span class="ic">${icon('users')}</span><span class="tx"><span>Capacity</span><small>${s.capacity ? `${CAP_NAME[s.capacity]}: about ${CAP[s.capacity]} people` : 'Unknown or not available'}</small></span></div>`;
  $app.innerHTML = `
    <a class="back" href="#/">${icon('back')} Search another vessel</a>
    <div class="card shiphead">
      <span class="shipbadge" aria-hidden="true">${icon('ship')}</span>
      <h1>${esc(s.name)}</h1>
      <div class="score">
        ${!s.tally_present
          ? `<span class="big x">${icon('x')}</span><div><b class="npt">NOT PRESENT</b><br><span class="badge">${s.review_count} ${s.review_count === 1 ? 'review' : 'reviews'}</span></div>`
          : s.rating ? `<span class="big">${s.rating.toFixed(1)}</span><div>${stars(s.rating)}<br><span class="badge">${s.review_count} ${s.review_count === 1 ? 'review' : 'reviews'}</span></div>` : '<span class="muted">No rating yet</span>'}
      </div>
      <p class="muted" style="margin:12px 0 0">${s.last_update ? `${icon('clock')} Last updated ${fmtDate(s.last_update)}` : (s.seed_rating ? 'Initial rating only, no details yet.' : '')}
      ${s.review_count ? '<br>Based on the latest 5 reviews.' : ''}</p>
      <a class="btn block" href="#/ship/${s.id}/update">${icon('edit')} Update this Tally Room</a>
    </div>
    ${s.tally_present
      ? `<div class="card"><h2>${icon('check')} Amenities</h2><div class="amen">${amen}</div></div>`
      : `<div class="card"><h2>${icon('x')} No Tally Room</h2><p class="muted" style="margin:0">Most recent reports say this vessel does not have a Tally Room. If that has changed, use <b>Update this Tally Room</b> above.</p></div>`}
    ${s.photos.length ? `<div class="card"><h2>${icon('image')} Photos</h2><div class="photos">${s.photos.map((p) => `<img loading="lazy" src="/api/photos/${p.id}" data-full="/api/photos/${p.id}" alt="Tally Room photo">`).join('')}</div></div>` : ''}
    <div class="card"><h2>${icon('history')} Update history</h2>
      ${s.reviews.length ? s.reviews.map((r) => `
        <div class="rev">
          <div class="row">${r.has_tally ? stars(r.rating) : `<span class="npchip">${icon('x')} Tally Room not present</span>`}<span class="muted">${fmtDate(r.created_at)}</span></div>
          ${r.has_tally ? `<div class="mini">${AMEN.filter(([k]) => r.amenities[k] === 'y').map(([k, l]) => `<span>${icon(k)}${l}</span>`).join('')}${AMEN.filter(([k]) => r.amenities[k] === 'n').map(([k, l]) => `<span class="no">${icon('x')}${l}</span>`).join('')}${r.capacity ? `<span>${icon('users')}${CAP[r.capacity]} people</span>` : ''}${!AMEN.some(([k]) => r.amenities[k]) && !r.capacity ? '<span style="background:var(--bg);color:var(--mut)">No amenities reported</span>' : ''}</div>` : ''}
          ${r.comment ? `<p>${esc(r.comment)}</p>` : ''}
          <button class="linkbtn" data-report="${r.id}">Report</button>
        </div>`).join('') : '<p class="empty">No detailed reviews yet. Be the first!</p>'}
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

// ---------- Review form (new vessel or update) ----------
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

const RATE_TXT = ['', 'Poor', 'Below average', 'Okay', 'Good', 'Excellent'];

async function form({ shipId, name }) {
  const prev = {};            // pre-filled answers when updating an existing Tally Room
  if (shipId) {
    try { const s = await api('/ships/' + shipId); name = s.name; AMEN.forEach(([k]) => { const v = s.amenities[k]; if (v && v.yes > v.no) prev[k] = 'y'; else if (v && v.no > v.yes) prev[k] = 'n'; }); }
    catch (e) { $app.innerHTML = `<a class="back" href="#/">${icon('back')} Back</a><div class="card">${esc(e.message)}</div>`; return; }
  }
  let rating = 0, hasTally = null, capacity = 0; const photos = []; const amenState = { ...prev };
  $app.innerHTML = `
    <a href="#/${shipId ? 'ship/' + shipId : ''}" class="back">${icon('back')} Back</a>
    <form class="card" id="f" novalidate autocomplete="off">
      <h1 class="t">${shipId ? 'Update this Tally Room' : 'Add a vessel'}</h1>
      ${shipId ? `<p class="muted">Check how the Tally Room of <b>${esc(name)}</b> is today. The boxes are pre-filled with the current status: change whatever is different.</p>` :
        `<label class="l" for="sn">Vessel name</label><input id="sn" type="search" name="vsl-name" autocomplete="off" autocorrect="off" spellcheck="false" enterkeyhint="done" data-lpignore="true" data-1p-ignore data-form-type="other" value="${esc((name || '').toUpperCase())}" maxlength="60" autocapitalize="characters" required>`}
      <label class="l">Is there a Tally Room on board?</label>
      <div class="yn" id="yn" role="radiogroup" aria-label="Tally Room present">
        <button type="button" class="yes" data-v="1" role="radio" aria-checked="false">${icon('check')} YES</button>
        <button type="button" class="no" data-v="0" role="radio" aria-checked="false">${icon('x')} NO</button>
      </div>
      <div id="details" hidden>
      <label class="l">Overall rating</label>
      <div class="rate-in" id="rate">${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-n="${n}" aria-label="${n} stars">★</button>`).join('')}</div>
      <div class="rate-lbl" id="rl"></div>
      <label class="l">What is there / how is it</label>
      <div class="arows">${AMEN.map(([k, l]) => `<div class="arow" data-k="${k}"><span class="ic">${icon(k)}</span><span class="lbl">${l}</span><span class="seg"><button type="button" class="yes" data-v="y" aria-pressed="false">YES</button><button type="button" class="no" data-v="n" aria-pressed="false">NO</button></span></div>`).join('')}</div>
      <p class="muted" style="margin:6px 0 0">Not sure? Leave it blank: it will show as unknown.</p>
      </div>
      <div id="notes" hidden>
      <label class="l">How many people fit inside? <span class="muted">(optional)</span></label>
      <div class="caps" id="caps">${[1, 2, 3, 4].map((n) => `<button type="button" data-c="${n}" aria-pressed="false">${icon('users')}<b>${CAP[n]}</b><small>${CAP_NAME[n]}</small></button>`).join('')}</div>
      <label class="l" for="cm">Notes (optional)</label>
      <textarea id="cm" name="vsl-notes" autocomplete="off" rows="3" maxlength="800" placeholder="E.g. dirty, AC not working, key from the second officer…"></textarea>
      <label class="l">${icon('camera')} Photos (max 3)</label>
      <input id="ph" type="file" accept="image/*" multiple>
      <div class="thumbs" id="th"></div>
      </div>
      <input class="hp" type="text" name="hp-x7" tabindex="-1" autocomplete="off" aria-hidden="true" data-lpignore="true" data-1p-ignore data-form-type="other">
      <div id="msg" style="margin-top:14px"></div>
      <button class="btn block" id="go" style="margin-top:8px" type="submit" hidden>Submit review</button>
      <p class="muted" style="text-align:center">Your review is anonymous and will appear after approval.</p>
    </form>`;
  const rateBtns = [...document.querySelectorAll('#rate button')], rl = document.getElementById('rl');
  rateBtns.forEach((b) => b.addEventListener('click', () => {
    rating = +b.dataset.n; rl.textContent = RATE_TXT[rating];
    rateBtns.forEach((x) => x.classList.toggle('on', +x.dataset.n <= rating));
  }));
  // step 1: is there a Tally Room? Details only appear after answering.
  const ynBtns = [...document.querySelectorAll('#yn button')];
  const details = document.getElementById('details'), notes = document.getElementById('notes'), goBtn = document.getElementById('go');
  ynBtns.forEach((b) => b.addEventListener('click', () => {
    hasTally = b.dataset.v === '1';
    ynBtns.forEach((x) => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-checked', on); });
    details.hidden = !hasTally; notes.hidden = false; goBtn.hidden = false;
    document.getElementById('msg').innerHTML = '';
  }));
  // each amenity: YES / NO, tap again to clear (blank = unknown)
  const paint = (row) => row.querySelectorAll('.seg button').forEach((x) => {
    const on = amenState[row.dataset.k] === x.dataset.v; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on);
  });
  document.querySelectorAll('.arow').forEach((row) => {
    paint(row);
    row.querySelectorAll('.seg button').forEach((b) => b.addEventListener('click', () => {
      const k = row.dataset.k;
      if (amenState[k] === b.dataset.v) delete amenState[k]; else amenState[k] = b.dataset.v;
      paint(row);
    }));
  });
  const capBtns = [...document.querySelectorAll('#caps button')];
  capBtns.forEach((b) => b.addEventListener('click', () => {
    capacity = capacity === +b.dataset.c ? 0 : +b.dataset.c;           // tap again to clear
    capBtns.forEach((x) => { const on = +x.dataset.c === capacity; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); });
  }));
  const th = document.getElementById('th');
  document.getElementById('ph').addEventListener('change', async (e) => {
    photos.length = 0; th.innerHTML = '';
    for (const f of [...e.target.files].slice(0, 3)) {
      try { const b = await compress(f); photos.push(b); const i = new Image(); i.src = URL.createObjectURL(b); th.append(i); }
      catch { /* skip unreadable files */ }
    }
  });
  document.getElementById('f').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('msg'), go = document.getElementById('go');
    const fail = (t) => { msg.innerHTML = `<div class="msg err">${esc(t)}</div>`; };
    if (hasTally === null) return fail('Please answer: is there a Tally Room on board?');
    if (hasTally && !rating) return fail('Please choose a rating from 1 to 5 stars.');
    const fd = new FormData();
    if (shipId) fd.append('ship_id', shipId);
    else { const n = document.getElementById('sn').value.trim().toUpperCase(); if (n.length < 2) return fail('Please enter the vessel name.'); fd.append('ship_name', n); }
    fd.append('has_tally', hasTally ? '1' : '0');
    if (hasTally) {
      fd.append('rating', rating);
      if (capacity) fd.append('capacity', capacity);
      fd.append('amenities', JSON.stringify(amenState));
    }
    fd.append('comment', document.getElementById('cm').value);
    fd.append('website', e.target.elements['hp-x7'].value);
    if (hasTally) photos.forEach((b, i) => fd.append('photos', b, `photo${i}.${b.type === 'image/webp' ? 'webp' : 'jpg'}`));
    go.disabled = true; go.textContent = 'Sending…';
    try {
      await api('/reviews', { method: 'POST', body: fd });
      $app.innerHTML = `<div class="card" style="margin-top:20px"><div class="msg">✅ Thank you! Your review has been sent and will appear after approval.</div><a class="btn block" href="#/">Back to search</a></div>`;
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
  if (h.startsWith('/new')) return form({ name: new URLSearchParams(h.split('?')[1] || '').get('name') || '' });
  return home();
}
addEventListener('hashchange', route);
route();
