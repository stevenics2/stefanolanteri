import { dataPiù } from "./date";
import type { Stato, Task } from "./tipi";

const giorniTra = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);

// Da quanti giorni una task che dovevi fare è rimasta indietro (0 = non è in ritardo). Serve solo per la piccola scritta «in ritardo».
//  - una sola volta non fatta: dal giorno per cui era prevista;
//  - «ogni N giorni» (barba, stufa...): dal giorno in cui era da rifare (ultima volta + N);
//  - stanza a rotazione: dall'ultima stanza fatta.
export function giorniInRitardo(task: Task, stato: Stato, oggi: string): number {
  const ultima = stato.completamenti.filter((c) => c.taskId === task.id).map((c) => c.data).sort().pop();
  const r = task.ricorrenza;
  if (task.tipo === "stanza") {
    if (!ultima || task.creatoIl > dataPiù(oggi, -1)) return 0;
    return Math.max(0, giorniTra(ultima, oggi) - 1);
  }
  if (r.tipo === "una_volta") return task.riportataDa ? Math.max(0, giorniTra(task.riportataDa, oggi)) : 0;
  if (r.tipo === "intervallo" && ultima) return Math.max(0, giorniTra(dataPiù(ultima, r.ogni), oggi));
  return 0;
}

export const testoRitardo = (g: number) => (g === 1 ? "in ritardo da ieri" : `in ritardo da ${g} giorni`);
