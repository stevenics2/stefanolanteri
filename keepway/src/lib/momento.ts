import { durataTotaleMin } from "./durata";
import { finestraMigliore, momentoLettura, momentoMeditazione, type Finestra } from "./sonno";
import type { Task } from "./tipi";

// Il momento giusto di una task in un giorno: quello scelto a mano, oppure quello calcolato dai turni.
export function momentoGiusto(task: Task, data: string, scelto?: Finestra): Finestra | null {
  if (scelto) return scelto;
  const speciale = task.id === "meditazione" ? momentoMeditazione(data) : task.id === "lettura" ? momentoLettura(data) : null;
  if (speciale) return speciale;
  return task.adattaATurni ? finestraMigliore(data, durataTotaleMin(task)) : null;
}
