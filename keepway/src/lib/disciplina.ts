// La Disciplina: un punteggio da 0 a 100, la media pesata di cinque cose, in ordine di importanza:
// sonno (peso 5), allenamento (4), ordine in casa (3), lettura (2), meditazione (1).
// Ogni voce è «quanto hai fatto di quello che dovevi» negli ultimi 14 giorni (28 per l'allenamento).
import { dataPiù } from "./date";
import { èIgnorata, èPrevista } from "./regole";
import { cicliDiSonno, punteggioSonnoCicli } from "./cicliSonno";
import type { GiornoSalute, SessioneSonno } from "./salute";
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

function calcola(s: Stato, salute: GiornoSalute[], finoA: string, sonni: SessioneSonno[] = []): Omit<VoceDisciplina, "peso">[] {
  const da = dataPiù(finoA, -(GIORNI - 1));
  const nottiPeriodo = notti(salute).filter((n) => n.giorno >= da && n.giorno <= finoA);
  const obiettivo = s.impostazioni.obiettivoSonnoMin;
  const fineMs = new Date(Number(finoA.slice(0, 4)), Number(finoA.slice(5, 7)) - 1, Number(finoA.slice(8, 10)) + 1).getTime(); // fine del giorno finoA
  const daMs = fineMs - GIORNI * 86_400_000;
  // Preferisco il confronto tra un turno e l'altro (se ci sono le sessioni), altrimenti giorno per giorno.
  const cicli = sonni.length >= 2 ? cicliDiSonno(sonni, fineMs, obiettivo, 60) : [];
  const dalCiclo = cicli.length ? punteggioSonnoCicli(cicli, daMs, fineMs) : null;
  const sonno = dalCiclo ?? (nottiPeriodo.length >= 3 ? Math.round((nottiPeriodo.reduce((t, n) => t + Math.min(1, n.minuti / obiettivo), 0) / nottiPeriodo.length) * 100) : null);

  // Allenamento: media di allenamenti a settimana nelle ultime 4 settimane, rispetto a 3.
  const daAll = dataPiù(finoA, -27);
  const idAll = new Set(s.task.filter(èAllenamento).map((t) => t.id));
  const nAll = s.completamenti.filter((c) => idAll.has(c.taskId) && c.data >= daAll && c.data <= finoA).length;
  const allenamento = idAll.size ? Math.round(Math.min(1, nAll / 4 / ALLENAMENTI_A_SETTIMANA) * 100) : null;

  const ord = tassoFatte(s, da, finoA, (t) => t.areaId === "casa");
  const let_ = tassoFatte(s, da, finoA, (t) => t.id === "lettura");
  const med = tassoFatte(s, da, finoA, (t) => t.id === "meditazione");
  return [
    { id: "sonno", nome: "Sonno", punteggio: sonno, dettaglio: sonno === null ? "servono almeno 3 notti con dati" : dalCiclo !== null ? "confronto tra un turno e l'altro" : `${nottiPeriodo.length} notti, media ${Math.round(nottiPeriodo.reduce((t, n) => t + n.minuti, 0) / nottiPeriodo.length / 6) / 10} h` },
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
export function calcolaDisciplina(s: Stato, salute: GiornoSalute[], oggi: string, sonni: SessioneSonno[] = []): Disciplina {
  const ieri = dataPiù(oggi, -1);
  const adesso = calcola(s, salute, ieri, sonni);
  const prima = media(calcola(s, salute, dataPiù(ieri, -GIORNI), sonni));
  const punteggio = media(adesso);
  const pesoTotale = adesso.filter((x) => x.punteggio !== null).reduce((t, x) => t + PESI[x.id], 0);
  const voci = adesso.map((x) => ({ ...x, peso: PESI[x.id], quota: x.punteggio === null || !pesoTotale ? 0 : Math.round((PESI[x.id] / pesoTotale) * 100) }));
  // Cosa fa salire di più il punteggio: la voce con più peso e più margine.
  const miglioraSubito = voci.filter((x) => x.punteggio !== null && x.punteggio < 100).sort((a, b) => b.peso * (100 - b.punteggio!) - a.peso * (100 - a.punteggio!))[0] ?? null;
  return { punteggio, prima, voci, livello: punteggio === null ? "—" : livelloDisciplina(punteggio), miglioraSubito };
}

// Una frase del giorno per ogni fascia: tono diretto, mai offensivo. Si sceglie «a caso» ma resta la stessa per tutta la giornata.
const FRASI: { fino: number; frasi: string[] }[] = [
  { fino: 40, frasi: ["Ehi, cosa succede? Riparti da una cosa sola, adesso.", "Nessun dramma: ripartire oggi vale più di rimandare a lunedì.", "Il punto più basso è il posto migliore da cui risalire. Una task."] },
  { fino: 60, frasi: ["Si può fare meglio, e lo sai. Cosa ti sta frenando?", "A metà strada non ha mai vinto nessuno: spingi.", "Sei in cammino: alza di un gradino lo standard di oggi."] },
  { fino: 75, frasi: ["Buona base. Sai che hai ancora di più da dare.", "Solido. Ora il passo successivo: la voce più debole.", "Stai tenendo: non accontentarti."] },
  { fino: 90, frasi: ["Avanti così. Ti tengo d'occhio.", "Costante e concreto. Non è ancora il tuo massimo.", "Bel ritmo: difendilo anche nei giorni storti."] },
  { fino: 101, frasi: ["Che drago! Questo è lo standard: difendilo.", "Livello altissimo. Non mollare adesso.", "Forma da missione. Continua esattamente così."] },
];

export function fraseDisciplina(punteggio: number, giorno: string): string {
  const fascia = FRASI.find((f) => punteggio < f.fino) ?? FRASI[FRASI.length - 1];
  let h = 0;
  for (const c of giorno) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return fascia.frasi[h % fascia.frasi.length];
}
