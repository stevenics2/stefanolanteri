import type { Completamento, Stato, Task } from "./tipi";

// Rotazione delle stanze: ogni giorno una, senza ripetere finché non le hai fatte tutte (poi si ricomincia).
// Se salti una stanza, resta in coda: domani ti viene riproposta la stessa.
export type StanzaDelGiorno = {
  stanza: string | null; // quella di oggi (o quella già fatta oggi)
  fatta: boolean;
  fatteNelGiro: number;
  totale: number;
  giroCompletato: boolean; // oggi hai chiuso il giro
};

export function stanzaDelGiorno(stanze: string[], cs: Completamento[], taskId: string, oggi: string): StanzaDelGiorno {
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
  const prossima = stanze.find((s) => !fatte.has(s)) ?? null;
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
  const s = stanzaDelGiorno(stato.stanze, stato.completamenti, t.id, oggi);
  return s.stanza ? `Sistema ${s.stanza}` : t.titolo;
}
