// Promemoria per l'amministratore: un'email riepilogativa ogni N giorni
// finché ci sono recensioni o navi in attesa di approvazione da almeno N giorni.
// Gira come Cron Trigger gratuito di Cloudflare Workers, sullo stesso database D1.

const DAY = 86_400_000;

async function sendEmail(env, { subject, text }) {
  if (!env.RESEND_API_KEY || !env.ADMIN_EMAIL) return false;
  const r = await fetch(env.RESEND_API_URL || 'https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: env.MAIL_FROM || 'Tally Rooms <notifications@tallyrooms.com>',
      to: [env.ADMIN_EMAIL],
      subject,
      text,
    }),
  });
  return r.ok;
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
    ctx.waitUntil(run(env).then((m) => console.log(m)));
  },
  async fetch() {
    return new Response('tally-room-reminder: runs on a daily schedule', { status: 200 });
  },
};
