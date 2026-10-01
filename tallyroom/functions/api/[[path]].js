// API unica per Tally Room Reviews (Cloudflare Pages Functions + D1 + R2)

const AMENITIES = ['power220', 'ac', 'chairs', 'desk', 'clean', 'light', 'wifi', 'wc'];
const RECENT = 5;             // numero di recensioni recenti usate per la scheda
const MAX_PHOTOS = 3;
const MAX_PHOTO_BYTES = 1_500_000;
const RATE_LIMIT_PER_HOUR = 5;

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
const err = (msg, status = 400) => json({ error: msg }, status);

const normName = (s) =>
  String(s || '').toUpperCase().replace(/^(M\/?[NVT]|MS|MV|SS)\.?\s+/, '')
    .replace(/[^A-Z0-9]+/g, ' ').trim();
const cleanName = (s) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, 60);

async function sha(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function isAdmin(request, env) {
  const h = request.headers.get('authorization') || '';
  return !!env.ADMIN_PASSWORD && h === `Bearer ${env.ADMIN_PASSWORD}`;
}

// ---- scheda nave: media sulle ultime recensioni approvate + stato comfort ----
async function buildSheet(env, ship) {
  const { results: revs } = await env.DB.prepare(
    `SELECT id, rating, amenities, comment, created_at FROM reviews
     WHERE ship_id = ? AND status = 'approved' ORDER BY created_at DESC, id DESC`
  ).bind(ship.id).all();
  const parsed = revs.map((r) => ({ ...r, amenities: safeJson(r.amenities) }));
  const recent = parsed.slice(0, RECENT);

  // voto = media delle ultime recensioni; il voto iniziale importato vale solo se non ce ne sono
  const ratings = recent.map((r) => r.rating);
  const rating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : ship.seed_rating;

  const amenities = {};
  for (const a of AMENITIES) {
    if (!recent.length) { amenities[a] = null; continue; }
    amenities[a] = recent.filter((r) => r.amenities[a]).length / recent.length;
  }

  const { results: photos } = await env.DB.prepare(
    `SELECT p.id, p.review_id, p.created_at FROM photos p
     JOIN reviews r ON r.id = p.review_id
     WHERE p.ship_id = ? AND r.status = 'approved' ORDER BY p.created_at DESC`
  ).bind(ship.id).all();

  return {
    id: ship.id,
    name: ship.name,
    rating,
    seed_rating: ship.seed_rating,
    review_count: parsed.length,
    last_update: parsed[0]?.created_at ?? null,
    amenities,
    reviews: parsed,
    photos,
  };
}
function safeJson(s) { try { return JSON.parse(s) || {}; } catch { return {}; } }

// ---- handlers pubblici ----
async function searchShips(env, url) {
  const q = normName(url.searchParams.get('q') || '');
  if (q.length < 2) return json({ ships: [] });
  const { results } = await env.DB.prepare(
    `SELECT s.id, s.name, s.seed_rating,
       (SELECT ROUND(AVG(rating),1) FROM (SELECT rating FROM reviews r WHERE r.ship_id = s.id AND r.status='approved' ORDER BY r.created_at DESC, r.id DESC LIMIT 5)) AS avg_rating,
       (SELECT COUNT(*) FROM reviews r WHERE r.ship_id = s.id AND r.status='approved') AS review_count
     FROM ships s WHERE s.status = 'approved' AND s.name_norm LIKE ?
     ORDER BY (s.name_norm LIKE ?) DESC, s.name LIMIT 15`
  ).bind(`%${q}%`, `${q}%`).all();
  return json({ ships: results });
}

async function getShip(env, id) {
  const ship = await env.DB.prepare(`SELECT * FROM ships WHERE id = ? AND status='approved'`).bind(id).first();
  if (!ship) return err('Nave non trovata', 404);
  return json(await buildSheet(env, ship));
}

async function topShips(env) {
  const { results } = await env.DB.prepare(
    `SELECT s.id, s.name, s.seed_rating,
       (SELECT ROUND(AVG(rating),1) FROM (SELECT rating FROM reviews r WHERE r.ship_id = s.id AND r.status='approved' ORDER BY r.created_at DESC, r.id DESC LIMIT 5)) AS avg_rating,
       (SELECT COUNT(*) FROM reviews r WHERE r.ship_id = s.id AND r.status='approved') AS review_count
     FROM ships s WHERE s.status='approved'
     ORDER BY COALESCE(avg_rating, s.seed_rating, 0) DESC, review_count DESC LIMIT 10`
  ).all();
  return json({ ships: results });
}

async function submitReview(env, request) {
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  const ipHash = await sha(ip + (env.SALT || ''));
  const since = Date.now() - 3600_000;
  const { n } = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM reviews WHERE ip_hash = ? AND created_at > ?`
  ).bind(ipHash, since).first();
  if (n >= RATE_LIMIT_PER_HOUR) return err('Troppi invii, riprova più tardi', 429);

  let form;
  try { form = await request.formData(); } catch { return err('Richiesta non valida'); }
  if (form.get('website')) return json({ ok: true });           // honeypot

  const rating = parseInt(form.get('rating'), 10);
  if (!(rating >= 1 && rating <= 5)) return err('Voto non valido');

  const amenitiesIn = safeJson(form.get('amenities'));
  const amenities = {};
  for (const a of AMENITIES) amenities[a] = !!amenitiesIn[a];
  const comment = String(form.get('comment') || '').trim().slice(0, 800) || null;

  // nave esistente o nuova
  let shipId = parseInt(form.get('ship_id'), 10);
  const now = Date.now();
  if (shipId) {
    const s = await env.DB.prepare(`SELECT id FROM ships WHERE id=? AND status='approved'`).bind(shipId).first();
    if (!s) return err('Nave non trovata', 404);
  } else {
    const name = cleanName(form.get('ship_name'));
    const norm = normName(name);
    if (norm.length < 2) return err('Nome nave non valido');
    const ex = await env.DB.prepare(`SELECT id FROM ships WHERE name_norm=?`).bind(norm).first();
    if (ex) shipId = ex.id;
    else {
      const r = await env.DB.prepare(
        `INSERT INTO ships (name, name_norm, status, created_at) VALUES (?,?, 'pending', ?)`
      ).bind(name, norm, now).run();
      shipId = r.meta.last_row_id;
    }
  }

  const files = form.getAll('photos').filter((f) => f && typeof f === 'object' && f.size > 0).slice(0, MAX_PHOTOS);
  for (const f of files) {
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) return err('Formato foto non supportato');
    if (f.size > MAX_PHOTO_BYTES) return err('Foto troppo pesante');
  }

  const rev = await env.DB.prepare(
    `INSERT INTO reviews (ship_id, rating, amenities, comment, status, ip_hash, created_at)
     VALUES (?,?,?,?, 'pending', ?, ?)`
  ).bind(shipId, rating, JSON.stringify(amenities), comment, ipHash, now).run();
  const reviewId = rev.meta.last_row_id;

  for (const f of files) {
    const ext = f.type.split('/')[1];
    const key = `${shipId}/${reviewId}-${crypto.randomUUID()}.${ext}`;
    await env.PHOTOS.put(key, f.stream(), { httpMetadata: { contentType: f.type } });
    await env.DB.prepare(
      `INSERT INTO photos (review_id, ship_id, r2_key, content_type, created_at) VALUES (?,?,?,?,?)`
    ).bind(reviewId, shipId, key, f.type, now).run();
  }
  return json({ ok: true, pending: true });
}

async function servePhoto(env, request, id) {
  const p = await env.DB.prepare(
    `SELECT p.r2_key, p.content_type, r.status FROM photos p JOIN reviews r ON r.id=p.review_id WHERE p.id=?`
  ).bind(id).first();
  if (!p) return err('Non trovata', 404);
  if (p.status !== 'approved' && !isAdmin(request, env))
    return err('Non trovata', 404);
  const obj = await env.PHOTOS.get(p.r2_key);
  if (!obj) return err('Non trovata', 404);
  return new Response(obj.body, {
    headers: {
      'content-type': p.content_type,
      'cache-control': p.status === 'approved' ? 'public, max-age=31536000, immutable' : 'private, no-store',
    },
  });
}

async function reportReview(env, request, id) {
  const body = await request.json().catch(() => ({}));
  const exists = await env.DB.prepare(`SELECT id FROM reviews WHERE id=?`).bind(id).first();
  if (!exists) return err('Non trovata', 404);
  await env.DB.prepare(`INSERT INTO reports (review_id, reason, created_at) VALUES (?,?,?)`)
    .bind(id, String(body.reason || '').slice(0, 300), Date.now()).run();
  return json({ ok: true });
}

// ---- handlers admin ----
async function adminQueue(env) {
  const { results: reviews } = await env.DB.prepare(
    `SELECT r.id, r.rating, r.amenities, r.comment, r.created_at, s.id AS ship_id, s.name AS ship_name, s.status AS ship_status,
       (SELECT group_concat(id) FROM photos WHERE review_id = r.id) AS photo_ids
     FROM reviews r JOIN ships s ON s.id = r.ship_id
     WHERE r.status='pending' ORDER BY r.created_at`
  ).all();
  const { results: reports } = await env.DB.prepare(
    `SELECT rp.id, rp.reason, rp.created_at, r.id AS review_id, r.comment, r.rating, s.name AS ship_name
     FROM reports rp JOIN reviews r ON r.id = rp.review_id JOIN ships s ON s.id = r.ship_id
     ORDER BY rp.created_at DESC LIMIT 50`
  ).all();
  const { n: ships } = await env.DB.prepare(`SELECT COUNT(*) AS n FROM ships WHERE status='approved'`).first();
  return json({ reviews: reviews.map((r) => ({ ...r, amenities: safeJson(r.amenities) })), reports, ships });
}

async function adminReview(env, id, action) {
  const rev = await env.DB.prepare(`SELECT ship_id FROM reviews WHERE id=?`).bind(id).first();
  if (!rev) return err('Non trovata', 404);
  if (action === 'approve') {
    await env.DB.batch([
      env.DB.prepare(`UPDATE reviews SET status='approved' WHERE id=?`).bind(id),
      env.DB.prepare(`UPDATE ships SET status='approved' WHERE id=?`).bind(rev.ship_id),
    ]);
  } else if (action === 'reject' || action === 'delete') {
    const { results: ph } = await env.DB.prepare(`SELECT r2_key FROM photos WHERE review_id=?`).bind(id).all();
    for (const p of ph) await env.PHOTOS.delete(p.r2_key);
    await env.DB.batch([
      env.DB.prepare(`DELETE FROM photos WHERE review_id=?`).bind(id),
      env.DB.prepare(`DELETE FROM reports WHERE review_id=?`).bind(id),
      env.DB.prepare(`DELETE FROM reviews WHERE id=?`).bind(id),
      // elimina la nave se era nuova e non ha altro
      env.DB.prepare(
        `DELETE FROM ships WHERE id=? AND status='pending' AND NOT EXISTS (SELECT 1 FROM reviews WHERE ship_id=?)`
      ).bind(rev.ship_id, rev.ship_id),
    ]);
  } else return err('Azione non valida');
  return json({ ok: true });
}

async function adminDismissReport(env, id) {
  await env.DB.prepare(`DELETE FROM reports WHERE id=?`).bind(id).run();
  return json({ ok: true });
}

// CSV: nome,voto  (separatore , o ; — prima riga intestazione opzionale)
async function adminImport(env, request) {
  const { csv } = await request.json().catch(() => ({}));
  if (!csv) return err('CSV mancante');
  const now = Date.now();
  const stmts = [];
  let skipped = 0;
  for (const line of String(csv).split(/\r?\n/)) {
    const parts = line.split(/[;,\t]/).map((p) => p.trim().replace(/^"|"$/g, ''));
    if (parts.length < 1 || !parts[0]) continue;
    const name = cleanName(parts[0]);
    const norm = normName(name);
    const rate = parseFloat((parts[1] || '').replace(',', '.'));
    if (norm.length < 2 || (parts[1] && isNaN(rate) && stmts.length === 0)) { skipped++; continue; } // intestazione
    const seed = isNaN(rate) ? null : Math.min(5, Math.max(1, rate));
    stmts.push(env.DB.prepare(
      `INSERT INTO ships (name, name_norm, seed_rating, status, created_at) VALUES (?,?,?, 'approved', ?)
       ON CONFLICT(name_norm) DO UPDATE SET seed_rating = COALESCE(excluded.seed_rating, seed_rating), status='approved'`
    ).bind(name, norm, seed, now));
  }
  for (let i = 0; i < stmts.length; i += 50) await env.DB.batch(stmts.slice(i, i + 50));
  return json({ ok: true, imported: stmts.length, skipped });
}

// ---- router ----
export async function onRequest({ request, env, params }) {
  const url = new URL(request.url);
  const path = '/' + [].concat(params.path || []).join('/');
  const m = request.method;
  try {
    if (path === '/ships' && m === 'GET') return await searchShips(env, url);
    if (path === '/top' && m === 'GET') return await topShips(env);
    let x;
    if ((x = path.match(/^\/ships\/(\d+)$/)) && m === 'GET') return await getShip(env, +x[1]);
    if (path === '/reviews' && m === 'POST') return await submitReview(env, request);
    if ((x = path.match(/^\/photos\/(\d+)$/)) && m === 'GET') return await servePhoto(env, request, +x[1]);
    if ((x = path.match(/^\/reviews\/(\d+)\/report$/)) && m === 'POST') return await reportReview(env, request, +x[1]);

    if (path.startsWith('/admin/')) {
      if (!isAdmin(request, env)) return err('Non autorizzato', 401);
      if (path === '/admin/queue' && m === 'GET') return await adminQueue(env);
      if (path === '/admin/import' && m === 'POST') return await adminImport(env, request);
      if ((x = path.match(/^\/admin\/reviews\/(\d+)\/(approve|reject|delete)$/)) && m === 'POST')
        return await adminReview(env, +x[1], x[2]);
      if ((x = path.match(/^\/admin\/reports\/(\d+)\/dismiss$/)) && m === 'POST')
        return await adminDismissReport(env, +x[1]);
    }
    return err('Not found', 404);
  } catch (e) {
    return err('Errore del server', 500);
  }
}
