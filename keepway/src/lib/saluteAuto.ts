// Dagli allenamenti arrivati dall'iPhone alla task giusta (corsa / palestra).
import { èPrevista } from "./regole";
import type { AllenamentoSalute } from "./salute";
import type { Stato, Task } from "./tipi";

export const PUNTI_PER_KM = 10;

// Che tipo di allenamento è una task: dai km, dal titolo o dall'area.
export function tipoDellaTask(t: Task): "corsa" | "palestra" | null {
  if (t.km || /cors|running|jogging/i.test(t.titolo)) return "corsa";
  if (/palestra|forza|pesi|gym|functional/i.test(t.titolo)) return "palestra";
  return null;
}

export type Abbinamento = { chiave: string; taskId: string; minuti: number | null; km: number | null; punti?: number };

// Per ogni tipo di allenamento di oggi, la task ancora da fare (preferendo quella prevista oggi). Se in un giorno ci sono due allenamenti
// dello stesso tipo (doppione, o una corsa fatta in due pezzi) vale il più lungo: la task si completa una volta sola.
export function abbinaAllenamenti(stato: Stato, oggi: string, allenamenti: AllenamentoSalute[], giaFatti: Set<string>): Abbinamento[] {
  const out: Abbinamento[] = [];
  for (const tipo of ["corsa", "palestra"] as const) {
    const di = allenamenti
      .filter((a) => a.giorno === oggi && a.tipo === tipo)
      .sort((a, b) => (b.minuti ?? 0) - (a.minuti ?? 0))[0];
    if (!di) continue;
    const chiave = `${di.giorno}|${di.tipo}|${di.inizio}`;
    if (giaFatti.has(chiave)) continue; // già gestito (anche se poi l'hai annullato: non lo rifaccio)
    const candidate = stato.task.filter(
      (t) => t.attiva && tipoDellaTask(t) === tipo && !stato.completamenti.some((c) => c.taskId === t.id && c.data === oggi),
    );
    const task = candidate.find((t) => èPrevista(t, oggi, { vacanza: stato.vacanza })) ?? candidate[0];
    if (!task) continue;
    const punti = tipo === "corsa" && di.km ? Math.max(task.punti, Math.round(di.km * PUNTI_PER_KM)) : undefined;
    out.push({ chiave, taskId: task.id, minuti: di.minuti, km: di.km, punti });
  }
  return out;
}
