import { dataPiù } from "./date";
import { èIgnorata, èPrevista } from "./regole";
import { èInSilenzio } from "./sonno";
import { titoloTask } from "./stanze";
import type { Stato } from "./tipi";

// Una notifica da consegnare: l'app decide cosa e quando, il server la spedisce all'ora giusta.
export type Notifica = {
  id: string;
  quando: number; // istante reale, ms dal 1970
  titolo: string;
  testo: string;
  url: string;
  tag: string;
  urgente?: boolean;
};

const GIORNI_AVANTI = 2; // oggi + i prossimi 2 giorni
const MAX_NOTIFICHE = 80;

// "2026-10-30" + "18:00" -> istante reale, nel fuso del telefono.
function istante(data: string, hhmm: string): number {
  const [a, m, g] = data.split("-").map(Number);
  const [h, min] = hhmm.split(":").map(Number);
  return new Date(a, m - 1, g, h, min).getTime();
}

// Il piano delle notifiche dei prossimi giorni, calcolato dallo stato dell'app:
//  - fine del timer (se sta girando)
//  - i promemoria delle task, ripetuti nella giornata fino a quando non sono fatte
//  - "più tardi" scelto dall'utente
// Si ricalcola a ogni cambiamento: se fai o salti una task, i promemoria successivi spariscono.
export function pianoNotifiche(stato: Stato, ora: number, oggi: string): Notifica[] {
  const out: Notifica[] = [];

  const t = stato.timer;
  if (t && t.inizio !== null && !t.pausaInizio) {
    const task = stato.task.find((x) => x.id === t.taskId);
    const quando = t.inizio + t.pausaTotale + t.durataSec * 1000;
    if (task && quando > ora) {
      out.push({ id: "timer", quando, titolo: "Timer finito", testo: `${titoloTask(task, stato, oggi)}: tempo!`, url: "/oggi/", tag: "timer", urgente: true });
    }
  }

  for (const task of stato.task) {
    if (task.promemoria.length === 0) continue;
    for (let i = 0; i <= GIORNI_AVANTI; i++) {
      const giorno = dataPiù(oggi, i);
      if (!èPrevista(task, giorno, { vacanza: stato.vacanza })) continue;

      const èOggi = i === 0;
      if (èOggi) {
        if (stato.completamenti.some((c) => c.taskId === task.id && c.data === oggi)) continue; // già fatta
        if (èIgnorata(stato.ignorati, task.id, oggi)) continue; // saltata oggi
      }
      const titolo = èOggi ? titoloTask(task, stato, oggi) : task.titolo;
      const rinvio = èOggi ? stato.rinvii.find((r) => r.taskId === task.id && r.data === oggi) : undefined;

      const orari = [...task.promemoria].sort();
      orari.forEach((hhmm, n) => {
        const quando = istante(giorno, hhmm);
        if (quando <= ora) return;
        if (rinvio && quando < rinvio.alle) return; // "più tardi": niente avvisi prima dell'ora scelta
        if (èInSilenzio(quando)) return; // in turno o a dormire
        const ultima = n === orari.length - 1 && orari.length > 1;
        const minuti = task.durataMin ? `${task.durataMin} minuti` : "";
        const testo = ultima
          ? "Ultima chiamata per oggi."
          : n === 0
            ? `${minuti ? `${minuti}, ` : ""}ti va di farlo adesso?`
            : "Ancora da fare oggi.";
        out.push({ id: `${task.id}-${giorno}-${hhmm}`, quando, titolo, testo, url: "/oggi/", tag: task.id });
      });

      // "Più tardi": un avviso all'ora scelta (esplicito, quindi non si silenzia)
      if (rinvio && rinvio.alle > ora) {
        out.push({ id: `rinvio-${task.id}`, quando: rinvio.alle, titolo, testo: "Eccomi, come promesso: è il momento.", url: "/oggi/", tag: task.id });
      }
    }
  }

  return out.sort((a, b) => a.quando - b.quando).slice(0, MAX_NOTIFICHE);
}
