import { adessoMs } from "./seed";
import type { Completamento, Stato, Task } from "./tipi";

const oggiLocale = () => {
  const d = new Date(adessoMs());
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// Rotazione delle stanze: ogni giorno una, senza ripetere finché non le hai fatte tutte (poi si ricomincia).
// Se salti una stanza, resta in coda: domani ti viene riproposta la stessa.
export type StanzaDelGiorno = {
  stanza: string | null; // quella di oggi (o quella già fatta oggi)
  fatta: boolean;
  fatteNelGiro: number;
  totale: number;
  giroCompletato: boolean; // oggi hai chiuso il giro
};

// `giorno` è il giorno che guardi; `oggiReale` è oggi. Per un giorno futuro la rotazione si proietta in avanti (una stanza al giorno, in ordine,
// tra quelle non ancora fatte nel giro), così ogni giorno ha la sua stanza e non sempre la stessa.
export function stanzaDelGiorno(stanze: string[], cs: Completamento[], taskId: string, giorno: string, oggiReale: string = giorno): StanzaDelGiorno {
  const oggi = giorno;
  const mie = cs.filter((c) => c.taskId === taskId).sort((a, b) => a.ts - b.ts);
  let fatte = new Set<string>();
  let giroCompletato = false;
  for (const c of mie) {
    if (c.nota) fatte.add(c.nota);
    giroCompletato = false;
    if (stanze.length > 0 && stanze.every((s) => fatte.has(s))) {
      fatte = new Set(); // giro chiuso: si riparte
      giroCompletato = c.data === oggi;
    }
  }
  const oggiC = mie.find((c) => c.data === oggi);
  let prossima = stanze.find((s) => !fatte.has(s)) ?? null;
  if (giorno > oggiReale && stanze.length > 0) {
    const rimaste = stanze.filter((s) => !fatte.has(s));
    const fattaOggi = mie.some((c) => c.data === oggiReale);
    const k = Math.max(0, Math.round((Date.parse(giorno) - Date.parse(oggiReale)) / 86_400_000) - (fattaOggi ? 1 : 0));
    prossima = k < rimaste.length ? rimaste[k] : stanze[(k - rimaste.length) % stanze.length]; // finite quelle rimaste si ricomincia il giro
  }
  return {
    stanza: oggiC?.nota ?? prossima,
    fatta: !!oggiC,
    fatteNelGiro: giroCompletato ? stanze.length : fatte.size,
    totale: stanze.length,
    giroCompletato,
  };
}

// Il titolo da mostrare: per la task "stanza" cambia ogni giorno.
export function titoloTask(t: Task, stato: Stato, oggi: string): string {
  if (t.tipo !== "stanza") return t.titolo;
  const s = stanzaDelGiorno(stato.stanze, stato.completamenti, t.id, oggi, oggiLocale());
  return s.stanza ? `Sistema ${s.stanza}` : t.titolo;
}
