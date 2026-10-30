import { dataPiù } from "./date";
import { giorniTra } from "./eventi";
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
const MAX_NOTIFICHE = 150;
const ORIZZONTE_EVENTI_GIORNI = 30; // gli avvisi degli appuntamenti si preparano con largo anticipo

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

  out.push(...notificheEventi(stato, ora, oggi));

  return out.sort((a, b) => a.quando - b.quando).slice(0, MAX_NOTIFICHE);
}

// Sposta un orario fuori dal silenzio (turno o sonno), al massimo di 6 ore in avanti; null se non si trova posto.
function fuoriDalSilenzio(quando: number): number | null {
  for (let i = 0; i <= 12; i++) {
    const q = quando + i * 30 * 60_000;
    if (!èInSilenzio(q)) return q;
  }
  return null;
}

// Avvisi per appuntamenti e promemoria: con anticipo (es. una settimana prima), la vigilia e poche ore prima.
// Quelli a priorità alta arrivano sempre, anche durante turni e sonno.
function notificheEventi(stato: Stato, ora: number, oggi: string): Notifica[] {
  const out: Notifica[] = [];
  const entro = ora + ORIZZONTE_EVENTI_GIORNI * 86_400_000;

  for (const e of stato.eventi) {
    if (e.fatto || giorniTra(oggi, e.data) < 0) continue;
    const alta = e.priorita === "alta";
    const quandoEvento = istante(e.data, e.ora ?? "09:00");
    const ora_ = e.ora ? ` alle ${e.ora}` : "";
    const aggiungi = (sigla: string, quando: number, testo: string) => {
      const q = alta ? quando : fuoriDalSilenzio(quando);
      if (q === null || q <= ora || q > entro) return;
      if (sigla !== "giorno" && q >= quandoEvento - 30 * 60_000) return; // spostato troppo in là: ormai non servirebbe più
      out.push({ id: `ev-${e.id}-${sigla}`, quando: q, titolo: e.titolo, testo, url: "/oggi/", tag: `ev-${e.id}`, urgente: alta });
    };

    // con anticipo scelto (es. 7 giorni prima), alle 9:30
    if (e.anticipoGiorni > 1) {
      const n = e.anticipoGiorni;
      const quando = e.anticipoGiorni === 7 ? "Tra una settimana" : `Tra ${n} giorni`;
      aggiungi("anticipo", istante(dataPiù(e.data, -n), "09:30"), `${quando}, ${e.data.split("-").reverse().slice(0, 2).join("/")}${ora_}`);
    }
    // la sera prima, alle 18:30
    if (e.tipo === "appuntamento" || e.anticipoGiorni > 0) aggiungi("vigilia", istante(dataPiù(e.data, -1), "18:30"), `Domani${ora_}`);
    // poche ore prima (solo se c'è un orario)
    if (e.ora) aggiungi("ore", quandoEvento - 2 * 3_600_000, "Tra 2 ore");
    // promemoria senza orario: la mattina stessa
    if (!e.ora) aggiungi("giorno", istante(e.data, "09:00"), "Oggi");
  }
  return out;
}
