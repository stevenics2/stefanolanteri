import { analizzaGiorno, senzaEventi } from "./allenamento";
import { voceAuto } from "./pianoAuto";
import { durataMin, durataTotaleMin } from "./durata";
import { finestraMigliore, finestreLibere, limiteSerale, momentoLettura, momentoMeditazione, type Finestra } from "./sonno";
import type { Evento, Task } from "./tipi";

// Il momento giusto di una task in un giorno: quello scelto a mano, oppure quello calcolato dai turni.
export function momentoGiusto(task: Task, data: string, scelto?: Finestra): Finestra | null {
  if (scelto) return scelto;
  if (task.ricorrenza.tipo === "auto") {
    const v = voceAuto(task.id, data);
    return v && v.da !== undefined && v.a !== undefined ? { da: v.da, a: v.a } : null;
  }
  const speciale = task.id === "meditazione" ? momentoMeditazione(data) : task.id === "lettura" ? momentoLettura(data) : null;
  if (speciale) return speciale;
  return task.adattaATurni ? finestraMigliore(data, durataTotaleMin(task)) : null;
}

const prossimoQuarto = (min: number) => Math.ceil(min / 15) * 15;

// Quanto tempo serve davvero alla task per stare in un momento (durata, più andata e ritorno se è fuori casa).
const serve = (task: Task) => (task.ricorrenza.tipo === "auto" || task.spostamentoMin ? durataTotaleMin(task) : durataMin(task) || 15);

// Lettura e meditazione si possono fare anche subito prima di andare a letto (un allenamento no).
export const èTranquilla = (task: Task) => task.id === "meditazione" || task.id === "lettura" || /medit|lettur|leggi/i.test(task.titolo);

export type MomentoAttuale = {
  finestra: Finestra | null;
  spostato: boolean; // il momento di prima è passato (o non basta più) e se ne è trovato un altro
  primaDiDormire: boolean; // il nuovo momento è la sera tardi, prima di andare a letto (solo per le cose tranquille)
  esaurito: boolean; // oggi non c'è più un momento libero adatto
};

// Il momento giusto di OGGI, aggiornato all'ora che è: finché quello suggerito è ancora utile resta com'è; quando passa (e la task non è fatta)
// si cerca il prossimo momento libero della giornata, tra turni, sonno e appuntamenti, e si suggerisce quello. Un orario scelto a mano non si sposta.
export function momentoAttuale(
  task: Task, data: string, opz: { oggi: string; adessoMin: number; eventi: Evento[]; scelto?: Finestra },
): MomentoAttuale {
  const base = momentoGiusto(task, data, opz.scelto);
  if (!base || opz.scelto || data !== opz.oggi || opz.adessoMin <= 0) return { finestra: base, spostato: false, primaDiDormire: false, esaurito: false };
  const bisogno = serve(task);
  if (opz.adessoMin <= base.a - bisogno) return { finestra: base, spostato: false, primaDiDormire: false, esaurito: false };

  // Il momento suggerito è passato: il prossimo
  const ora = prossimoQuarto(opz.adessoMin);
  if (task.ricorrenza.tipo === "auto") {
    const nuovo = analizzaGiorno(task, data, opz.eventi, ora).slot;
    return nuovo ? { finestra: nuovo, spostato: true, primaDiDormire: false, esaurito: false } : { finestra: null, spostato: true, primaDiDormire: false, esaurito: true };
  }
  const fine = èTranquilla(task) ? Math.max(22 * 60 + 30, limiteSerale(data)) : 22 * 60 + 30; // le cose tranquille anche fino a quando vai a letto
  const liberi = senzaEventi(finestreLibere(data, 8 * 60, fine, bisogno), opz.eventi, data);
  for (const w of liberi) {
    const da = Math.max(w.da, ora);
    const a = Math.min(w.a, da + 120);
    if (a - da >= bisogno) return { finestra: { da, a }, spostato: true, primaDiDormire: èTranquilla(task) && a > 22 * 60 + 30, esaurito: false };
  }
  return { finestra: null, spostato: true, primaDiDormire: false, esaurito: true };
}
