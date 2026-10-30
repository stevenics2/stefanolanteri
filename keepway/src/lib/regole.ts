import { caricoGiorno, tipoGiorno } from "./carico";
import { dataPiù, giornoSettimana, inizioSettimana } from "./date";
import type { Bonus, Completamento, Ignorato, Stato, Task, Vacanza } from "./tipi";

// --- Punti ---
export const puntiAuto = (durataMin: number | null) => (durataMin ? Math.max(5, Math.round(durataMin)) : 10);
export const puntiMinima = (punti: number) => Math.max(3, Math.round(punti / 2));

// --- Livelli (nomi provvisori: seguono le sei stagioni del percorso) ---
// Un livello a settimana, più o meno: con le task di base (circa 110 XP al giorno se fai tutto, 60-70% nella vita vera)
// servono circa 500 XP per il primo salto, poi i passi crescono un po' (500, 700, 900, 1100, 1300).
export const LIVELLI = [
  { nome: "Vedere", da: 0 },
  { nome: "Regolare", da: 500 },
  { nome: "Smontare", da: 1200 },
  { nome: "Agire", da: 2100 },
  { nome: "Allenare", da: 3200 },
  { nome: "Diventare", da: 4500 },
];

export const xpTotali = (cs: Completamento[], bonus: Bonus[] = []) =>
  cs.reduce((t, c) => t + c.punti + c.bonus, 0) + bonus.reduce((t, b) => t + b.xp, 0);

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
export const inVacanza = (v: Vacanza | null, data: string) => !!v && data >= v.dal && (!v.al || data <= v.al);
export const èIgnorata = (ignorati: Ignorato[], taskId: string, data: string) =>
  ignorati.some((i) => i.taskId === taskId && i.data === data);

// Contesto che cambia cosa è previsto: fuori casa e "carico" del giorno.
export type Previsione = { vacanza: Vacanza | null; ignoraCarico?: boolean };

// Rispetta ricorrenza, tipo di giorno (turno/riposo), fuori casa e carico
// (giorno dopo la notte: solo essenziali; notte + sera: nessuna). I giorni "saltati" si gestiscono a parte.
export function èPrevista(t: Task, data: string, p?: Previsione): boolean {
  if (!t.attiva) return false;
  if (t.soloACasa && inVacanza(p?.vacanza ?? null, data)) return false;
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
  if (p?.ignoraCarico) return true;
  const carico = caricoGiorno(data);
  if (carico === "nessuna") return false;
  if (carico === "essenziale") return t.essenziale;
  return true;
}

// --- Serie (giorni consecutivi) ---
// I giorni in cui la task non era prevista non la rompono. C'è 1 "salvataggio" a settimana:
// un giorno saltato per settimana non spezza la serie (es. dopo un doppio turno).
export function serie(t: Task, cs: Completamento[], oggi: string, p?: Previsione, ignorati: Ignorato[] = []): number {
  const fatti = new Set(cs.filter((c) => c.taskId === t.id).map((c) => c.data));
  const salvataggiUsati = new Set<string>();
  let conta = 0;
  let d = èPrevista(t, oggi, p) && !fatti.has(oggi) ? dataPiù(oggi, -1) : oggi; // oggi ancora da fare non rompe nulla
  for (let n = 0; n < 400 && d >= t.creatoIl; n++, d = dataPiù(d, -1)) {
    if (!èPrevista(t, d, p) || èIgnorata(ignorati, t.id, d)) continue; // giorno neutro: non rompe la serie
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

// --- La giornata e la settimana, in numeri ---
type Dati = Pick<Stato, "task" | "completamenti" | "ignorati" | "vacanza">;

// Le task di un giorno (non saltate) e quelle già fatte.
export function giornata(s: Dati, data: string) {
  const previste = s.task.filter((t) => èPrevista(t, data, { vacanza: s.vacanza }) && !èIgnorata(s.ignorati, t.id, data));
  const fatte = previste.filter((t) => s.completamenti.some((c) => c.taskId === t.id && c.data === data));
  return { previste, fatte };
}

// Il "boss" della settimana: i suoi punti vita sono le task previste da lunedì a domenica; ogni task fatta gli toglie un punto.
export function bossSettimana(s: Dati, oggi: string) {
  const lunedi = inizioSettimana(oggi);
  let pianificate = 0;
  for (let i = 0; i < 7; i++) {
    const d = dataPiù(lunedi, i);
    pianificate += s.task.filter((t) => èPrevista(t, d, { vacanza: s.vacanza })).length;
  }
  const domenica = dataPiù(lunedi, 6);
  const danni = s.completamenti.filter((c) => c.data >= lunedi && c.data <= domenica).length;
  const hp = Math.max(0, pianificate - danni);
  return { pianificate, danni, hp, sconfitto: pianificate >= 3 && danni >= pianificate };
}
