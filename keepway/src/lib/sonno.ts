import { blocchiEffettivi, giornoEffettivo, versioneCalendario, type BloccoLavoro } from "./calendario";

// --- Abitudini di sonno (modificabili: poi le portiamo nelle Impostazioni) ---
const SONNO_IDEALE_MIN = 8 * 60;
const SONNO_MINIMO_MIN = 7 * 60;
const PREPARAZIONE_MIN = 60; // dalla sveglia all'inizio del turno (turno 7:00 -> sveglia 6:00)
const SVEGLIA_TARDA = 9 * 60 + 30; // prima di un turno 13:00 o 19:00 ci si sveglia verso le 9:30
const DOPO_TURNO_MIN = 90; // dopo un turno: rientro e tempo per staccare (un 4 che finisce all'1:00 -> a letto alle 2:30)
const DOPO_NOTTE_MIN = 60; // dopo una notte (finisce alle 7:00) si va a letto alle 8:00
const SVEGLIA_DOPO_NOTTE = 14 * 60 + 30; // dopo la notte ci si sveglia verso le 14:30
const NOTTE_PRIMA_ORE = 7 * 60; // riposino prima di una notte: sveglia 7 ore prima dell'inizio (01:00 -> 18:00)

const MIN_GIORNO = 24 * 60;

// Minuti assoluti (dall'1/1/1970) della mezzanotte di una data: serve per i conti a cavallo della mezzanotte.
const mezzanotte = (d: string) => {
  const [a, m, g] = d.split("-").map(Number);
  return Date.UTC(a, m - 1, g) / 60000;
};

export const hhmm = (assoluti: number) => {
  const m = ((assoluti % MIN_GIORNO) + MIN_GIORNO) % MIN_GIORNO;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};

// --- Blocchi di lavoro: vengono da calendario.ts (turni importati + modifiche) ---
type Blocco = BloccoLavoro;

// --- Sonni calcolati ---
export type TipoSonno = "dopo_notte" | "riposino" | "notte";
export type Sonno = {
  tipo: TipoSonno;
  turno: string; // il turno a cui si riferisce (precede o segue)
  inizio?: number; // solo "notte" e "riposino": quando inizia quel turno (minuti assoluti)
  aLetto: number; // minuti assoluti
  sveglia: number;
  ultimoLetto?: number; // solo per "notte": l'ultimo orario che garantisce le 7 ore
  ore: number;
  corto: boolean; // meno di 7 ore (previsto: dopo la notte o prima di una notte)
};

// Sonno "normale" prima del blocco q, tenendo conto che il turno precedente finisce a `fineP` (se c'è).
function sonnoRegolare(q: Blocco, fineP: number | null): Sonno {
  const base = Math.floor(q.inizio / MIN_GIORNO) * MIN_GIORNO;
  const limite = q.inizio - PREPARAZIONE_MIN; // più tardi di così arrivo in ritardo
  const svegliaAbituale = Math.min(limite, base + SVEGLIA_TARDA);

  const vincolo = fineP === null ? -Infinity : fineP + DOPO_TURNO_MIN;
  const aLetto = Math.max(svegliaAbituale - SONNO_IDEALE_MIN, vincolo);
  // Se si va a letto tardi, la sveglia slitta (fino al limite) per arrivare almeno a 7 ore.
  const sveglia = Math.min(limite, Math.max(svegliaAbituale, aLetto + SONNO_MINIMO_MIN));
  const ore = sveglia - aLetto;
  return {
    tipo: "notte",
    turno: q.turno,
    inizio: q.inizio,
    aLetto,
    sveglia,
    ultimoLetto: aLetto === svegliaAbituale - SONNO_IDEALE_MIN ? sveglia - SONNO_MINIMO_MIN : undefined,
    ore,
    corto: ore < SONNO_MINIMO_MIN,
  };
}

function costruisciSonni(blocchi: Blocco[]): Sonno[] {
  const out: Sonno[] = [];
  blocchi.forEach((q, i) => {
    const p = i > 0 ? blocchi[i - 1] : null;
    const distanza = p ? q.inizio - p.fine : Infinity;

    // Dopo una notte: a letto alle 8:00, sveglia verso le 14:30 (meno delle 7 ore, ma è la tua abitudine).
    if (p?.notte) {
      const aLetto = p.fine + DOPO_NOTTE_MIN;
      const base = Math.floor(p.fine / MIN_GIORNO) * MIN_GIORNO;
      const sveglia = Math.min(base + SVEGLIA_DOPO_NOTTE, q.inizio - PREPARAZIONE_MIN);
      out.push({ tipo: "dopo_notte", turno: p.turno, aLetto, sveglia, ore: sveglia - aLetto, corto: sveglia - aLetto < SONNO_MINIMO_MIN });
      if (distanza < 20 * 60) return; // il prossimo blocco è lo stesso giorno: questo è l'unico sonno
    }

    // Mattina e poi notte: riposino dalle 14:30 alle 18:00 prima del turno che inizia all'1:00.
    if (q.notte && p && distanza <= 16 * 60) {
      const aLetto = p.fine + DOPO_TURNO_MIN;
      const sveglia = q.inizio - NOTTE_PRIMA_ORE;
      out.push({ tipo: "riposino", turno: q.turno, inizio: q.inizio, aLetto, sveglia, ore: sveglia - aLetto, corto: sveglia - aLetto < SONNO_MINIMO_MIN });
      return;
    }

    // Tutti gli altri casi: notte normale prima del turno.
    out.push(sonnoRegolare(q, p?.notte ? null : p ? p.fine : null));
  });
  return out.sort((a, b) => a.aLetto - b.aLetto);
}

// I sonni si ricalcolano quando cambiano i turni (una modifica, un'importazione).
let sonniVersione = -1;
let sonniCache: Sonno[] = [];
const elencoSonni = (): Sonno[] => {
  const v = versioneCalendario();
  if (v !== sonniVersione) {
    sonniCache = costruisciSonni(blocchiEffettivi());
    sonniVersione = v;
  }
  return sonniCache;
};

// --- Cosa mostrare ---
export type ConsiglioSonno = {
  sonno: Sonno;
  quando: string; // "oggi", "stanotte", "domani"
  aLetto: string;
  sveglia: string;
  ultimoLetto?: string;
  oreTxt: string;
  riga1: string; // "Domani hai il 3° turno"
  riga2: string; // "Dovresti addormentarti entro le 01:30"
  dettaglio: string; // sveglia e ore di sonno
};

const MAX_ANTICIPO_MIN = 24 * 60; // non mostrare sonni oltre le prossime 24 ore

// "oggi", "stanotte", "domani"... per un turno che inizia a `inizio` (minuti assoluti), visto da `ora`.
function giornoTurno(inizio: number, ora: number): string {
  const diff = Math.floor(inizio / MIN_GIORNO) - Math.floor(ora / MIN_GIORNO);
  const oraInizio = ((inizio % MIN_GIORNO) + MIN_GIORNO) % MIN_GIORNO;
  if (diff <= 0) return "oggi";
  if (diff === 1) return oraInizio < 5 * 60 ? "stanotte" : "domani"; // il turno 1 inizia all'1:00 della data indicata
  return diff === 2 ? "dopodomani" : `tra ${diff} giorni`;
}

const maiuscola = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const nomeTurno = (codice: string) => (codice.includes("+") ? `il doppio turno ${codice}` : `il ${codice}° turno`);

export function consiglioSonno(adesso: Date): ConsiglioSonno | null {
  const p = (x: number) => String(x).padStart(2, "0");
  const oggi = `${adesso.getFullYear()}-${p(adesso.getMonth() + 1)}-${p(adesso.getDate())}`;
  const ora = mezzanotte(oggi) + adesso.getHours() * 60 + adesso.getMinutes();

  const s = elencoSonni().find((x) => x.sveglia > ora);
  if (!s || s.aLetto - ora > MAX_ANTICIPO_MIN) return null;

  const giorniDiff = Math.floor(s.aLetto / MIN_GIORNO) - Math.floor(ora / MIN_GIORNO);
  const oraLetto = ((s.aLetto % MIN_GIORNO) + MIN_GIORNO) % MIN_GIORNO;
  const quando = giorniDiff <= 0 ? "oggi" : oraLetto < 6 * 60 ? "stanotte" : "domani";

  const ore = s.ore / 60;
  const oreTxt = (Math.round(ore * 2) / 2).toString().replace(".", ",");
  const aLetto = hhmm(s.aLetto);
  const sveglia = hhmm(s.sveglia);
  const turnoRiga = s.inizio !== undefined ? `${maiuscola(giornoTurno(s.inizio, ora))} hai ${nomeTurno(s.turno)}` : "";

  let riga1: string;
  let riga2: string;
  let dettaglio: string;
  if (s.tipo === "dopo_notte") {
    riga1 = "Dopo il turno di notte, riposati";
    riga2 = `Dovresti addormentarti entro le ${aLetto}`;
    dettaglio = `Sveglia verso le ${sveglia}: circa ${oreTxt} ore di sonno. Stasera non fare tardi.`;
  } else if (s.tipo === "riposino") {
    riga1 = turnoRiga;
    riga2 = `Dovresti riposare dalle ${aLetto} alle ${sveglia}`;
    dettaglio = `Circa ${oreTxt} ore di sonno, poi preparati.`;
  } else if (s.corto) {
    riga1 = turnoRiga;
    riga2 = `Puoi addormentarti alle ${aLetto}`;
    dettaglio = `Sveglia alle ${sveglia}: dormi solo circa ${oreTxt} ore. Giornata leggera.`;
  } else {
    riga1 = turnoRiga;
    riga2 = `Dovresti addormentarti entro le ${aLetto}`;
    dettaglio = s.ultimoLetto
      ? `Sveglia alle ${sveglia}: ${oreTxt} ore di sonno. Al più tardi alle ${hhmm(s.ultimoLetto)}, per arrivare a 7 ore.`
      : `Sveglia alle ${sveglia}: ${oreTxt} ore di sonno.`;
  }

  return { sonno: s, quando, aLetto, sveglia, ultimoLetto: s.ultimoLetto ? hhmm(s.ultimoLetto) : undefined, oreTxt, riga1, riga2, dettaglio };
}

// --- Silenzio per le notifiche: durante i turni (mezz'ora prima compresa) e durante il sonno ---
// `m` = minuti assoluti "locali" (come nel resto del calendario).
const silenzioMin = (m: number) =>
  blocchiEffettivi().some((b) => m >= b.inizio - 30 && m < b.fine) || // in turno, o in procinto di andarci
  elencoSonni().some((x) => m >= x.aLetto && m < x.sveglia);

// `ms` = istante reale (ms dal 1970): si converte l'ora locale del telefono.
export function èInSilenzio(ms: number): boolean {
  const d = new Date(ms);
  return silenzioMin(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 60000 + d.getHours() * 60 + d.getMinutes());
}

// --- Momenti liberi della giornata (né in turno, né a dormire) ---
export type Finestra = { da: number; a: number }; // minuti dalla mezzanotte

export function finestreLibere(data: string, da = 8 * 60, a = 22 * 60 + 30, minDurata = 30): Finestra[] {
  const base = mezzanotte(data);
  const out: Finestra[] = [];
  let inizio: number | null = null;
  for (let t = da; t <= a; t += 15) {
    const libero = t < a && !silenzioMin(base + t);
    if (libero && inizio === null) inizio = t;
    if (!libero && inizio !== null) {
      if (t - inizio >= minDurata) out.push({ da: inizio, a: t });
      inizio = null;
    }
  }
  return out;
}

// Il momento libero più lungo della giornata (almeno 45 minuti): quello giusto per una task che richiede tempo.
export function finestraMigliore(data: string, minimo = 45): Finestra | null {
  const tutte = finestreLibere(data, 8 * 60, 22 * 60 + 30, Math.max(30, minimo));
  return tutte.reduce<Finestra | null>((m, f) => (!m || f.a - f.da > m.a - m.da ? f : m), null);
}

// --- Conflitti: un appuntamento che cade in un turno o nel sonno ---
export type Conflitto = { tipo: "turno" | "sonno" | "dati"; testo: string };

const PREPARAZIONE_TURNO_MIN = 40; // prima di un turno servono ancora un po' di tempo per mangiare e prepararsi (con 20 min di rientro: finire 1 ora prima)

// `da`/`a` = minuti dalla mezzanotte di `data` (a può superare le 24:00). `spostamento` = minuti per andare (e altrettanti per tornare).
export function conflittiAgenda(data: string, da: number, a: number, spostamento = 0): Conflitto[] {
  if (!giornoEffettivo(data)) return [{ tipo: "dati", testo: "Per quel giorno non ho i turni: non posso controllare i conflitti." }];
  const base = mezzanotte(data);
  const inizioOcc = base + da - spostamento; // partenza da casa
  const fineOcc = base + a + spostamento; // rientro a casa
  const out: Conflitto[] = [];
  for (const b of blocchiEffettivi()) {
    if (!(inizioOcc < b.fine && fineOcc > b.inizio - PREPARAZIONE_TURNO_MIN)) continue;
    const turno = `turno ${b.turno} (${hhmm(b.inizio)}–${hhmm(b.fine)})`;
    if (base + da < b.fine && base + a > b.inizio) out.push({ tipo: "turno", testo: `Cade durante il ${turno}` });
    else if (base + da >= b.fine) out.push({ tipo: "turno", testo: `Inizia troppo a ridosso del ${turno}: con ${spostamento} min di spostamento parti prima che finisca` });
    else out.push({ tipo: "turno", testo: `Finisce troppo a ridosso del ${turno}: con ${spostamento} min di rientro e il tempo per prepararti non ci arrivi` });
  }
  for (const x of elencoSonni()) {
    if (inizioOcc < x.sveglia && fineOcc > x.aLetto) {
      const nome =
        x.tipo === "dopo_notte" ? "il sonno dopo la notte" : x.tipo === "riposino" ? "il riposino prima della notte" : `il sonno prima del turno ${x.turno}`;
      out.push({ tipo: "sonno", testo: `Cade durante ${nome} (${hhmm(x.aLetto)}–${hhmm(x.sveglia)})` });
    }
  }
  return out;
}
