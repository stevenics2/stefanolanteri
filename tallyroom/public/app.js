'use strict';
const AMEN = [
  ['power220', 'Corrente 220V'], ['ac', 'Aria condizionata / clima'], ['chairs', 'Sedie'], ['desk', 'Tavolo / scrivania'],
  ['clean', 'Pulizia'], ['light', 'Luci adeguate'], ['wifi', 'Wi-Fi'], ['wc', 'Bagno vicino'],
];
const $app = document.getElementById('app');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const stars = (v) => { const n = Math.round(v || 0); return `<span class="stars">${'★'.repeat(n)}<span class="off">${'★'.repeat(5 - n)}</span></span>`; };
const fmtDate = (t) => new Date(t).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
const api = async (path, opts) => {
  const r = await fetch('/api' + path, opts);
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || 'Errore di rete');
  return d;
};
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

// ---------- Home ----------
async function home() {
  $app.innerHTML = `
    <div class="card">
      <h1>Com'è la tally room?</h1>
      <input id="q" type="text" placeholder="Scrivi il nome della nave…" autocomplete="off" autofocus>
      <div id="results"></div>
    </div>
    <div class="card"><h2>Le migliori tally room</h2><div id="top" class="muted">Caricamento…</div></div>`;
  const q = document.getElementById('q'), res = document.getElementById('results');
  const item = (s) => {
    const r = s.avg_rating ?? s.seed_rating;
    return `<a class="ship-item" href="#/nave/${s.id}"><span>${esc(s.name)}<br><small>${s.review_count} recensioni</small></span>${r ? stars(r) : '<small>nessun voto</small>'}</a>`;
  };
  const search = debounce(async () => {
    const v = q.value.trim();
    if (v.length < 2) { res.innerHTML = ''; return; }
    const { ships } = await api('/ships?q=' + encodeURIComponent(v)).catch(() => ({ ships: [] }));
    res.innerHTML = (ships.map(item).join('') || '<p class="muted">Nessuna nave trovata con questo nome.</p>') +
      `<a class="btn sec block" style="margin-top:12px" href="#/nuova?nome=${encodeURIComponent(v)}">➕ Aggiungi "${esc(v)}"</a>`;
  }, 250);
  q.addEventListener('input', search);
  api('/top').then(({ ships }) => {
    document.getElementById('top').innerHTML = ships.length ? ships.map(item).join('') : 'Ancora nessuna nave.';
  }).catch(() => {});
}

// ---------- Scheda nave ----------
async function ship(id) {
  $app.innerHTML = '<p class="muted">Caricamento…</p>';
  let s;
  try { s = await api('/ships/' + id); } catch (e) { $app.innerHTML = `<div class="card">${esc(e.message)}</div>`; return; }
  const amen = AMEN.map(([k, label]) => {
    const p = s.amenities[k];
    const cls = p == null ? 'u' : p >= 0.5 ? 'y' : 'n';
    return `<div class="${cls}">${label}${p == null ? '' : `<span class="pct">${Math.round(p * 100)}%</span>`}</div>`;
  }).join('');
  $app.innerHTML = `
    <a href="#/" class="link">← Cerca un'altra nave</a>
    <div class="card" style="margin-top:10px">
      <h1>${esc(s.name)}</h1>
      <div class="row">
        <div>${s.rating ? `<span class="big">${s.rating.toFixed(1)}</span> ${stars(s.rating)}` : '<span class="muted">Nessun voto</span>'}</div>
        <span class="badge">${s.review_count} recensioni</span>
      </div>
      <p class="muted">${s.last_update ? `Ultimo aggiornamento: ${fmtDate(s.last_update)}` : (s.seed_rating ? 'Solo voto iniziale, nessun dettaglio ancora.' : '')}
      ${s.review_count ? '<br>Voto e comfort si basano sulle ultime 5 recensioni.' : ''}</p>
      <a class="btn block" href="#/nave/${s.id}/aggiorna">✏️ Aggiorna la scheda</a>
    </div>
    <div class="card"><h2>Comfort</h2><div class="amen">${amen}</div></div>
    ${s.photos.length ? `<div class="card"><h2>Foto</h2><div class="photos">${s.photos.map((p) => `<img loading="lazy" src="/api/photos/${p.id}" data-full="/api/photos/${p.id}" alt="Foto tally room">`).join('')}</div></div>` : ''}
    <div class="card"><h2>Storico aggiornamenti</h2>
      ${s.reviews.length ? s.reviews.map((r) => `
        <div class="rev">
          <div class="row">${stars(r.rating)}<span class="muted">${fmtDate(r.created_at)}</span></div>
          <div class="muted">${AMEN.filter(([k]) => r.amenities[k]).map(([, l]) => '✔ ' + l).join(' · ') || 'Nessun comfort segnalato'}</div>
          ${r.comment ? `<p>${esc(r.comment)}</p>` : ''}
          <button class="link" data-report="${r.id}" style="background:none;border:0;color:var(--mut);font-size:.78rem;padding:0;cursor:pointer">Segnala</button>
        </div>`).join('') : '<p class="muted">Ancora nessuna recensione dettagliata. Sii il primo!</p>'}
    </div>`;
  $app.querySelectorAll('[data-full]').forEach((img) => img.addEventListener('click', () => {
    const lb = document.createElement('div'); lb.className = 'lightbox';
    lb.innerHTML = `<img src="${img.dataset.full}" alt="">`; lb.onclick = () => lb.remove(); document.body.append(lb);
  }));
  $app.querySelectorAll('[data-report]').forEach((b) => b.addEventListener('click', async () => {
    const reason = prompt('Perché segnali questa recensione?'); if (reason === null) return;
    await api(`/reviews/${b.dataset.report}/report`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ reason }) }).catch(() => {});
    b.textContent = 'Segnalata, grazie'; b.disabled = true;
  }));
}

// ---------- Form recensione (nuova nave o aggiornamento) ----------
async function compress(file, max = 1280) {
  const bmp = await createImageBitmap(file).catch(() => null);
  if (!bmp) throw new Error('Immagine non leggibile');
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
    <a href="#/${shipId ? 'nave/' + shipId : ''}" class="link">← Indietro</a>
    <form class="card" id="f" style="margin-top:10px" novalidate>
      <h1>${shipId ? 'Aggiorna la scheda' : 'Aggiungi nave'}</h1>
      ${shipId ? `<p class="muted">Controlla com'è oggi la tally room di <b>${esc(name)}</b>. Le spunte sono precompilate con lo stato attuale: modifica quello che è cambiato.</p>` :
        `<label class="l" for="sn">Nome della nave</label><input id="sn" type="text" value="${esc(name || '')}" maxlength="60" required>`}
      <label class="l">Voto complessivo</label>
      <div class="rate-in" id="rate">${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-n="${n}" aria-label="${n} stelle">★</button>`).join('')}</div>
      <label class="l">Cosa c'è / com'è</label>
      ${AMEN.map(([k, l]) => `<label class="chk"><input type="checkbox" name="${k}" ${prev[k] ? 'checked' : ''}> ${l}</label>`).join('')}
      <label class="l" for="cm">Note (facoltative)</label>
      <textarea id="cm" rows="3" maxlength="800" placeholder="Es. sporca, il condizionatore non funziona, chiave dal secondo ufficiale…"></textarea>
      <label class="l">Foto (max 3)</label>
      <input id="ph" type="file" accept="image/*" multiple>
      <div class="thumbs" id="th"></div>
      <input class="hp" type="text" name="website" tabindex="-1" autocomplete="off">
      <div id="msg"></div>
      <button class="btn block" id="go" style="margin-top:16px" type="submit">Invia recensione</button>
      <p class="muted">La recensione è anonima e sarà visibile dopo l'approvazione.</p>
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
    if (!rating) return fail('Scegli un voto da 1 a 5 stelle.');
    const fd = new FormData();
    if (shipId) fd.append('ship_id', shipId);
    else { const n = document.getElementById('sn').value.trim(); if (n.length < 2) return fail('Scrivi il nome della nave.'); fd.append('ship_name', n); }
    fd.append('rating', rating);
    fd.append('amenities', JSON.stringify(Object.fromEntries(AMEN.map(([k]) => [k, e.target.elements[k].checked]))));
    fd.append('comment', document.getElementById('cm').value);
    fd.append('website', e.target.elements.website.value);
    photos.forEach((b, i) => fd.append('photos', b, `foto${i}.${b.type === 'image/webp' ? 'webp' : 'jpg'}`));
    go.disabled = true; go.textContent = 'Invio in corso…';
    try {
      await api('/reviews', { method: 'POST', body: fd });
      $app.innerHTML = `<div class="card"><div class="msg">✅ Grazie! La tua recensione è stata inviata e comparirà dopo l'approvazione.</div><a class="btn block" href="#/">Torna alla ricerca</a></div>`;
    } catch (er) { fail(er.message); go.disabled = false; go.textContent = 'Invia recensione'; }
  });
}

// ---------- Router ----------
function route() {
  const h = location.hash.replace(/^#/, '') || '/';
  let m;
  window.scrollTo(0, 0);
  if ((m = h.match(/^\/nave\/(\d+)\/aggiorna$/))) return form({ shipId: +m[1] });
  if ((m = h.match(/^\/nave\/(\d+)$/))) return ship(+m[1]);
  if (h.startsWith('/nuova')) return form({ name: new URLSearchParams(h.split('?')[1] || '').get('nome') || '' });
  return home();
}
addEventListener('hashchange', route);
route();
