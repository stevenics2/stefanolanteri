// Keepway: API per le notifiche push + invio ogni minuto (Cron Trigger).
//
//  - Il telefono si iscrive (POST /api/push/subscribe) e manda il "piano" delle notifiche dei prossimi giorni
//    (PUT /api/piano): l'app decide cosa avvisare e quando, il server si limita a consegnarle all'ora giusta.
//  - Ogni minuto `scheduled` prende le notifiche scadute e le spedisce.
//  - Il database (D1) è il binding `DB`. Se manca, le API rispondono 503 e il resto del sito funziona lo stesso.
import { generateVapid, sendWebPushDetailed, b64u } from './webpush.js';
import { analizzaCampioni } from './sonno.js';

const SCHEMA = [
  'CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT)',
  // un'iscrizione per telefono (device_id lo genera l'app, a caso)
  'CREATE TABLE IF NOT EXISTS subs (device_id TEXT PRIMARY KEY, endpoint TEXT NOT NULL, p256dh TEXT NOT NULL, auth TEXT NOT NULL, creato INTEGER NOT NULL, fallimenti INTEGER NOT NULL DEFAULT 0)',
  // le notifiche programmate: quando = istante di invio (ms dal 1970)
  'CREATE TABLE IF NOT EXISTS piano (device_id TEXT NOT NULL, id TEXT NOT NULL, quando INTEGER NOT NULL, titolo TEXT NOT NULL, testo TEXT, url TEXT, tag TEXT, urgente INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (device_id, id))',
  'CREATE INDEX IF NOT EXISTS piano_quando ON piano (quando)',
  // dati di salute mandati dal Comando Rapido dell'iPhone: uno per giorno; `codice` = impronta del codice personale (il codice vero non si salva)
  'CREATE TABLE IF NOT EXISTS salute (codice TEXT NOT NULL, giorno TEXT NOT NULL, passi INTEGER, sonno_min INTEGER, letto TEXT, sveglia TEXT, aggiornato INTEGER NOT NULL, PRIMARY KEY (codice, giorno))',
  // allenamenti (corsa, palestra…) mandati dal Comando Rapido a fine workout; `inizio` evita i doppioni se lo stesso workout arriva due volte
  'CREATE TABLE IF NOT EXISTS allenamenti (codice TEXT NOT NULL, giorno TEXT NOT NULL, tipo TEXT NOT NULL, inizio TEXT NOT NULL, minuti INTEGER, km REAL, aggiornato INTEGER NOT NULL, PRIMARY KEY (codice, giorno, tipo, inizio))',
  // l'ultima volta che da quel codice è arrivato qualcosa (serve alla notifica «nessuna attività ricevuta oggi»)
  'CREATE TABLE IF NOT EXISTS ultimo (codice TEXT PRIMARY KEY, quando INTEGER NOT NULL)',
  // quale telefono (device_id) usa quel codice: serve per avvisarlo quando arriva un allenamento. Lo manda l'app insieme al piano.
  // le sessioni di sonno (inizio, fine, minuti di sonno vero): servono a confrontare il sonno tra un turno e l'altro
  'CREATE TABLE IF NOT EXISTS sonni (codice TEXT NOT NULL, inizio INTEGER NOT NULL, fine INTEGER NOT NULL, minuti INTEGER NOT NULL, PRIMARY KEY (codice, inizio))',
  'CREATE TABLE IF NOT EXISTS collega (codice TEXT NOT NULL, device_id TEXT NOT NULL, PRIMARY KEY (codice, device_id))',
];

const PUSH_HOSTS = /^(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9.-]+\.push\.apple\.com|[a-z0-9.-]+\.notify\.windows\.com)$/i;
const DEVICE = /^[A-Za-z0-9-]{16,64}$/;
const MAX_PIANO = 200;
const TROPPO_TARDI_MS = 30 * 60 * 1000; // una notifica in ritardo di oltre 30 minuti non ha più senso
const MAX_FALLIMENTI = 5;

// Lettere «in grassetto» (Mathematical Sans-Serif Bold): caratteri Unicode che sembrano grassetto. Le accentate = lettera + accento combinato.
function grassetto(testo) {
  const mappa = (c) => {
    const k = c.codePointAt(0);
    if (k >= 65 && k <= 90) return String.fromCodePoint(0x1d5d4 + k - 65); // A-Z
    if (k >= 97 && k <= 122) return String.fromCodePoint(0x1d5ee + k - 97); // a-z
    if (k >= 48 && k <= 57) return String.fromCodePoint(0x1d7ec + k - 48); // 0-9
    return c;
  };
  return [...String(testo).normalize('NFD')].map(mappa).join('').normalize('NFC');
}

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const err = (msg, status = 400) => json({ error: msg }, status);
const clip = (v, n) => String(v ?? '').slice(0, n);

let schemaPronto = false;
async function schema(env) {
  if (schemaPronto) return;
  await env.DB.batch(SCHEMA.map((q) => env.DB.prepare(q)));
  // colonna aggiunta dopo: `salvo` = impronta del codice; la notifica non parte se da quel codice oggi è già arrivato qualcosa
  await env.DB.prepare('ALTER TABLE piano ADD COLUMN salvo TEXT').run().catch(() => {}); // già presente: ok
  schemaPronto = true;
}

// La coppia di chiavi VAPID (l'"identità" del sito presso Apple) si crea una volta sola e resta nel database.
async function chiavi(env, origine) {
  const leggi = async () => {
    const { results } = await env.DB.prepare(`SELECT key, value FROM meta WHERE key IN ('vapid_public', 'vapid_private', 'site')`).all();
    return Object.fromEntries(results.map((r) => [r.key, r.value]));
  };
  let k = await leggi();
  if (!k.vapid_public) {
    const v = await generateVapid();
    await env.DB.batch([ // atomico: se un'altra richiesta è arrivata prima, queste vengono ignorate
      env.DB.prepare(`INSERT OR IGNORE INTO meta (key, value) VALUES ('vapid_private', ?)`).bind(JSON.stringify(v.privateJwk)),
      env.DB.prepare(`INSERT OR IGNORE INTO meta (key, value) VALUES ('vapid_public', ?)`).bind(v.publicKey),
    ]);
    k = await leggi();
  }
  if (origine && k.site !== origine) { // l'indirizzo del sito serve come "contatto" nel messaggio a Apple
    await env.DB.prepare(`INSERT INTO meta (key, value) VALUES ('site', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`).bind(origine).run();
    k.site = origine;
  }
  return { publicKey: k.vapid_public, privateJwk: JSON.parse(k.vapid_private), subject: k.site || 'https://keepway.example' };
}

const leggiJson = async (request) => {
  if (Number(request.headers.get('content-length') || 0) > 200_000) return null;
  return request.json().catch(() => null);
};

async function iscrivi(env, request) {
  const d = await leggiJson(request);
  const device = String(d?.deviceId || '');
  const sub = d?.subscription || {};
  if (!DEVICE.test(device)) return err('deviceId non valido');
  const endpoint = String(sub.endpoint || '');
  const k = sub.keys || {};
  let u;
  try { u = new URL(endpoint); } catch { return err('Iscrizione non valida'); }
  if (u.protocol !== 'https:' || !PUSH_HOSTS.test(u.hostname) || endpoint.length > 700) return err('Servizio di notifica non supportato');
  try {
    const p = b64u.dec(k.p256dh), a = b64u.dec(k.auth);
    if (p.length !== 65 || p[0] !== 4 || a.length !== 16) throw new Error('chiavi');
    await crypto.subtle.importKey('raw', p, { name: 'ECDH', namedCurve: 'P-256' }, false, []); // deve essere un vero punto P-256
  } catch { return err('Chiavi non valide'); }
  await env.DB.prepare(
    `INSERT INTO subs (device_id, endpoint, p256dh, auth, creato, fallimenti) VALUES (?, ?, ?, ?, ?, 0)
     ON CONFLICT(device_id) DO UPDATE SET endpoint = excluded.endpoint, p256dh = excluded.p256dh, auth = excluded.auth, fallimenti = 0`,
  ).bind(device, endpoint, k.p256dh, k.auth, Date.now()).run();
  return json({ ok: true });
}

async function disiscrivi(env, request) {
  const d = await leggiJson(request);
  const device = String(d?.deviceId || '');
  if (!DEVICE.test(device)) return err('deviceId non valido');
  await env.DB.batch([
    env.DB.prepare('DELETE FROM subs WHERE device_id = ?').bind(device),
    env.DB.prepare('DELETE FROM piano WHERE device_id = ?').bind(device),
  ]);
  return json({ ok: true });
}

// L'app manda l'elenco completo delle notifiche future: sostituisce quello precedente di quel telefono.
async function salvaPiano(env, request) {
  const d = await leggiJson(request);
  const device = String(d?.deviceId || '');
  if (!DEVICE.test(device) || !Array.isArray(d.items)) return err('Dati non validi');
  const ora = Date.now();
  const salvo = CODICE.test(String(d.codice ?? '')) ? await impronta(String(d.codice)) : null;
  const righe = [];
  for (const it of d.items.slice(0, MAX_PIANO)) {
    const quando = Number(it?.quando);
    if (!Number.isFinite(quando) || quando < ora - 60_000 || quando > ora + 31 * 86_400_000) continue;
    const id = clip(it.id, 80);
    if (!id) continue;
    righe.push(
      env.DB.prepare('INSERT OR REPLACE INTO piano (device_id, id, quando, titolo, testo, url, tag, urgente, salvo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(device, id, Math.round(quando), clip(it.titolo, 100) || 'Keepway', clip(it.testo, 240), clip(it.url, 100) || '/oggi/', clip(it.tag, 40), it.urgente ? 1 : 0, it.senzaDati ? salvo : null),
    );
  }
  const collega = salvo ? [env.DB.prepare('INSERT OR IGNORE INTO collega (codice, device_id) VALUES (?, ?)').bind(salvo, device)] : [];
  await env.DB.batch([env.DB.prepare('DELETE FROM piano WHERE device_id = ?').bind(device), ...righe, ...collega]);
  return json({ ok: true, programmate: righe.length });
}

// Apple accetta come "topic" solo un codice base64url valido (max 32 caratteri): un'etichetta qualsiasi, come "prova", viene rifiutata
// (BadWebPushTopic). Lo si ricava dall'etichetta con un'impronta: 22 caratteri validi, sempre uguali per la stessa etichetta,
// così una notifica nuova sostituisce quella precedente non ancora consegnata.
const topicDa = async (tag) => {
  const impronta = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(tag || 'keepway')));
  return b64u.enc(new Uint8Array(impronta).slice(0, 16));
};

// Spedisce una notifica e aggiorna lo stato dell'iscrizione. Ritorna { stato, dettaglio }: stato = risposta del servizio push (201 = accettata),
// dettaglio = il motivo se non è andata (o l'errore, se non si è nemmeno arrivati ad Apple).
async function spedisci(env, vapid, sub, n) {
  const { status: stato, text: dettaglio } = await sendWebPushDetailed(
    sub,
    { title: n.titolo, body: n.testo || '', url: n.url || '/oggi/', tag: n.tag || 'keepway' },
    vapid,
    { ttl: 1800, topic: await topicDa(n.tag), urgency: n.urgente ? 'high' : 'normal' },
  ).catch((e) => ({ status: 0, text: String(e && e.message ? e.message : e).slice(0, 200) }));
  if (stato >= 200 && stato < 300) {
    await env.DB.prepare('UPDATE subs SET fallimenti = 0 WHERE device_id = ? AND fallimenti > 0').bind(sub.device_id).run();
  } else if (stato === 404 || stato === 410) { // il telefono ha tolto l'iscrizione
    await env.DB.batch([
      env.DB.prepare('DELETE FROM subs WHERE device_id = ?').bind(sub.device_id),
      env.DB.prepare('DELETE FROM piano WHERE device_id = ?').bind(sub.device_id),
    ]);
  } else {
    await env.DB.batch([
      env.DB.prepare('UPDATE subs SET fallimenti = fallimenti + 1 WHERE device_id = ?').bind(sub.device_id),
      env.DB.prepare('DELETE FROM subs WHERE device_id = ? AND fallimenti >= ?').bind(sub.device_id, MAX_FALLIMENTI),
    ]);
  }
  if (dettaglio) console.log(`push ${stato}: ${dettaglio}`);
  return { stato, dettaglio };
}

async function prova(env, request) {
  const d = await leggiJson(request);
  const device = String(d?.deviceId || '');
  if (!DEVICE.test(device)) return err('deviceId non valido');
  const sub = await env.DB.prepare('SELECT * FROM subs WHERE device_id = ?').bind(device).first();
  if (!sub) return err('Questo telefono non è iscritto alle notifiche', 404);
  const vapid = await chiavi(env, new URL(request.url).origin);
  // Prova «testi veri»: titolo invisibile (braille vuoto U+2800) e due esempi a caso di notifiche reali, per vedere come escono.
  if (d.variante === 'esempi') {
    const ESEMPI = [
      ['Sistema il soggiorno', '15 min · ti va di farlo adesso? 🧹', 'es-stanza'],
      ['Meditazione', '10 minuti · ti va di farlo adesso? 🧘', 'es-medit'],
      ['Lettura', 'Ultima chiamata per oggi. 📖', 'es-lettura'],
      ['Stendi il bucato', 'Ricordati di stendere il bucato 👕', 'es-bucato'],
      ['Vai a letto entro le 00:30', 'Sveglia alle 09:30, circa 9 ore di sonno. 🌙', 'es-sonno'],
      ['Appuntamento Psicologa', 'domani, martedì 5, alle 16:30 📅', 'es-app'],
      ['Conflitto turni', 'Solo 6 ore di riposo prima del turno 1… ⚠️', 'es-turni'],
      ['Riordina la scrivania', '20 min · ti va di farlo adesso? 💡', 'es-lampadina'],
    ];
    const scelti = [...ESEMPI].sort(() => Math.random() - 0.5).slice(0, 2);
    let ultimo = { stato: 0, dettaglio: '' };
    for (const [primo, secondo, tag] of scelti) {
      // il «titolo» invisibile + il testo su due righe: prima riga = cosa, seconda = dettaglio
      ultimo = await spedisci(env, vapid, sub, { titolo: '\u2800', testo: `→ ${grassetto(primo)}\n${secondo}`, tag, urgente: true });
    }
    return json({ ok: ultimo.stato >= 200 && ultimo.stato < 300, stato: ultimo.stato, dettaglio: ultimo.dettaglio, inviate: scelti.map((x) => x[0]) });
  }
  const { stato, dettaglio } = await spedisci(env, vapid, sub, { titolo: d.variante === 'vuoto' ? '' : 'Notifica', testo: d.variante === 'vuoto' ? 'Prova: titolo vuoto' : 'Le notifiche funzionano. Si parte.', tag: 'prova', urgente: true });
  return json({ ok: stato >= 200 && stato < 300, stato, dettaglio });
}

// Ogni minuto: prende le notifiche scadute (le "reclama" cancellandole, così due esecuzioni non le mandano due volte) e le spedisce.
async function tick(env) {
  await schema(env);
  const ora = Date.now();
  await env.DB.prepare('DELETE FROM piano WHERE quando < ?').bind(ora - TROPPO_TARDI_MS).run(); // troppo vecchie: via
  const { results: dovute } = await env.DB.prepare(
    `DELETE FROM piano WHERE rowid IN (SELECT rowid FROM piano WHERE quando <= ? ORDER BY quando LIMIT 40) RETURNING *`,
  ).bind(ora).all();
  if (!dovute.length) return 'nessuna notifica da inviare';

  const vapid = await chiavi(env, null);
  const esiti = [];
  for (const n of dovute) {
    const sub = await env.DB.prepare('SELECT * FROM subs WHERE device_id = ?').bind(n.device_id).first();
    if (!sub) continue;
    if (n.salvo) {
      // «nessuna attività ricevuta oggi»: se oggi è arrivato qualcosa, non serve
      const u = await env.DB.prepare('SELECT quando FROM ultimo WHERE codice = ?').bind(n.salvo).first();
      if (u && oggiRoma(u.quando) === oggiRoma(ora)) continue;
    }
    esiti.push((await spedisci(env, vapid, sub, n)).stato);
  }
  return `inviate ${esiti.filter((s) => s >= 200 && s < 300).length}/${dovute.length}`;
}

// --- Salute: i dati arrivano dal Comando Rapido dell'iPhone (che legge l'app Salute) con un indirizzo web e un codice personale. ---
const CODICE = /^[A-Za-z0-9]{24,64}$/;
const impronta = async (testo) => {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(testo));
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('');
};
const oggiRoma = (quando = Date.now()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(new Date(quando)); // AAAA-MM-GG

// Un numero scritto "all'italiana" dal Comando Rapido: "8.421" (migliaia), "6,7" (decimali), "8421".
function numero(v) {
  if (v === null || v === undefined || String(v).trim() === '') return null;
  let t = String(v).trim().replace(/\s/g, '');
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(t)) t = t.replace(/\./g, '').replace(',', '.');
  else t = t.replace(',', '.');
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : null;
}
// Il sonno può arrivare in ore (6,7), minuti (402) o secondi (24120): si capisce dal valore.
function sonnoInMinuti(v) {
  const n = numero(v);
  if (n === null) return null;
  const minuti = n <= 24 ? n * 60 : n <= 1500 ? n : n / 60;
  return Math.round(Math.min(minuti, 1440));
}
const ora = (v) => (/^([01]?\d|2[0-3])[:.]([0-5]\d)$/.test(String(v ?? '').trim()) ? String(v).trim().replace('.', ':').replace(/^(\d):/, '0$1:') : null);

// Il nome del workout come lo scrive Salute («Corsa», «Running», «Allenamento di forza»…) → corsa / palestra / altro
function tipoAllenamento(v) {
  const t = String(v ?? '').trim().toLowerCase();
  if (!t) return null;
  if (/cors|run|jog/.test(t)) return 'corsa';
  if (/palestra|forza|strength|gym|functional|funzion|pesi|hiit|cross/.test(t)) return 'palestra';
  return 'altro';
}

// «Corsa ricevuta»: una notifica sul telefono (o sui telefoni) che usano quel codice. Toccandola si apre Keepway, che segna la task.
async function avvisaAllenamento(env, cod, tipo, minuti, km, origine) {
  const { results: dispositivi } = await env.DB.prepare('SELECT s.* FROM collega c JOIN subs s ON s.device_id = c.device_id WHERE c.codice = ?').bind(cod).all();
  if (!dispositivi.length) return;
  const vapid = await chiavi(env, origine);
  const nome = tipo === 'corsa' ? 'Corsa' : 'Palestra';
  const dettaglio = [km ? `${String(Math.round(km * 10) / 10).replace('.', ',')} km` : '', minuti ? `${Math.round(minuti)} min` : ''].filter(Boolean).join(' · ');
  for (const sub of dispositivi) {
    await spedisci(env, vapid, sub, {
      titolo: '\u2800',
      testo: `→ ${grassetto(`${nome} ricevuta`)}\n${dettaglio || 'Tocca per segnarla'} ${tipo === 'corsa' ? '🏃' : '💪'}`,
      url: '/oggi/', tag: `allenamento-${tipo}`, urgente: true,
    });
  }
}

async function inviaSalute(env, url, request) {
  const dati = request.method === 'POST' ? (await leggiJson(request)) ?? {} : Object.fromEntries(url.searchParams);
  const t = String(dati.t ?? url.searchParams.get('t') ?? '');
  if (!CODICE.test(t)) return err('Codice non valido', 401);
  const giorno = /^\d{4}-\d{2}-\d{2}$/.test(String(dati.giorno ?? '')) ? dati.giorno : oggiRoma();
  const passi = numero(dati.passi);
  const sonno = sonnoInMinuti(dati.sonno);
  const letto = ora(dati.letto);
  const sveglia = ora(dati.sveglia);
  const tipo = tipoAllenamento(dati.allenamento);
  const minuti = numero(dati.minuti);
  const km = numero(dati.km);
  const analisi = dati.campioni ? analizzaCampioni(dati.campioni) : null; // il sonno grezzo: i conti li facciamo noi
  const haCampioni = !!analisi && analisi.righe > 0;
  if (dati.campioni && !haCampioni) return err(`Sonno non leggibile: ricevuti ${String(dati.campioni).length} caratteri e nessuna riga valida (versione sonno-1)`);
  if (passi === null && sonno === null && !letto && !sveglia && !tipo && !haCampioni) return err('Nessun dato da salvare');
  const cod = await impronta(t);
  await env.DB.prepare('INSERT INTO ultimo (codice, quando) VALUES (?, ?) ON CONFLICT(codice) DO UPDATE SET quando = excluded.quando').bind(cod, Date.now()).run();
  for (const n of analisi?.notti ?? []) {
    // la notte calcolata dai pezzi sostituisce quella di prima (è il dato più preciso)
    await env.DB.prepare(
      `INSERT INTO salute (codice, giorno, sonno_min, letto, sveglia, aggiornato) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(codice, giorno) DO UPDATE SET sonno_min = excluded.sonno_min, letto = excluded.letto, sveglia = excluded.sveglia, aggiornato = excluded.aggiornato`,
    ).bind(cod, n.giorno, n.minuti, n.letto, n.sveglia, Date.now()).run();
  }
  if (analisi?.sessioni?.length) {
    // le sessioni del periodo inviato sostituiscono quelle di prima (una sessione può crescere o fondersi con un'altra)
    const primo = Math.min(...analisi.sessioni.map((x) => x.inizio));
    await env.DB.batch([
      env.DB.prepare('DELETE FROM sonni WHERE codice = ? AND inizio >= ?').bind(cod, primo),
      ...analisi.sessioni.map((x) => env.DB.prepare('INSERT OR REPLACE INTO sonni (codice, inizio, fine, minuti) VALUES (?, ?, ?, ?)').bind(cod, x.inizio, x.fine, x.minuti)),
    ]);
  }
  if (haCampioni && passi === null && sonno === null && !letto && !sveglia && !tipo) return json({ ok: true, righe: analisi.righe, notti: analisi.notti });
  if (tipo) {
    const inizio = ora(dati.inizio) ?? '00:00';
    const nuovo = !(await env.DB.prepare('SELECT 1 AS x FROM allenamenti WHERE codice = ? AND giorno = ? AND tipo = ? AND inizio = ?').bind(cod, giorno, tipo, inizio).first());
    await env.DB.prepare(
      `INSERT INTO allenamenti (codice, giorno, tipo, inizio, minuti, km, aggiornato) VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(codice, giorno, tipo, inizio) DO UPDATE SET minuti = COALESCE(excluded.minuti, minuti), km = COALESCE(excluded.km, km), aggiornato = excluded.aggiornato`,
    ).bind(cod, giorno, tipo, inizio, minuti === null ? null : Math.round(minuti), km, Date.now()).run();
    if (nuovo && tipo !== 'altro' && giorno === oggiRoma()) await avvisaAllenamento(env, cod, tipo, minuti, km, new URL(request.url).origin).catch((e) => console.log('avviso allenamento', String(e)));
    if (passi === null && sonno === null && !letto && !sveglia) return json({ ok: true, giorno, allenamento: tipo, minuti, km, nuovo });
  }
  await env.DB.prepare(
    `INSERT INTO salute (codice, giorno, passi, sonno_min, letto, sveglia, aggiornato) VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(codice, giorno) DO UPDATE SET passi = COALESCE(excluded.passi, passi), sonno_min = COALESCE(excluded.sonno_min, sonno_min),
       letto = COALESCE(excluded.letto, letto), sveglia = COALESCE(excluded.sveglia, sveglia), aggiornato = excluded.aggiornato`,
  ).bind(await impronta(t), giorno, passi === null ? null : Math.round(passi), sonno, letto, sveglia, Date.now()).run();
  await env.DB.prepare('DELETE FROM salute WHERE aggiornato < ?').bind(Date.now() - 400 * 86_400_000).run(); // si tiene poco più di un anno
  return json({ ok: true, giorno, passi: passi === null ? null : Math.round(passi), sonnoMin: sonno, letto, sveglia });
}

async function leggiSalute(env, url) {
  const t = String(url.searchParams.get('t') ?? '');
  if (!CODICE.test(t)) return err('Codice non valido', 401);
  const giorni = Math.min(60, Math.max(1, Number(url.searchParams.get('giorni')) || 14));
  const { results } = await env.DB.prepare('SELECT giorno, passi, sonno_min, letto, sveglia, aggiornato FROM salute WHERE codice = ? ORDER BY giorno DESC LIMIT ?')
    .bind(await impronta(t), giorni).all();
  const cod = await impronta(t);
  const { results: al } = await env.DB.prepare('SELECT giorno, tipo, inizio, minuti, km, aggiornato FROM allenamenti WHERE codice = ? ORDER BY giorno DESC, inizio DESC LIMIT 60').bind(cod).all();
  const u = await env.DB.prepare('SELECT quando FROM ultimo WHERE codice = ?').bind(cod).first();
  const { results: sn } = await env.DB.prepare('SELECT inizio, fine, minuti FROM sonni WHERE codice = ? ORDER BY inizio DESC LIMIT 120').bind(cod).all();
  return json({ ultimo: u?.quando ?? null, sonni: sn.reverse(), allenamenti: al, giorni: results.map((r) => ({ giorno: r.giorno, passi: r.passi, sonnoMin: r.sonno_min, letto: r.letto, sveglia: r.sveglia, aggiornato: r.aggiornato })) });
}

async function cancellaSalute(env, url) {
  const t = String(url.searchParams.get('t') ?? '');
  if (!CODICE.test(t)) return err('Codice non valido', 401);
  const c = await impronta(t);
  await env.DB.batch(['salute', 'allenamenti', 'ultimo', 'collega', 'sonni'].map((tab) => env.DB.prepare(`DELETE FROM ${tab} WHERE codice = ?`).bind(c)));
  return json({ ok: true });
}

const gestore = {
  async scheduled(_event, env, ctx) {
    if (!env.DB) return; // database non ancora collegato
    ctx.waitUntil(tick(env).then((m) => console.log(m)).catch((e) => console.log('errore invio', String(e))));
  },

  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return new Response('Not found', { status: 404 });
    if (!env.DB) return err('Notifiche non ancora configurate (manca il database)', 503);
    try {
      await schema(env);
      const { pathname: p } = url;
      const m = request.method;
      if (p === '/api/push/key' && m === 'GET') return json({ key: (await chiavi(env, url.origin)).publicKey });
      if (p === '/api/push/subscribe' && m === 'POST') return await iscrivi(env, request);
      if (p === '/api/push/unsubscribe' && m === 'POST') return await disiscrivi(env, request);
      if (p === '/api/push/test' && m === 'POST') return await prova(env, request);
      if (p === '/api/piano' && m === 'PUT') return await salvaPiano(env, request);
      if (p === '/api/salute/invia' && (m === 'GET' || m === 'POST')) return await inviaSalute(env, url, request); // anche GET: più facile da fare nei Comandi Rapidi
      if (p === '/api/salute' && m === 'GET') return await leggiSalute(env, url);
      if (p === '/api/salute/cancella' && (m === 'POST' || m === 'DELETE')) return await cancellaSalute(env, url);
      return err('Not found', 404);
    } catch (e) {
      console.log('errore api', String(e));
      return err('Errore del server', 500);
    }
  },
};

export default gestore;
