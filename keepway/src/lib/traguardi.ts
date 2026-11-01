// I traguardi: pochi, scelti per farti migliorare davvero (costanza, ripartenza, calma), non per quanto tocchi lo schermo.
// Ognuno ha tre livelli (bronzo, argento, oro). Si calcolano dai dati: non si perdono mai, anche se un giorno salti.
import { dataPiù, inizioSettimana } from "./date";
import { èIgnorata, èPrevista, giornata } from "./regole";
import { tipoDellaTask } from "./saluteAuto";
import type { Stato, Task } from "./tipi";

export const LIVELLI_MEDAGLIA = ["Bronzo", "Argento", "Oro"] as const;
export const COLORI_MEDAGLIA = ["#cd7f32", "#c7cfdb", "#fcd34d"] as const;
export const ALLENAMENTI_A_SETTIMANA = 3;

export type Gruppo = "Allenamento" | "Costanza" | "Calma e mente";
export type Valutato = {
  id: string;
  gruppo: Gruppo;
  titolo: string;
  descrizione: string; // cosa serve per il prossimo livello
  valore: number;
  etichetta: string; // «6 settimane»
  livello: number; // 0 = non ancora, 1..3
  prossima: number | null;
  progresso: number; // 0..1 verso il prossimo livello
};

// Un allenamento: la corsa, la palestra, o una task dell'area Allenamento (non la programmazione della settimana).
export const èAllenamento = (t: Task) => t.id !== "programmazione-allenamenti" && !/programmazione/i.test(t.titolo) && (tipoDellaTask(t) !== null || t.areaId === "allenamento");

// La serie più lunga mai fatta da una task (con il salvataggio settimanale delle serie normali).
export function serieMigliore(t: Task, s: Pick<Stato, "completamenti" | "ignorati" | "vacanza">, oggi: string): number {
  const fatti = new Set(s.completamenti.filter((c) => c.taskId === t.id).map((c) => c.data));
  if (!fatti.size) return 0;
  const primo = [...fatti].sort()[0];
  let best = 0;
  let run = 0;
  const usati = new Set<string>();
  let d = primo < t.creatoIl ? primo : t.creatoIl;
  for (let n = 0; n < 900 && d <= oggi; n++, d = dataPiù(d, 1)) {
    if (!èPrevista(t, d, { vacanza: s.vacanza, ignoraCarico: false }) && !fatti.has(d)) continue;
    if (èIgnorata(s.ignorati, t.id, d)) continue;
    if (fatti.has(d)) {
      run++;
      best = Math.max(best, run);
    } else if (d !== oggi) {
      const sett = inizioSettimana(d);
      if (!usati.has(sett)) usati.add(sett);
      else run = 0;
    }
  }
  return best;
}

// Quante settimane di fila con almeno 3 allenamenti (la migliore di sempre e quella in corso; la settimana in corso non rompe niente).
export function settimaneDiAllenamento(s: Pick<Stato, "task" | "completamenti">, oggi: string) {
  const ids = new Set(s.task.filter(èAllenamento).map((t) => t.id));
  const perSett = new Map<string, number>();
  for (const c of s.completamenti) if (ids.has(c.taskId)) perSett.set(inizioSettimana(c.data), (perSett.get(inizioSettimana(c.data)) ?? 0) + 1);
  if (!perSett.size) return { migliore: 0, inCorso: 0, questa: 0 };
  const corrente = inizioSettimana(oggi);
  let w = [...perSett.keys()].sort()[0];
  let run = 0;
  let migliore = 0;
  for (let n = 0; n < 300 && w <= corrente; n++, w = dataPiù(w, 7)) {
    if ((perSett.get(w) ?? 0) >= ALLENAMENTI_A_SETTIMANA) {
      run++;
      migliore = Math.max(migliore, run);
    } else if (w !== corrente) run = 0;
  }
  return { migliore, inCorso: run, questa: perSett.get(corrente) ?? 0 };
}

// Le volte che sei ripartito: almeno 3 giorni senza fare nulla, poi 3 giorni di fila di nuovo in pista.
export function ritorni(s: Pick<Stato, "completamenti">, oggi: string): number {
  const attivi = new Set(s.completamenti.map((c) => c.data));
  if (!attivi.size) return 0;
  let d = [...attivi].sort()[0];
  let vuoti = 0;
  let pieni = 0;
  let contati = 0;
  let inRipartenza = false;
  for (let n = 0; n < 900 && d <= oggi; n++, d = dataPiù(d, 1)) {
    if (attivi.has(d)) {
      pieni++;
      if (vuoti >= 3) inRipartenza = true;
      vuoti = 0;
      if (inRipartenza && pieni >= 3) {
        contati++;
        inRipartenza = false;
      }
    } else if (d !== oggi) {
      vuoti++;
      pieni = 0;
      if (vuoti < 3) inRipartenza = false;
    }
  }
  return contati;
}

export const giornatePiene = (s: Pick<Stato, "task" | "completamenti" | "ignorati" | "vacanza">, oggi: string): number => {
  let n = 0;
  for (const d of new Set(s.completamenti.map((c) => c.data))) {
    if (d > oggi) continue;
    const g = giornata(s, d);
    if (g.previste.length > 0 && g.fatte.length === g.previste.length) n++;
  }
  return n;
};

const mese = (d: string) => d.slice(0, 7);

type Def = { id: string; gruppo: Gruppo; titolo: string; soglie: [number, number, number]; unita: (n: number) => string; testo: (soglia: number) => string; valore: (s: Stato, oggi: string) => number };
const ore = (min: number) => `${Math.round((min / 60) * 10) / 10} h`.replace(".", ",");
const minutiTask = (s: Stato, id: string) => s.completamenti.filter((c) => c.taskId === id).reduce((t, c) => t + c.minuti, 0);
const taskPerId = (s: Stato, id: string) => s.task.find((t) => t.id === id);

const DEFINIZIONI: Def[] = [
  { id: "alle-settimane", gruppo: "Allenamento", titolo: "Costanza in allenamento", soglie: [4, 8, 12], unita: (n) => `${n} settimane`, testo: (n) => `${n} settimane di fila con almeno ${ALLENAMENTI_A_SETTIMANA} allenamenti`, valore: (s, o) => settimaneDiAllenamento(s, o).migliore },
  {
    id: "corse-mese", gruppo: "Allenamento", titolo: "Corse in un mese", soglie: [6, 10, 14], unita: (n) => `${n} corse`, testo: (n) => `${n} corse in un mese`,
    valore: (s) => {
      const ids = new Set(s.task.filter((t) => tipoDellaTask(t) === "corsa").map((t) => t.id));
      const per = new Map<string, number>();
      for (const c of s.completamenti) if (ids.has(c.taskId)) per.set(mese(c.data), (per.get(mese(c.data)) ?? 0) + 1);
      return Math.max(0, ...per.values());
    },
  },
  { id: "giornate-piene", gruppo: "Costanza", titolo: "Giornate piene", soglie: [10, 30, 60], unita: (n) => `${n} giornate`, testo: (n) => `${n} giornate con tutte le task fatte`, valore: (s, o) => giornatePiene(s, o) },
  { id: "boss", gruppo: "Costanza", titolo: "Boss della settimana", soglie: [1, 3, 8], unita: (n) => `${n} boss`, testo: (n) => `${n} boss sconfitti (una settimana intera)`, valore: (s) => s.bonus.filter((b) => b.tipo === "boss").length },
  { id: "ritorni", gruppo: "Costanza", titolo: "Chi ricomincia", soglie: [1, 3, 6], unita: (n) => `${n} ripartenze`, testo: (n) => `${n} volte: fermo 3 giorni, poi 3 giorni di fila di nuovo in pista`, valore: (s, o) => ritorni(s, o) },
  { id: "med-serie", gruppo: "Calma e mente", titolo: "Meditazione: serie", soglie: [7, 21, 66], unita: (n) => `${n} giorni`, testo: (n) => `${n} giorni di fila di meditazione`, valore: (s, o) => { const t = taskPerId(s, "meditazione"); return t ? serieMigliore(t, s, o) : 0; } },
  { id: "med-ore", gruppo: "Calma e mente", titolo: "Meditazione: tempo", soglie: [60, 180, 600], unita: ore, testo: (n) => `${ore(n)} di meditazione in tutto`, valore: (s) => minutiTask(s, "meditazione") },
  { id: "let-serie", gruppo: "Calma e mente", titolo: "Lettura: serie", soglie: [7, 21, 66], unita: (n) => `${n} giorni`, testo: (n) => `${n} giorni di fila di lettura`, valore: (s, o) => { const t = taskPerId(s, "lettura"); return t ? serieMigliore(t, s, o) : 0; } },
  { id: "let-ore", gruppo: "Calma e mente", titolo: "Lettura: tempo", soglie: [300, 900, 2400], unita: ore, testo: (n) => `${ore(n)} di lettura in tutto`, valore: (s) => minutiTask(s, "lettura") },
];

export function valutaTraguardi(s: Stato, oggi: string): Valutato[] {
  return DEFINIZIONI.map((d) => {
    const valore = d.valore(s, oggi);
    const livello = d.soglie.filter((x) => valore >= x).length;
    const prossima = d.soglie[livello] ?? null;
    const base = livello > 0 ? d.soglie[livello - 1] : 0;
    return {
      id: d.id,
      gruppo: d.gruppo,
      titolo: d.titolo,
      descrizione: d.testo(prossima ?? d.soglie[2]),
      valore,
      etichetta: d.unita(valore),
      livello,
      prossima,
      progresso: prossima ? Math.min(1, Math.max(0, (valore - base) / (prossima - base))) : 1,
    };
  });
}

export const livelliSbloccati = (v: Valutato[]): Record<string, number> => Object.fromEntries(v.map((x) => [x.id, x.livello]));
