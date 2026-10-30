import roster from "@/data/roster.json";
import type { Assenza, Modifica } from "./tipi";

// Il calendario "effettivo": i turni importati dall'Excel + le modifiche fatte a mano (straordinari, cambi, assenze).
// Tutto il resto dell'app (sonno, conflitti, carico delle task, notifiche) legge da qui.
const MIN_GIORNO = 24 * 60;

// Gli orari dei turni, in minuti dalla mezzanotte (il 4 finisce all'1:00 del giorno dopo).
const TURNI: Record<string, { da: number; a: number }> = {
  "1": { da: 60, a: 420 },
  "2": { da: 420, a: 780 },
  "3": { da: 780, a: 1140 },
  "4": { da: 1140, a: 1500 },
};
export const CODICI_TURNO = ["1", "2", "3", "4"];
export const ORE_TURNO = 6;

const hh = (m: number) => {
  const x = ((m % MIN_GIORNO) + MIN_GIORNO) % MIN_GIORNO;
  return `${String(Math.floor(x / 60)).padStart(2, "0")}:${String(x % 60).padStart(2, "0")}`;
};

const mezzanotte = (d: string) => {
  const [a, m, g] = d.split("-").map(Number);
  return Date.UTC(a, m - 1, g) / 60000;
};

type RigaRoster = { d: string; t: string; o: string; u: string };
const righe = roster as RigaRoster[];
const perData = new Map(righe.map((r) => [r.d, r]));
export const dateConCalendario = righe.map((r) => r.d);

// "1 + 4" -> ["1","4"]; "RD" / "R" -> []
const codiciDa = (t: string): string[] => (t === "RD" || t === "R" ? [] : t.split("+").map((x) => x.trim()).filter(Boolean));
const ordina = (c: string[]) => [...c].sort();

// --- Le modifiche attive (le imposta lo store quando cambiano) ---
let modifiche = new Map<string, Modifica>();
let versione = 0;

export function impostaModifiche(lista: Modifica[]) {
  modifiche = new Map(lista.map((m) => [m.data, m]));
  versione++;
}
export const versioneCalendario = () => versione;

export type GiornoEffettivo = {
  data: string;
  codiceBase: string; // come nel file importato: "3", "1 + 4", "RD"
  baseCodici: string[];
  codici: string[]; // i turni del giorno, modifiche comprese
  riposo: boolean; // nessun turno (riposo, ferie, malattia...)
  etichetta: string; // "3", "2+3", "R - (ex 3)", "FERIE"
  orario: string; // "07:00–19:00"
  unita: string;
  modifica?: Modifica;
};

const NOMI_ASSENZA: Record<Assenza, string> = { ferie: "FERIE", malattia: "MALATTIA", permesso: "PERMESSO", altro: "ASSENZA" };
export const nomeAssenza = (a: Assenza) => NOMI_ASSENZA[a];

const unisci = (codici: string[]) => ordina(codici).join("+");

// --- Regole sui turni ---
// Un solo doppio turno è possibile: 2+3 e 3+4 (attaccati) e 1+4 (stesso giorno, con 12 ore in mezzo). Mai 1+3, 4+1, 1+2, 2+4.
export const DOPPI_CONSENTITI = ["2+3", "3+4", "1+4"];
export const combinazioneValida = (codici: string[]) => codici.length <= 1 || DOPPI_CONSENTITI.includes(unisci(codici));
// Quali turni si possono aggiungere a questo giorno senza fare un doppio non consentito.
export const extraConsentiti = (codici: string[]) => CODICI_TURNO.filter((c) => !codici.includes(c) && combinazioneValida([...codici, c]));
export const RIPOSO_MIN_ORE = 12; // tra un turno e l'altro devono passare almeno 12 ore

// Orario leggibile di un insieme di turni: i turni attaccati diventano un solo intervallo (2+3 -> 07:00–19:00).
function orarioDi(codici: string[]): string {
  const interv = ordina(codici).map((c) => TURNI[c]).filter(Boolean);
  const uniti: { da: number; a: number }[] = [];
  for (const i of interv) {
    const ultimo = uniti[uniti.length - 1];
    if (ultimo && i.da <= ultimo.a) ultimo.a = Math.max(ultimo.a, i.a);
    else uniti.push({ ...i });
  }
  return uniti.map((i) => `${hh(i.da)}–${hh(i.a)}`).join(" / ");
}

export function giornoEffettivo(data: string): GiornoEffettivo | undefined {
  const r = perData.get(data);
  if (!r) return undefined;
  const baseCodici = codiciDa(r.t);
  const m = modifiche.get(data);
  const codici = m ? m.codici : baseCodici;
  const riposo = codici.length === 0;

  let etichetta: string;
  if (m?.tipo === "assenza") etichetta = `${NOMI_ASSENZA[m.assenza ?? "altro"]}${m.mostraEx && m.ex ? ` - (ex ${m.ex})` : ""}`;
  else if (riposo) etichetta = `${r.t === "RD" ? "RD" : "R"}${m?.mostraEx && m.ex ? ` - (ex ${m.ex})` : ""}`;
  else etichetta = `${unisci(codici)}${m?.mostraEx && m.ex ? ` - (ex ${m.ex})` : ""}`;

  return { data, codiceBase: r.t, baseCodici, codici, riposo, etichetta, orario: riposo ? "" : orarioDi(codici), unita: r.u, modifica: m };
}

export const etichettaCodici = (codici: string[]) => (codici.length ? unisci(codici) : "R");
export const etichettaBase = (data: string) => {
  const r = perData.get(data);
  if (!r) return "";
  const c = codiciDa(r.t);
  return c.length ? unisci(c) : r.t;
};

// --- Blocchi di lavoro (per sonno, conflitti, silenzio) ---
// I turni attaccati (2+3, 3+4) diventano un solo blocco lungo. Il turno 1 inizia all'1:00 *della data indicata*.
export type BloccoLavoro = { inizio: number; fine: number; notte: boolean; turno: string };

let blocchiVersione = -1;
let blocchiCache: BloccoLavoro[] = [];

export function blocchiEffettivi(): BloccoLavoro[] {
  if (blocchiVersione === versione) return blocchiCache;
  const pezzi: { inizio: number; fine: number; codice: string }[] = [];
  for (const r of righe) {
    const ge = giornoEffettivo(r.d);
    if (!ge) continue;
    const base = mezzanotte(r.d);
    for (const c of ge.codici) {
      const t = TURNI[c];
      if (t) pezzi.push({ inizio: base + t.da, fine: base + t.a, codice: c });
    }
  }
  pezzi.sort((a, b) => a.inizio - b.inizio);

  const out: BloccoLavoro[] = [];
  let corrente: { inizio: number; fine: number; codici: string[] } | null = null;
  const chiudi = () => {
    if (!corrente) return;
    const durata = corrente.fine - corrente.inizio;
    const orario = ((corrente.inizio % MIN_GIORNO) + MIN_GIORNO) % MIN_GIORNO;
    out.push({ inizio: corrente.inizio, fine: corrente.fine, notte: orario < 5 * 60 && durata <= 7 * 60, turno: corrente.codici.join("+") });
  };
  for (const p of pezzi) {
    if (corrente && p.inizio <= corrente.fine) {
      corrente.fine = Math.max(corrente.fine, p.fine);
      corrente.codici.push(p.codice);
    } else {
      chiudi();
      corrente = { inizio: p.inizio, fine: p.fine, codici: [p.codice] };
    }
  }
  chiudi();
  blocchiCache = out;
  blocchiVersione = versione;
  return out;
}

// --- Recap del mese: straordinari, cambi, assenze ---
export type RecapMese = {
  straordinari: number; // turni extra fatti in straordinario
  oreStraordinario: number;
  doppi: number; // giorni con doppio turno nati da un cambio o da uno straordinario (il 1+4 regolare del calendario NON conta)
  cambiPagati: number; // contati per gruppo: un turno spostato da un giorno a un altro è un solo cambio
  cambiPersonali: number;
  assenze: Record<Assenza, number>;
  totale: number;
};

export function recapMese(lista: Modifica[], anno: number, mese0: number): RecapMese {
  const prefisso = `${anno}-${String(mese0 + 1).padStart(2, "0")}`;
  const del = lista.filter((m) => m.data.startsWith(prefisso));
  const gruppi = (tipo: Modifica["tipo"]) => new Set(del.filter((m) => m.tipo === tipo).map((m) => m.gruppo ?? m.id)).size;
  const straord = del.filter((m) => m.tipo === "straordinario");
  const assenze: Record<Assenza, number> = { ferie: 0, malattia: 0, permesso: 0, altro: 0 };
  for (const m of del) if (m.tipo === "assenza") assenze[m.assenza ?? "altro"]++;
  const extraTurni = straord.reduce((t, m) => t + (m.extra?.length ?? 0), 0);
  return {
    straordinari: extraTurni,
    oreStraordinario: extraTurni * ORE_TURNO,
    doppi: del.filter((m) => m.tipo !== "assenza" && m.codici.length >= 2).length,
    cambiPagati: gruppi("cambio_azienda"),
    cambiPersonali: gruppi("cambio_personale"),
    assenze,
    totale: del.length,
  };
}

// --- Controlli: 12 ore di riposo e doppi turni consentiti ---
export type Violazione = {
  tipo: "riposo" | "doppio";
  ore: number; // ore di pausa tra i due turni (riposo)
  primo: { data: string; turno: string };
  secondo: { data: string; turno: string };
  testo: string;
};

const dataDaMinuti = (min: number) => new Date(min * 60000).toISOString().slice(0, 10);
const gm = (data: string) => data.split("-").reverse().slice(0, 2).join("/");
const oreTesto = (ore: number) => String(Math.round(ore * 10) / 10).replace(".", ",");

let violazioniVersione = -1;
let violazioniCache: Violazione[] = [];

export function violazioni(): Violazione[] {
  if (violazioniVersione === versione) return violazioniCache;
  const blocchi = blocchiEffettivi();
  const out: Violazione[] = [];
  blocchi.forEach((b, i) => {
    const data = dataDaMinuti(b.inizio);
    if (b.turno.includes("+") && !DOPPI_CONSENTITI.includes(b.turno)) {
      out.push({ tipo: "doppio", ore: 0, primo: { data, turno: b.turno }, secondo: { data, turno: b.turno }, testo: `Il doppio turno ${b.turno} (${gm(data)}) non è consentito: si può fare solo 2+3, 3+4 o 1+4.` });
    }
    const p = i > 0 ? blocchi[i - 1] : null;
    if (!p) return;
    const ore = (b.inizio - p.fine) / 60;
    if (ore < RIPOSO_MIN_ORE) {
      const dp = dataDaMinuti(p.inizio);
      out.push({
        tipo: "riposo", ore, primo: { data: dp, turno: p.turno }, secondo: { data, turno: b.turno },
        testo: `Tra il turno ${p.turno} del ${gm(dp)} e il turno ${b.turno} del ${gm(data)} passano solo ${oreTesto(ore)} ore: ne servono ${RIPOSO_MIN_ORE}.`,
      });
    }
  });
  violazioniCache = out;
  violazioniVersione = versione;
  return out;
}

// Quelle ancora sistemabili: il turno più avanti è oggi o nel futuro.
export const violazioniDa = (oggi: string) => violazioni().filter((v) => v.secondo.data >= oggi);
export const formatoGiornoMese = gm;

// Una riga che dice cosa non va in quel giorno, per la striscia rossa.
export function notaGiorno(v: Violazione, data: string): string {
  if (v.tipo === "doppio") return `Il doppio turno ${v.primo.turno} non è consentito`;
  const ore = oreTesto(v.ore);
  return data === v.primo.data
    ? `Solo ${ore} ore di riposo prima del turno ${v.secondo.turno} del ${gm(v.secondo.data)}`
    : `Solo ${ore} ore di riposo dopo il turno ${v.primo.turno} del ${gm(v.primo.data)}`;
}
