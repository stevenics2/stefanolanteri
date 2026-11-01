// La Disciplina: un punteggio da 0 a 100, la media pesata di cinque cose, in ordine di importanza:
// sonno (peso 5), allenamento (4), ordine in casa (3), lettura (2), meditazione (1).
// Ogni voce è «quanto hai fatto di quello che dovevi» negli ultimi 14 giorni (28 per l'allenamento).
import { dataPiù } from "./date";
import { èIgnorata, èPrevista } from "./regole";
import type { GiornoSalute } from "./salute";
import { notti } from "./sonnoProgressi";
import { èAllenamento, ALLENAMENTI_A_SETTIMANA } from "./traguardi";
import type { Stato } from "./tipi";

export type VoceDisciplina = { id: "sonno" | "allenamento" | "ordine" | "lettura" | "meditazione"; nome: string; peso: number; punteggio: number | null; dettaglio: string };
export type Disciplina = { punteggio: number | null; prima: number | null; voci: (VoceDisciplina & { quota: number })[]; livello: string; miglioraSubito: VoceDisciplina | null };

const PESI = { sonno: 5, allenamento: 4, ordine: 3, lettura: 2, meditazione: 1 } as const;
const GIORNI = 14;

// Percentuale di task fatte rispetto a quelle previste, nei giorni [da, a] (estremi compresi). null se non c'era niente di previsto.
function tassoFatte(s: Stato, da: string, a: string, filtro: (t: Stato["task"][number]) => boolean): { tasso: number; fatte: number; previste: number } | null {
  const task = s.task.filter(filtro);
  let previste = 0;
  let fatte = 0;
  for (let d = da; d <= a; d = dataPiù(d, 1)) {
    for (const t of task) {
      if (!èPrevista(t, d, { vacanza: s.vacanza }) || èIgnorata(s.ignorati, t.id, d)) continue;
      previste++;
      if (s.completamenti.some((c) => c.taskId === t.id && c.data === d)) fatte++;
    }
  }
  return previste ? { tasso: fatte / previste, fatte, previste } : null;
}

function calcola(s: Stato, salute: GiornoSalute[], finoA: string): Omit<VoceDisciplina, "peso">[] {
  const da = dataPiù(finoA, -(GIORNI - 1));
  const nottiPeriodo = notti(salute).filter((n) => n.giorno >= da && n.giorno <= finoA);
  const obiettivo = s.impostazioni.obiettivoSonnoMin;
  const sonno = nottiPeriodo.length >= 3 ? Math.round((nottiPeriodo.reduce((t, n) => t + Math.min(1, n.minuti / obiettivo), 0) / nottiPeriodo.length) * 100) : null;

  // Allenamento: media di allenamenti a settimana nelle ultime 4 settimane, rispetto a 3.
  const daAll = dataPiù(finoA, -27);
  const idAll = new Set(s.task.filter(èAllenamento).map((t) => t.id));
  const nAll = s.completamenti.filter((c) => idAll.has(c.taskId) && c.data >= daAll && c.data <= finoA).length;
  const allenamento = idAll.size ? Math.round(Math.min(1, nAll / 4 / ALLENAMENTI_A_SETTIMANA) * 100) : null;

  const ord = tassoFatte(s, da, finoA, (t) => t.areaId === "casa");
  const let_ = tassoFatte(s, da, finoA, (t) => t.id === "lettura");
  const med = tassoFatte(s, da, finoA, (t) => t.id === "meditazione");
  return [
    { id: "sonno", nome: "Sonno", punteggio: sonno, dettaglio: sonno === null ? "servono almeno 3 notti con dati" : `${nottiPeriodo.length} notti, media ${Math.round(nottiPeriodo.reduce((t, n) => t + n.minuti, 0) / nottiPeriodo.length / 6) / 10} h` },
    { id: "allenamento", nome: "Allenamento", punteggio: allenamento, dettaglio: allenamento === null ? "nessuna task di allenamento" : `${nAll} in 4 settimane (obiettivo ${ALLENAMENTI_A_SETTIMANA * 4})` },
    { id: "ordine", nome: "Ordine", punteggio: ord ? Math.round(ord.tasso * 100) : null, dettaglio: ord ? `${ord.fatte} su ${ord.previste} task della casa` : "nessuna task della casa prevista" },
    { id: "lettura", nome: "Lettura", punteggio: let_ ? Math.round(let_.tasso * 100) : null, dettaglio: let_ ? `${let_.fatte} su ${let_.previste} giorni` : "nessuna lettura prevista" },
    { id: "meditazione", nome: "Meditazione", punteggio: med ? Math.round(med.tasso * 100) : null, dettaglio: med ? `${med.fatte} su ${med.previste} giorni` : "nessuna meditazione prevista" },
  ];
}

const media = (v: Omit<VoceDisciplina, "peso">[]): number | null => {
  const con = v.filter((x) => x.punteggio !== null);
  if (!con.length) return null;
  const pesi = con.reduce((t, x) => t + PESI[x.id], 0);
  return Math.round(con.reduce((t, x) => t + x.punteggio! * PESI[x.id], 0) / pesi);
};

export const livelloDisciplina = (p: number) => (p < 40 ? "Da costruire" : p < 60 ? "In crescita" : p < 75 ? "Solida" : p < 90 ? "Forte" : "Di ferro");

// Oggi non conta (è ancora in corso): si guarda fino a ieri. Il confronto è con i 14 giorni prima.
export function calcolaDisciplina(s: Stato, salute: GiornoSalute[], oggi: string): Disciplina {
  const ieri = dataPiù(oggi, -1);
  const adesso = calcola(s, salute, ieri);
  const prima = media(calcola(s, salute, dataPiù(ieri, -GIORNI)));
  const punteggio = media(adesso);
  const pesoTotale = adesso.filter((x) => x.punteggio !== null).reduce((t, x) => t + PESI[x.id], 0);
  const voci = adesso.map((x) => ({ ...x, peso: PESI[x.id], quota: x.punteggio === null || !pesoTotale ? 0 : Math.round((PESI[x.id] / pesoTotale) * 100) }));
  // Cosa fa salire di più il punteggio: la voce con più peso e più margine.
  const miglioraSubito = voci.filter((x) => x.punteggio !== null && x.punteggio < 100).sort((a, b) => b.peso * (100 - b.punteggio!) - a.peso * (100 - a.punteggio!))[0] ?? null;
  return { punteggio, prima, voci, livello: punteggio === null ? "—" : livelloDisciplina(punteggio), miglioraSubito };
}
