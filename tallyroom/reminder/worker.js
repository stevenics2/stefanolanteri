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

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(Promise.all([run(env), backup(env)]).then((m) => console.log(m.join(' | '))));
  },
  // Pagina di controllo: mostra solo se i segreti sono visibili, mai i loro valori.
  async fetch(request, env) {
    const flag = (v) => (v ? 'configured' : 'MISSING');
    return new Response([
      'tally-room-reminder: runs on a daily schedule',
      `RESEND_API_KEY: ${flag(env.RESEND_API_KEY)}`,
      `ADMIN_EMAIL: ${flag(env.ADMIN_EMAIL)}`,
      `MAIL_FROM: ${env.MAIL_FROM ? 'configured' : 'default (notifications@tallyrooms.com)'}`,
      `Database: ${env.DB ? 'connected' : 'MISSING'}`,
      `Weekly backup email: ${env.RESEND_API_KEY && env.ADMIN_EMAIL ? 'enabled' : 'disabled (secrets missing)'}`,
    ].join('\n'), { status: 200, headers: { 'content-type': 'text/plain; charset=utf-8' } });
  },
};
