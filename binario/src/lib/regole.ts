import { caricoGiorno, tipoGiorno } from "./carico";
import { dataPiù, giornoSettimana, inizioSettimana } from "./date";
import type { Completamento, Task } from "./tipi";

// --- Punti ---
export const puntiAuto = (durataMin: number | null) => (durataMin ? Math.max(5, Math.round(durataMin)) : 10);
export const puntiMinima = (punti: number) => Math.max(3, Math.round(punti / 2));

// --- Livelli (nomi provvisori: seguono le sei stagioni del percorso) ---
export const LIVELLI = [
  { nome: "Vedere", da: 0 },
  { nome: "Regolare", da: 150 },
  { nome: "Smontare", da: 400 },
  { nome: "Agire", da: 800 },
  { nome: "Allenare", da: 1400 },
  { nome: "Diventare", da: 2200 },
];

export const xpTotali = (cs: Completamento[]) => cs.reduce((t, c) => t + c.punti + c.bonus, 0);

export function livello(xp: number) {
  let i = 0;
  while (i + 1 < LIVELLI.length && xp >= LIVELLI[i + 1].da) i++;
  const att = LIVELLI[i];
  const prox = LIVELLI[i + 1] ?? null;
  return {
    indice: i,
    numero: i + 1,
    nome: att.nome,
    prossimo: prox,
    progresso: prox ? (xp - att.da) / (prox.da - att.da) : 1,
    mancano: prox ? prox.da - xp : 0,
  };
}

// --- Quando una task è prevista ---
// Rispetta ricorrenza, tipo di giorno (turno/riposo) e carico (giorno dopo la notte: solo essenziali; notte + sera: nessuna).
export function èPrevista(t: Task, data: string, ignoraCarico = false): boolean {
  if (!t.attiva) return false;
  const r = t.ricorrenza;
  if (r.tipo === "una_volta") {
    if (r.data !== data) return false;
  } else {
    if (data < t.creatoIl) return false;
    if (r.tipo === "settimana" && !r.giorni.includes(giornoSettimana(data))) return false;
  }
  const tipo = tipoGiorno(data);
  if (t.solo === "riposo" && tipo !== "riposo") return false;
  if (t.solo === "lavoro" && tipo === "riposo") return false;
  if (ignoraCarico) return true;
  const carico = caricoGiorno(data);
  if (carico === "nessuna") return false;
  if (carico === "essenziale") return t.essenziale;
  return true;
}

// --- Serie (giorni consecutivi) ---
// I giorni in cui la task non era prevista non la rompono. C'è 1 "salvataggio" a settimana:
// un giorno saltato per settimana non spezza la serie (es. dopo un doppio turno).
export function serie(t: Task, cs: Completamento[], oggi: string): number {
  const fatti = new Set(cs.filter((c) => c.taskId === t.id).map((c) => c.data));
  const salvataggiUsati = new Set<string>();
  let conta = 0;
  let d = èPrevista(t, oggi) && !fatti.has(oggi) ? dataPiù(oggi, -1) : oggi; // oggi ancora da fare non rompe nulla
  for (let n = 0; n < 400 && d >= t.creatoIl; n++, d = dataPiù(d, -1)) {
    if (!èPrevista(t, d)) continue;
    if (fatti.has(d)) {
      conta++;
    } else {
      const sett = inizioSettimana(d);
      if (salvataggiUsati.has(sett)) break;
      salvataggiUsati.add(sett);
    }
  }
  return conta;
}
