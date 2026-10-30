import roster from "@/data/roster.json";

// Un giorno del calendario: d = data (AAAA-MM-GG), t = codice turno, o = orario ("07:00-13:00").
export type Giorno = { d: string; t: string; o: string; u: string };

// --- Abitudini di sonno (modificabili: poi le portiamo nelle Impostazioni) ---
const SONNO_IDEALE_MIN = 8 * 60;
const SONNO_MINIMO_MIN = 7 * 60;
const PREPARAZIONE_MIN = 60; // dalla sveglia all'inizio del turno (turno 7:00 -> sveglia 6:00)
const SVEGLIA_TARDA = 9 * 60 + 30; // prima di un turno 13:00 o 19:00 ci si sveglia verso le 9:30
const DOPO_TURNO_MIN = 90; // dopo un turno: rientro e tempo per staccare (un 4 che finisce all'1:00 -> a letto alle 2:30)
const DOPO_NOTTE_MIN = 60; // dopo una notte (finisce alle 7:00) si va a letto alle 8:00
const SVEGLIA_DOPO_NOTTE = 14 * 60 + 30; // dopo la notte ci si sveglia verso le 14:30
const NOTTE_PRIMA_ORE = 7 * 60; // riposino prima di una notte: sveglia 7 ore prima dell'inizio (01:00 -> 18:00)
const ORE_PER_NOTTE_VERA = 5 * 60; // un turno che inizia prima delle 5:00 è una notte

const RIPOSI = ["RD", "R"];
const MIN_GIORNO = 24 * 60;

export const èRiposo = (g: Giorno | undefined) => !g || RIPOSI.includes(g.t);

const aMinuti = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

// Minuti assoluti (dall'1/1/1970) della mezzanotte di una data: serve per i conti a cavallo della mezzanotte.
const mezzanotte = (d: string) => {
  const [a, m, g] = d.split("-").map(Number);
  return Date.UTC(a, m - 1, g) / 60000;
};

export const hhmm = (assoluti: number) => {
  const m = ((assoluti % MIN_GIORNO) + MIN_GIORNO) % MIN_GIORNO;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};

// --- Blocchi di lavoro ---
// Il doppio turno "1 + 4" dà due blocchi (01:00-07:00 e 19:00-01:00). Il turno 1 inizia all'1:00
// *della data indicata*, quindi dopo una mattina il giorno prima è la stessa nottata.
type Blocco = { inizio: number; fine: number; notte: boolean; turno: string };

function costruisciBlocchi(): Blocco[] {
  const out: Blocco[] = [];
  for (const g of roster as Giorno[]) {
    if (èRiposo(g) || !g.o) continue;
    const base = mezzanotte(g.d);
    for (const fascia of g.o.split("/")) {
      const [i, e] = fascia.trim().split("-").map(aMinuti);
      out.push({
        inizio: base + i,
        fine: base + (e <= i ? e + MIN_GIORNO : e),
        notte: i < ORE_PER_NOTTE_VERA,
        turno: g.t,
      });
    }
  }
  return out.sort((a, b) => a.inizio - b.inizio);
}

// --- Sonni calcolati ---
export type TipoSonno = "dopo_notte" | "riposino" | "notte";
export type Sonno = {
  tipo: TipoSonno;
  turno: string; // il turno a cui si riferisce (precede o segue)
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
    aLetto,
    sveglia,
    ultimoLetto: aLetto === svegliaAbituale - SONNO_IDEALE_MIN ? sveglia - SONNO_MINIMO_MIN : undefined,
    ore,
    corto: ore < SONNO_MINIMO_MIN,
  };
}

function costruisciSonni(): Sonno[] {
  const blocchi = costruisciBlocchi();
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
      out.push({ tipo: "riposino", turno: q.turno, aLetto, sveglia, ore: sveglia - aLetto, corto: sveglia - aLetto < SONNO_MINIMO_MIN });
      return;
    }

    // Tutti gli altri casi: notte normale prima del turno.
    out.push(sonnoRegolare(q, p?.notte ? null : p ? p.fine : null));
  });
  return out.sort((a, b) => a.aLetto - b.aLetto);
}

const sonni = costruisciSonni();

// --- Cosa mostrare ---
export type ConsiglioSonno = {
  sonno: Sonno;
  quando: string; // "oggi", "stanotte", "domani"
  aLetto: string;
  sveglia: string;
  ultimoLetto?: string;
  oreTxt: string;
  titolo: string;
  messaggio: string;
};

const MAX_ANTICIPO_MIN = 24 * 60; // non mostrare sonni oltre le prossime 24 ore

export function consiglioSonno(adesso: Date): ConsiglioSonno | null {
  const p = (x: number) => String(x).padStart(2, "0");
  const oggi = `${adesso.getFullYear()}-${p(adesso.getMonth() + 1)}-${p(adesso.getDate())}`;
  const ora = mezzanotte(oggi) + adesso.getHours() * 60 + adesso.getMinutes();

  const s = sonni.find((x) => x.sveglia > ora);
  if (!s || s.aLetto - ora > MAX_ANTICIPO_MIN) return null;

  const giorniDiff = Math.floor(s.aLetto / MIN_GIORNO) - Math.floor(ora / MIN_GIORNO);
  const oraLetto = ((s.aLetto % MIN_GIORNO) + MIN_GIORNO) % MIN_GIORNO;
  const quando =
    giorniDiff <= 0 ? "oggi" : oraLetto < 6 * 60 ? "stanotte" : "domani";

  const ore = s.ore / 60;
  const oreTxt = (Math.round(ore * 2) / 2).toString().replace(".", ",");
  const aLetto = hhmm(s.aLetto);
  const sveglia = hhmm(s.sveglia);

  let titolo: string;
  let messaggio: string;
  if (s.tipo === "dopo_notte") {
    titolo = "Dopo la notte";
    messaggio = `Finito il turno, a letto verso le ${aLetto}. Sveglia ${sveglia}: circa ${oreTxt} ore. È meno del minimo, quindi stasera niente tardi.`;
  } else if (s.tipo === "riposino") {
    titolo = "Riposino prima della notte";
    messaggio = `Turno ${s.turno} inizia all'1:00 di stanotte. Riposino dalle ${aLetto} alle ${sveglia} (circa ${oreTxt} ore), poi preparati.`;
  } else {
    titolo = `Prima del turno ${s.turno}`;
    messaggio = s.corto
      ? `Sveglia ${sveglia}. Puoi dormire solo circa ${oreTxt} ore: giornata di recupero, poche task leggere.`
      : s.ultimoLetto
        ? `Sveglia ${sveglia}. A letto per le ${aLetto} (${oreTxt} ore). Al più tardi alle ${hhmm(s.ultimoLetto)} per arrivare a 7 ore.`
        : `Sveglia ${sveglia}. A letto non prima delle ${aLetto} (${oreTxt} ore di sonno).`;
  }

  return { sonno: s, quando, aLetto, sveglia, ultimoLetto: s.ultimoLetto ? hhmm(s.ultimoLetto) : undefined, oreTxt, titolo, messaggio };
}
