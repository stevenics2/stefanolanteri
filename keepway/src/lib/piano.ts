import { dataPiù } from "./date";
import { èIgnorata, èPrevista } from "./regole";
import { èInSilenzio, finestraMigliore, hhmm } from "./sonno";
import { titoloTask } from "./stanze";
import type { Stato, Task } from "./tipi";

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

// Gli orari dei promemoria di una task in un dato giorno. Se la task "si adatta ai turni", si scelgono nel momento libero
// più lungo della giornata (tra turni e sonno): uno poco dopo l'inizio, uno a metà, uno prima della fine. Se non c'è nessun
// momento libero, niente promemoria.
function orariPerGiorno(task: Task, giorno: string): string[] {
  if (!task.adattaATurni) return [...task.promemoria].sort();
  const f = finestraMigliore(giorno);
  if (!f) return [];
  const candidati = [f.da + 15, f.da + 15 + 180, f.a - 45].filter((m) => m >= f.da && m <= f.a - 15).sort((a, b) => a - b);
  const scelti: number[] = [];
  for (const m of candidati) if (!scelti.length || m - scelti[scelti.length - 1] >= 90) scelti.push(m);
  return scelti.map((m) => hhmm(m));
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
    if (!task.adattaATurni && task.promemoria.length === 0) continue;
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

      const orari = orariPerGiorno(task, giorno);
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
