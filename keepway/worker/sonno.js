// Il sonno arriva dal Comando Rapido come elenco grezzo di «pezzi» (una riga per pezzo: valore;inizio;fine).
// Qui si decide tutto: quali pezzi sono sonno vero, quali si fondono in una notte, a che giorno appartiene ogni notte.

const MESI = { gen: 1, feb: 2, mar: 3, apr: 4, mag: 5, giu: 6, lug: 7, ago: 8, set: 9, ott: 10, nov: 11, dic: 12 };

// Differenza (minuti) tra l'ora di Roma e UTC in quell'istante.
function scartoRoma(ms) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Rome', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
      .formatToParts(new Date(ms)).map((x) => [x.type, x.value]),
  );
  return (Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute) - Math.floor(ms / 60000) * 60000) / 60000;
}
const romaInMs = (a, m, g, h, min) => {
  const base = Date.UTC(a, m - 1, g, h, min);
  let ms = base - scartoRoma(base) * 60000;
  ms = base - scartoRoma(ms) * 60000; // secondo giro: vicino al cambio ora legale
  return ms;
};

// Legge una data scritta in uno dei modi in cui la scrive Comandi rapidi: «02/11/26, 04:12», «2 nov 2026 alle 04:12», «2026-11-02 04:12»…
export function leggiData(testo) {
  const t = String(testo ?? '').trim().toLowerCase();
  let m = t.match(/(\d{4})-(\d{2})-(\d{2})[t\s,]+(\d{1,2})[:.](\d{2})/);
  if (m) return romaInMs(+m[1], +m[2], +m[3], +m[4], +m[5]);
  m = t.match(/(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})\D+(\d{1,2})[:.](\d{2})/);
  if (m) return romaInMs(m[3].length === 2 ? 2000 + +m[3] : +m[3], +m[2], +m[1], +m[4], +m[5]);
  m = t.match(/(\d{1,2})\s+([a-zà-ù]{3})[a-zà-ù]*\.?,?\s+(\d{4})\D+(\d{1,2})[:.](\d{2})/);
  if (m && MESI[m[2]]) return romaInMs(+m[3], MESI[m[2]], +m[1], +m[4], +m[5]);
  return null;
}

// Un pezzo è sonno vero se non è «sveglio» né «a letto» (in inglese o in italiano).
const èSonno = (v) => !/awake|in bed|inbed|sveglio|a letto|letto/i.test(v) && /core|deep|rem|asleep|profond|dorm|addorm|sonno|\d/i.test(v || 'asleep');

const hhmmRoma = (ms) => new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(ms));
const giornoRoma = (ms) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(new Date(ms));

// Da un elenco «valore;inizio;fine» (una riga per pezzo) alle notti: [{ giorno, minuti, letto, sveglia }].
export function analizzaCampioni(testo) {
  const pezzi = [];
  let righe = 0;
  for (const riga of String(testo ?? '').split(/\r?\n/)) {
    const campi = riga.split(';');
    if (campi.length < 3) continue;
    righe++;
    const inizio = leggiData(campi[1]);
    const fine = leggiData(campi[2]);
    if (inizio === null || fine === null || fine <= inizio) continue;
    if (!èSonno(campi[0])) continue;
    pezzi.push([inizio, fine]);
  }
  // unione dei pezzi sovrapposti (Watch + iPhone non devono contare due volte)
  pezzi.sort((a, b) => a[0] - b[0]);
  const uniti = [];
  for (const p of pezzi) {
    const ultimo = uniti[uniti.length - 1];
    if (ultimo && p[0] <= ultimo[1]) ultimo[1] = Math.max(ultimo[1], p[1]);
    else uniti.push([...p]);
  }
  // pezzi separati da meno di 90 minuti di veglia = la stessa notte
  const notti = [];
  for (const p of uniti) {
    const n = notti[notti.length - 1];
    if (n && p[0] - n.fine <= 90 * 60_000) {
      n.minuti += (p[1] - p[0]) / 60000;
      n.fine = p[1];
    } else notti.push({ inizio: p[0], fine: p[1], minuti: (p[1] - p[0]) / 60000 });
  }
  // ogni notte appartiene al giorno in cui finisce. Il primo giorno del periodo inviato può essere tagliato (la notte potrebbe iniziare prima
  // dei dati ricevuti): si salta, e si tengono tutte le altre. Così un invio di 30 giorni recupera lo storico, e uno di 3 aggiorna gli ultimi giorni.
  const limite = pezzi.length ? giornoRoma(pezzi[0][0]) : '';
  const perGiorno = new Map();
  for (const n of notti) {
    const giorno = giornoRoma(n.fine);
    if (giorno <= limite) continue;
    const g = perGiorno.get(giorno) ?? { giorno, minuti: 0, inizio: n.inizio, fine: n.fine };
    g.minuti += n.minuti;
    g.inizio = Math.min(g.inizio, n.inizio);
    g.fine = Math.max(g.fine, n.fine);
    perGiorno.set(giorno, g);
  }
  return {
    righe,
    notti: [...perGiorno.values()].map((g) => ({ giorno: g.giorno, minuti: Math.round(g.minuti), letto: hhmmRoma(g.inizio), sveglia: hhmmRoma(g.fine) })),
  };
}
