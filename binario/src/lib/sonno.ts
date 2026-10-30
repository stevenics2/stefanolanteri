import roster from "@/data/roster.json";

// Un giorno del calendario: d = data (AAAA-MM-GG), t = codice turno, o = orario ("07:00-13:00").
export type Giorno = { d: string; t: string; o: string; u: string };

// --- Regole (modificabili: poi le portiamo nelle Impostazioni) ---
const PREPARAZIONE_MIN = 60; // dalla sveglia all'inizio del turno (turno 7:00 -> sveglia 6:00)
const SVEGLIA_MAX = 8 * 60; // nei turni pomeridiani/serali non serve alzarsi prima delle 8:00
const SONNO_IDEALE_MIN = 8 * 60;
const SONNO_MINIMO_MIN = 7 * 60;
const DOPO_TURNO_MIN = 45; // rientro a casa e tempo per staccare prima di dormire

const RIPOSI = ["RD", "R"];
const MIN_GIORNO = 24 * 60;

const per_data = new Map((roster as Giorno[]).map((g) => [g.d, g]));

export const èRiposo = (g: Giorno | undefined) => !g || RIPOSI.includes(g.t);

// "07:00" -> 420
const aMinuti = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

// Minuti dall'inizio di una data, per fare i conti a cavallo della mezzanotte.
const giornoIndice = (d: string) => {
  const [a, m, g] = d.split("-").map(Number);
  return Math.round(Date.UTC(a, m - 1, g) / 60000) / MIN_GIORNO;
};

export const dataPiù = (d: string, giorni: number) => {
  const [a, m, g] = d.split("-").map(Number);
  const x = new Date(Date.UTC(a, m - 1, g + giorni));
  return x.toISOString().slice(0, 10);
};

// Inizio e fine del turno in "minuti assoluti" (fine dopo mezzanotte -> +24h). Per i doppi turni: primo inizio, ultima fine.
function finestra(g: Giorno): { inizio: number; fine: number } | null {
  if (èRiposo(g) || !g.o) return null;
  const base = giornoIndice(g.d) * MIN_GIORNO;
  const fasce = g.o.split("/").map((f) => f.trim());
  const parse = (f: string) => {
    const [i, e] = f.split("-").map(aMinuti);
    return { inizio: i, fine: e <= i ? e + MIN_GIORNO : e };
  };
  const tutte = fasce.map(parse);
  return {
    inizio: base + tutte[0].inizio,
    fine: base + tutte[tutte.length - 1].fine,
  };
}

export type ConsiglioSonno =
  | { tipo: "libero"; perChi: string } // domani riposo: nessun vincolo
  | {
      tipo: "sonno";
      turnoDomani: string;
      sveglia: string; // "06:00"
      aLetto: string; // ora consigliata per andare a dormire ("22:00")
      aLettoGiorno: "oggi" | "domani"; // il letto può cadere dopo mezzanotte
      oreDormite: number; // ore realmente possibili
      ok: boolean; // false se oggi si finisce troppo tardi per arrivare a 7 ore
      messaggio: string;
    };

const hhmm = (assoluti: number) => {
  const m = ((assoluti % MIN_GIORNO) + MIN_GIORNO) % MIN_GIORNO;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};

// Cosa dire la sera del giorno `oggi` (AAAA-MM-GG) riguardo al turno di domani.
export function consiglioSonno(oggi: string): ConsiglioSonno | null {
  const domani = per_data.get(dataPiù(oggi, 1));
  if (!domani) return null;
  const f = finestra(domani);
  if (!f) return { tipo: "libero", perChi: domani.t };

  const giornoDomani = giornoIndice(domani.d) * MIN_GIORNO;
  const svegliaLimite = f.inizio - PREPARAZIONE_MIN; // più tardi di così arrivo in ritardo al turno
  const svegliaAbituale = Math.min(svegliaLimite, giornoDomani + SVEGLIA_MAX);

  // Quando posso al più presto mettermi a letto, in base al turno di oggi (se lavoro).
  const turnoOggi = per_data.get(oggi);
  const fo = turnoOggi ? finestra(turnoOggi) : null;
  const prima = fo ? fo.fine + DOPO_TURNO_MIN : -Infinity;

  // Se oggi finisco tardi, la sveglia slitta in avanti (fino al limite del turno) per avere le 8 ore.
  const aLetto = Math.max(svegliaAbituale - SONNO_IDEALE_MIN, prima);
  const sveglia = Math.min(svegliaLimite, Math.max(svegliaAbituale, aLetto + SONNO_IDEALE_MIN));
  const ore = (sveglia - aLetto) / 60;
  const ok = sveglia - aLetto >= SONNO_MINIMO_MIN;
  const giornoOggi = giornoIndice(oggi) * MIN_GIORNO;

  const oreTxt = ore.toFixed(1).replace(".0", "").replace(".", ",");
  return {
    tipo: "sonno",
    turnoDomani: domani.t,
    sveglia: hhmm(sveglia),
    aLetto: hhmm(aLetto),
    aLettoGiorno: aLetto >= giornoOggi + MIN_GIORNO ? "domani" : "oggi",
    oreDormite: Math.round(ore * 10) / 10,
    ok,
    messaggio: ok
      ? `Domani turno ${domani.t}: sveglia alle ${hhmm(sveglia)}. A letto entro le ${hhmm(aLetto)} per ${oreTxt} ore di sonno.`
      : `Domani turno ${domani.t}, sveglia alle ${hhmm(sveglia)}, ma oggi finisci tardi: puoi dormire al massimo ${oreTxt} ore. Giornata di recupero: poche task leggere.`,
  };
}
