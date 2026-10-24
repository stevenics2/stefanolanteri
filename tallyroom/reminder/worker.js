import { sendWebPush } from './webpush.js';
// Promemoria per l'amministratore: un'email riepilogativa ogni N giorni
// finché ci sono recensioni o navi in attesa di approvazione da almeno N giorni.
// In più, ogni 7 giorni invia per email un backup completo del database.
// Gira come Cron Trigger gratuito di Cloudflare Workers, sullo stesso database D1.

const DAY = 86_400_000;

async function sendEmail(env, { subject, text, attachments }) {
  if (!env.RESEND_API_KEY || !env.ADMIN_EMAIL) return false;
  const r = await fetch(env.RESEND_API_URL || 'https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: env.MAIL_FROM || 'Tally Rooms <notifications@tallyrooms.com>',
      to: [env.ADMIN_EMAIL],
      subject,
      text,
      ...(attachments ? { attachments } : {}),
    }),
  });
  return r.ok;
}


// ---- Backup: SQL dump of all data (ip_hash is deliberately left out). Same logic lives in functions/api/[[path]].js ----
const BACKUP_TABLES = [
  ['ships', ['id', 'name', 'name_norm', 'seed_rating', 'status', 'created_at']],
  ['reviews', ['id', 'ship_id', 'rating', 'has_tally', 'capacity', 'amenities', 'comment', 'status', 'created_at']],
  ['photos', ['id', 'review_id', 'ship_id', 'r2_key', 'content_type', 'created_at']],
  ['reports', ['id', 'review_id', 'reason', 'created_at']],
];
const sqlValue = (v) => (v == null ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`);

async function buildBackup(env) {
  const counts = {};
  let sql = `-- Tally Rooms backup, ${new Date().toISOString()}\n-- Restore: first run schema.sql on an empty database, then run this file.\n`;
  for (const [table, cols] of BACKUP_TABLES) {
    let rows;
    try { rows = (await env.DB.prepare(`SELECT ${cols.join(', ')} FROM ${table} ORDER BY id`).all()).results; }
    catch { rows = []; }   // a column that does not exist yet in an old database
    counts[table] = rows.length;
    for (const r of rows) {
      sql += `INSERT OR REPLACE INTO ${table} (${cols.join(', ')}) VALUES (${cols.map((c) => sqlValue(r[c])).join(', ')});\n`;
    }
  }
  return { sql, counts };
}

const toBase64 = (str) => {
  const bytes = new TextEncoder().encode(str);
  let bin = ''; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
};

async function backup(env) {
  const every = Math.max(1, parseInt(env.BACKUP_EVERY_DAYS || '7', 10));
  const now = Date.now();
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT)').run();
  const last = await env.DB.prepare(`SELECT value FROM meta WHERE key='last_backup'`).first();
  if (last && now - Number(last.value) < every * DAY - 3_600_000) return 'backup not due yet';

  const { sql, counts } = await buildBackup(env);
  const day = new Date(now).toISOString().slice(0, 10);
  const ok = await sendEmail(env, {
    subject: `Tally Rooms backup ${day}`,
    text: [
      `Weekly backup of the Tally Rooms database (${(sql.length / 1024).toFixed(0)} KB, attached).`,
      '',
      `Vessels: ${counts.ships}`, `Reviews: ${counts.reviews}`, `Photos (records): ${counts.photos}`, `Reports: ${counts.reports}`,
      '',
      'Photos themselves are stored in the photo bucket and are not part of this file.',
      'Restore: run schema.sql on an empty database, then this file (see the README).',
    ].join('\n'),
    attachments: [{ filename: `tallyrooms-backup-${day}.sql`, content: toBase64(sql) }],
  });
  if (!ok) return 'backup email not sent (check RESEND_API_KEY and ADMIN_EMAIL)';
  await env.DB.prepare(`INSERT INTO meta (key, value) VALUES ('last_backup', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`).bind(String(now)).run();
  return `backup sent (${counts.ships} vessels, ${counts.reviews} reviews)`;
}

async function run(env) {
  const every = Math.max(1, parseInt(env.REMIND_EVERY_DAYS || '3', 10));
  const now = Date.now();

  await env.DB.prepare('CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT)').run();
  // Housekeeping: finished push jobs are deleted after 7 days.
  await env.DB.prepare('DELETE FROM push_jobs WHERE created_at < ? AND done = 1').bind(now - 7 * DAY).run().catch(() => {});
  // Privacy: the anti-abuse code stored with a submission is erased after 30 days.
  await env.DB.prepare('UPDATE reviews SET ip_hash = NULL WHERE ip_hash IS NOT NULL AND created_at < ?').bind(now - 30 * DAY).run();
  const { results: pending } = await env.DB.prepare(
    `SELECT r.id, r.created_at, r.has_tally, s.name, s.status AS ship_status
     FROM reviews r JOIN ships s ON s.id = r.ship_id
     WHERE r.status = 'pending' ORDER BY r.created_at LIMIT 100`
  ).all();
  if (!pending.length) return 'nothing pending';

  const oldestAge = now - pending[0].created_at;
  if (oldestAge < every * DAY) return 'pending items are too recent';

  const last = await env.DB.prepare(`SELECT value FROM meta WHERE key='last_reminder'`).first();
  if (last && now - Number(last.value) < every * DAY - 3_600_000) return 'reminder sent recently';

  const lines = pending.slice(0, 25).map((p) => {
    const days = Math.floor((now - p.created_at) / DAY);
    const tag = p.ship_status === 'pending' ? '[NEW VESSEL] ' : '';
    return `- ${tag}${String(p.name).toUpperCase()}${p.has_tally ? '' : ' (no Tally Room)'}: waiting ${days} day${days === 1 ? '' : 's'}`;
  });
  const ok = await sendEmail(env, {
    subject: `Reminder: ${pending.length} item${pending.length === 1 ? '' : 's'} waiting for approval`,
    text: [
      `${pending.length} review${pending.length === 1 ? ' is' : 's are'} still waiting for approval:`,
      '',
      ...lines,
      ...(pending.length > 25 ? [`…and ${pending.length - 25} more.`] : []),
      '',
      `Approve or reject them here: ${env.SITE_URL || 'https://tallyrooms.com'}/admin`,
    ].join('\n'),
  });
  if (!ok) return 'email not sent (check RESEND_API_KEY and ADMIN_EMAIL)';
  await env.DB.prepare(`INSERT INTO meta (key, value) VALUES ('last_reminder', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`)
    .bind(String(now)).run();
  return `reminder sent for ${pending.length} items`;
}


// ---- Push notifications: delivers queued jobs to subscribed phones in batches (runs every minute) ----
const PUSH_BATCH = 40;                 // the free plan allows 50 outgoing requests per run
const PUSH_TABLES = [
  'CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT)',
  'CREATE TABLE IF NOT EXISTS push_subs (id INTEGER PRIMARY KEY AUTOINCREMENT, endpoint TEXT NOT NULL UNIQUE, p256dh TEXT NOT NULL, auth TEXT NOT NULL, created_at INTEGER NOT NULL, fails INTEGER NOT NULL DEFAULT 0)',
  'CREATE TABLE IF NOT EXISTS push_jobs (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, body TEXT, url TEXT, target INTEGER, created_at INTEGER NOT NULL, cursor INTEGER NOT NULL DEFAULT 0, done INTEGER NOT NULL DEFAULT 0)',
];

async function pushTick(env) {
  await env.DB.batch(PUSH_TABLES.map((q) => env.DB.prepare(q)));
  const job = await env.DB.prepare('SELECT * FROM push_jobs WHERE done = 0 ORDER BY id LIMIT 1').first();
  if (!job) return 'push: nothing queued';

  const { results: kv } = await env.DB.prepare(`SELECT key, value FROM meta WHERE key IN ('vapid_public', 'vapid_private')`).all();
  const keys = Object.fromEntries(kv.map((r) => [r.key, r.value]));
  if (!keys.vapid_public || !keys.vapid_private) {
    await env.DB.prepare('UPDATE push_jobs SET done = 1 WHERE id = ?').bind(job.id).run();
    return 'push: no keys yet, job dropped';
  }
  const vapid = { publicKey: keys.vapid_public, privateJwk: JSON.parse(keys.vapid_private), subject: env.SITE_URL || 'https://tallyrooms.com' };

  const { results: subs } = job.target
    ? await env.DB.prepare('SELECT * FROM push_subs WHERE id = ?').bind(job.target).all()
    : await env.DB.prepare('SELECT * FROM push_subs WHERE id > ? ORDER BY id LIMIT ?').bind(job.cursor, PUSH_BATCH).all();

  const payload = { title: job.title, body: job.body || '', url: job.url || '/' };
  const statuses = await Promise.all(subs.map((s) => sendWebPush(s, payload, vapid).catch(() => 0)));

  const stmts = []; let sent = 0, gone = 0, failed = 0;
  subs.forEach((s, i) => {
    const st = statuses[i];
    if (st >= 200 && st < 300) { sent++; stmts.push(env.DB.prepare('UPDATE push_subs SET fails = 0 WHERE id = ? AND fails > 0').bind(s.id)); }
    else if (st === 404 || st === 410) { gone++; stmts.push(env.DB.prepare('DELETE FROM push_subs WHERE id = ?').bind(s.id)); }   // phone unsubscribed
    else { failed++; stmts.push(env.DB.prepare('UPDATE push_subs SET fails = fails + 1 WHERE id = ?').bind(s.id)); stmts.push(env.DB.prepare('DELETE FROM push_subs WHERE id = ? AND fails >= 5').bind(s.id)); }
  });
  const finished = job.target ? true : subs.length < PUSH_BATCH;
  stmts.push(env.DB.prepare('UPDATE push_jobs SET cursor = ?, done = ? WHERE id = ?').bind(subs.length ? subs[subs.length - 1].id : job.cursor, finished ? 1 : 0, job.id));
  await env.DB.batch(stmts);
  return `push: job ${job.id} sent ${sent}, gone ${gone}, failed ${failed}${finished ? ', finished' : ', more to send'}`;
}

export default {
  async scheduled(event, env, ctx) {
    if (event.cron === '* * * * *') {                       // every minute: push notifications
      ctx.waitUntil(pushTick(env).then((m) => console.log(m)).catch((e) => console.log('push error', String(e))));
      return;
    }
    // daily: reminders, weekly backup, and housekeeping
    ctx.waitUntil(Promise.all([run(env), backup(env)]).then((m) => console.log(m.join(' | '))));
  },
  // Pagina di controllo: mostra solo se i segreti sono visibili, mai i loro valori.
  async fetch(request, env) {
    const flag = (v) => (v ? 'configured' : 'MISSING');
    let subs = '?';
    try { subs = (await env.DB.prepare('SELECT COUNT(*) AS n FROM push_subs').first()).n; } catch { subs = '0'; }
    return new Response([
      'tally-room-reminder: runs on a daily schedule',
      `RESEND_API_KEY: ${flag(env.RESEND_API_KEY)}`,
      `ADMIN_EMAIL: ${flag(env.ADMIN_EMAIL)}`,
      `MAIL_FROM: ${env.MAIL_FROM ? 'configured' : 'default (notifications@tallyrooms.com)'}`,
      `Database: ${env.DB ? 'connected' : 'MISSING'}`,
      `Weekly backup email: ${env.RESEND_API_KEY && env.ADMIN_EMAIL ? 'enabled' : 'disabled (secrets missing)'}`,
      `Push notifications: every minute, ${subs} subscribed phone(s)`,
    ].join('\n'), { status: 200, headers: { 'content-type': 'text/plain; charset=utf-8' } });
  },
};
