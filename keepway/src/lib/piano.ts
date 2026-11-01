import { èPianificata } from "./pianoAuto";
import { dataPiù, GIORNI_LUNGHI, giornoSettimana } from "./date";
import { violazioniDa } from "./calendario";
import { giorniTra } from "./eventi";
import { èIgnorata, èPrevista } from "./regole";
import { momentoAttuale } from "./momento";
import { èADormire, èInSilenzio, hhmm, istanteDaMinutiAssoluti, situazioneAdesso, sonniPrevisti } from "./sonno";
import { iconaTask } from "../app/components/AreaIcona";
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
  emoji?: string; // l'emoji davanti alla prima riga
  senzaDati?: boolean; // il server la manda solo se oggi dall'iPhone non è arrivato niente
};

// Come arriva sul telefono: il titolo è un carattere invisibile (così non si legge «Notifica» o il nome dell'app due volte) e il testo ha
// due righe: l'emoji e cosa, poi il dettaglio (corto, per non essere tagliato con «…»).
const RIGA_MAX = 44;
const corta = (t: string, max = RIGA_MAX) => (t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t);
const EMOJI_ICONA: Record<string, string> = {
  libro: "📖", loto: "🧘", piatti: "🍽️", pulizia: "🧹", lavatrice: "🧺", bucato: "👕", doccia: "🚿", borsa: "🛍️", acqua: "💧", respiro: "🌬️",
  diario: "✍️", corsa: "🏃", camminata: "🚶", palestra: "💪", freddo: "🧊", stretching: "🤸", yoga: "🧘", bici: "🚴", nuoto: "🏊", cucina: "🍳", spesa: "🛒",
  luna: "😴", dottore: "🩺", dentista: "🦷", psicologa: "🧠", lavoro: "💼", auto: "🚗", calendario: "📅", promemoria: "🔔",
};
const emojiDi = (chiave: string) => EMOJI_ICONA[chiave] ?? "💡"; // senza un'icona precisa: la lampadina
// Lettere «in grassetto» (Unicode, Mathematical Sans-Serif Bold): il testo di una notifica non ha stili, ma questi caratteri sembrano grassetto.
// Le accentate = lettera in grassetto + accento combinato. Sono più larghe, quindi la prima riga si accorcia prima.
export function inGrassetto(testo: string): string {
  const mappa = (c: string) => {
    const k = c.codePointAt(0)!;
    if (k >= 65 && k <= 90) return String.fromCodePoint(0x1d5d4 + k - 65); // A-Z
    if (k >= 97 && k <= 122) return String.fromCodePoint(0x1d5ee + k - 97); // a-z
    if (k >= 48 && k <= 57) return String.fromCodePoint(0x1d7ec + k - 48); // 0-9
    return c;
  };
  return [...testo.normalize("NFD")].map(mappa).join("").normalize("NFC");
}
const RIGA_GRASSETTO_MAX = 34;

// Schema: «→ cosa» (in grassetto) sulla prima riga; sulla seconda il dettaglio e, in fondo, l'emoji.
export const comeArriva = (n: Notifica): Notifica => ({ ...n, titolo: "\u2800", testo: `→ ${inGrassetto(corta(n.titolo, RIGA_GRASSETTO_MAX))}\n${corta(n.testo, n.emoji ? RIGA_MAX - 3 : RIGA_MAX)}${n.emoji ? ` ${n.emoji}` : ""}`, emoji: undefined });

const RIPETIZIONI_SEGUITO = 24; // un promemoria ogni 30 minuti per 12 ore, al massimo
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
function orariPerGiorno(task: Task, giorno: string, ctx: { oggi: string; adessoMin: number; eventi: Stato["eventi"] }, scelto?: { da: number; a: number }): string[] {
  // Oggi il momento giusto si aggiorna all'ora che è (se quello di prima è passato se ne cerca un altro)
  const f = momentoAttuale(task, giorno, { oggi: ctx.oggi, adessoMin: giorno === ctx.oggi ? ctx.adessoMin : 0, eventi: ctx.eventi, scelto }).finestra;
  if (!task.adattaATurni) {
    if (!f) return [...task.promemoria].sort();
    return [hhmm(f.da)]; // abitudini legate al turno (meditazione, lettura): un promemoria all'inizio del momento giusto
  }
  if (!f) return [];
  if (èPianificata(task) && f.a - f.da < 60) return [hhmm(f.da)]; // un momento corto (es. la lavatrice): un solo avviso, all'inizio
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
// Ora oltre la quale, se dall'iPhone non è arrivato niente, si avvisa (notifica + popup nell'app).
export const ORA_CONTROLLO_SALUTE = "22:30";

// Una notifica per sera, solo se in passato hai già sincronizzato almeno una volta (senza dati mai arrivati non avrebbe senso).
// Se a quell'ora sei in turno o stai dormendo, slitta al primo momento libero. Il server la manda solo se oggi non è arrivato niente.
function notificheSalute(ora: number, oggi: string, haSincronizzato: boolean): Notifica[] {
  if (!haSincronizzato) return [];
  const out: Notifica[] = [];
  for (let i = 0; i <= GIORNI_AVANTI; i++) {
    const giorno = dataPiù(oggi, i);
    let quando = istante(giorno, ORA_CONTROLLO_SALUTE);
    for (let n = 0; n < 12 && èInSilenzio(quando); n++) quando += 15 * 60_000;
    if (quando <= ora) continue;
    out.push({ id: `salute-${giorno}`, quando, emoji: "🔄", titolo: "Nessuna attività ricevuta oggi", testo: "Tocca per sincronizzare", url: "/oggi/?sincronizza=1", tag: "salute", urgente: true, senzaDati: true });
  }
  return out;
}

export function pianoNotifiche(stato: Stato, ora: number, oggi: string, haSincronizzato = false): Notifica[] {
  const out: Notifica[] = [];

  const t = stato.timer;
  if (t && t.inizio !== null && !t.pausaInizio) {
    const task = stato.task.find((x) => x.id === t.taskId);
    const quando = t.inizio + t.pausaTotale + t.durataSec * 1000;
    if (task && quando > ora) {
      out.push({ id: "timer", quando, emoji: "⏱️", titolo: "Timer finito", testo: `${titoloTask(task, stato, oggi)}: tempo!`, url: "/oggi/", tag: "timer", urgente: true });
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
      const emoji = emojiDi(iconaTask(task, stato.aree.find((a) => a.id === task.areaId)?.icona ?? ""));
      const rinvio = èOggi ? stato.rinvii.find((r) => r.taskId === task.id && r.data === oggi) : undefined;

      const adessoMin = new Date(ora).getHours() * 60 + new Date(ora).getMinutes();
      const orari = orariPerGiorno(task, giorno, { oggi, adessoMin, eventi: stato.eventi }, stato.momenti.find((m) => m.taskId === task.id && m.data === giorno));
      orari.forEach((hhmm, n) => {
        const quando = istante(giorno, hhmm);
        if (quando <= ora) return;
        if (rinvio && quando < rinvio.alle) return; // "più tardi": niente avvisi prima dell'ora scelta
        if (task.id === "lettura" ? èADormire(quando) : èInSilenzio(quando)) return; // in turno o a dormire (la lettura a lavoro si può)
        const ultima = n === orari.length - 1 && orari.length > 1;
        const minuti = task.durataMin ? `${task.durataMin} minuti` : "";
        const testo = ultima
          ? "Ultima chiamata per oggi."
          : n === 0
            ? `${minuti ? `${minuti}, ` : ""}ti va di farlo adesso?`
            : "Ancora da fare oggi.";
        out.push({ id: `${task.id}-${giorno}-${hhmm}`, quando, emoji, titolo, testo, url: "/oggi/", tag: task.id });
      });

      // "Più tardi": un avviso all'ora scelta (esplicito, quindi non si silenzia)
      if (rinvio && rinvio.alle > ora) {
        out.push({ id: `rinvio-${task.id}`, quando: rinvio.alle, emoji, titolo, testo: "Eccomi, come promesso: è il momento.", url: "/oggi/", tag: task.id });
      }
    }
  }

  // Il seguito di una task (es. «stendi il bucato»): la notifica arriva all'ora giusta anche in turno; se stai dormendo c'è il non disturbare
  // e slitta al risveglio.
  for (const t of stato.task) {
    if (!t.attiva || !t.visibileDa || !t.notificaTesto) continue;
    if (stato.completamenti.some((c) => c.taskId === t.id)) continue;
    // La notifica arriva a fine ciclo e poi si ripete (ogni 30 minuti per il bucato, ogni 12 ore per lo stendino) finché non la segni come fatta
    // (il piano si rimanda a ogni cambiamento: segnata → spariscono). Mentre dormi non ti sveglio: le notifiche lente slittano al risveglio,
    // quelle ogni 30 minuti che cadono nel sonno si saltano.
    const ogni = t.ripetiMin ?? 30;
    const lenta = ogni >= 60;
    const volte = lenta ? 8 : RIPETIZIONI_SEGUITO;
    for (let k = 0; k < volte; k++) {
      let q = t.visibileDa + k * ogni * 60_000;
      if (lenta || k === 0) for (let i = 0; i < 96 && q > ora && èADormire(q); i++) q += 15 * 60_000;
      else if (èADormire(q)) continue;
      if (q <= ora) continue;
      const trascorsi = k * ogni;
      const da = trascorsi >= 60 ? `${Math.floor(trascorsi / 60)} h${trascorsi % 60 ? ` ${trascorsi % 60} min` : ""}` : `${trascorsi} min`;
      const testo = k === 0 ? (t.notificaTesto ?? "Il ciclo è finito.") : lenta ? "Ancora da fare: non dimenticarlo." : `Bagnato da ${da}: stendi!`;
      out.push({ id: `seguito-${t.id}-${k}`, quando: q, emoji: !lenta && k >= 3 ? "🚨" : emojiDi(iconaTask(t, "")), titolo: t.titolo, testo, url: "/oggi/", tag: `seguito-${t.id}`, urgente: true });
    }
  }

  out.push(...notificheSonno(ora));
  out.push(...notificheSalute(ora, oggi, haSincronizzato));
  out.push(...notificheEventi(stato, ora, oggi));
  out.push(...notificheTurniDaSistemare(ora, oggi));

  return out.sort((a, b) => a.quando - b.quando).slice(0, MAX_NOTIFICHE).map(comeArriva);
}

// «È ora di andare a letto»: una notifica all'orario consigliato per dormire. Ultimo orario utile: 23:59 (se il consiglio è dopo la mezzanotte,
// es. «entro le 01:30», la notifica arriva alle 23:59). Non si manda per il sonno del mattino dopo la notte, né se a quell'ora sei in turno.
const ULTIMA_ORA_MIN = 23 * 60 + 59;
function notificheSonno(ora: number): Notifica[] {
  const out: Notifica[] = [];
  for (const s of sonniPrevisti(ora, 3)) {
    const mm = ((s.aLettoMin % 1440) + 1440) % 1440;
    if (mm >= 6 * 60 && mm < 12 * 60) continue; // sonno del mattino (dopo la notte): niente notifica
    let quando = s.aLettoMs;
    let entro = false;
    if (mm < 6 * 60) {
      // consiglio dopo mezzanotte: la notifica arriva alle 23:59 della sera prima...
      const mezzanotte = s.aLettoMin - mm;
      quando = istanteDaMinutiAssoluti(mezzanotte - 1440 + ULTIMA_ORA_MIN);
      entro = true;
      // ...ma se a quell'ora sei ancora in turno (es. il 4 che finisce all'1:00, a letto alle 2:30), arriva mezz'ora prima di andare a letto (alle 2:00)
      if (situazioneAdesso(quando - 60_000) === "turno") {
        quando = s.aLettoMs - 30 * 60_000;
        entro = false;
      }
    }
    if (quando <= ora) continue;
    const prima = situazioneAdesso(quando - 60_000); // un minuto prima, perché all'ora esatta il sonno è già «iniziato»
    if (prima === "turno" || prima === "sonno") continue; // al lavoro o già a dormire
    const alle = hhmm(s.aLettoMin);
    const sveglia = hhmm(s.aLettoMin + s.ore);
    const oreTxt = String(Math.round(s.ore / 30) / 2).replace(".", ",");
    const riposino = s.tipo === "riposino";
    const titolo = riposino ? "Ora del riposino" : entro ? `Vai a letto entro le ${alle}` : "È ora di andare a letto";
    const testo = riposino ? `Dalle ${alle}, sveglia alle ${sveglia}.` : `Sveglia alle ${sveglia}, circa ${oreTxt} ore di sonno.`;
    out.push({ id: `sonno-${s.aLettoMs}`, quando, emoji: riposino ? "😴" : "🌙", titolo, testo, url: "/oggi/", tag: "sonno", urgente: true });
  }
  return out;
}

// Sposta un orario fuori dal silenzio (turno o sonno), al massimo di 6 ore in avanti, e mai di notte (solo tra le 8:00 e le 22:30).
// Se non si trova posto restituisce null: quell'avviso salta.
function fuoriDalSilenzio(quando: number): number | null {
  for (let i = 0; i <= 12; i++) {
    const q = quando + i * 30 * 60_000;
    const d = new Date(q);
    const minuti = d.getHours() * 60 + d.getMinutes();
    if (minuti < 8 * 60 || minuti > 22 * 60 + 30) continue;
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
    const ora_ = e.ora ? `, alle ${e.ora}` : "";
    const quandoTesto = `${GIORNI_LUNGHI[giornoSettimana(e.data)]} ${Number(e.data.slice(8))}${ora_}`; // «martedì 5, alle 16:30»
    const titoloEv = `${e.tipo === "appuntamento" ? "Appuntamento" : "Promemoria"} ${e.titolo}`;
    const emojiEv = e.tipo === "appuntamento" ? "📅" : "🔔";
    const aggiungi = (sigla: string, quando: number, testo: string) => {
      const q = alta ? quando : fuoriDalSilenzio(quando);
      if (q === null || q <= ora || q > entro) return;
      if (sigla !== "giorno" && q >= quandoEvento - 30 * 60_000) return; // spostato troppo in là: ormai non servirebbe più
      out.push({ id: `ev-${e.id}-${sigla}`, quando: q, emoji: emojiEv, titolo: titoloEv, testo, url: "/oggi/", tag: `ev-${e.id}`, urgente: alta });
    };

    // un avviso per ogni anticipo scelto (es. 1 settimana prima e 3 giorni prima), alle 9:30
    for (const n of e.avvisi.filter((x) => x > 1)) {
      const quando = n === 7 ? "tra una settimana" : n === 14 ? "tra due settimane" : `tra ${n} giorni`;
      aggiungi(`anticipo${n}`, istante(dataPiù(e.data, -n), "09:30"), `${quando}, ${quandoTesto}`);
    }
    // la sera prima, alle 18:30
    if (e.tipo === "appuntamento" || e.avvisi.length > 0) aggiungi("vigilia", istante(dataPiù(e.data, -1), "18:30"), `domani, ${quandoTesto}`);
    // poche ore prima (solo se c'è un orario)
    if (e.ora) aggiungi("ore", quandoEvento - 2 * 3_600_000, `tra 2 ore, alle ${e.ora}`);
    // promemoria senza orario: la mattina stessa
    if (!e.ora) aggiungi("giorno", istante(e.data, "09:00"), `oggi, ${quandoTesto}`);
  }
  return out;
}

// Finché ci sono turni da sistemare (meno di 12 ore di riposo, doppio non consentito) ti avviso ogni mattina, a mezzogiorno e ogni sera.
function notificheTurniDaSistemare(ora: number, oggi: string): Notifica[] {
  const lista = violazioniDa(oggi);
  if (lista.length === 0) return [];
  const testo = lista.length === 1 ? lista[0].testo : `${lista.length} problemi nei turni. ${lista[0].testo}`;
  const out: Notifica[] = [];
  const usati = new Set<number>(); // due orari spostati nello stesso momento diventerebbero un doppione
  for (let i = 0; i <= GIORNI_AVANTI; i++) {
    const giorno = dataPiù(oggi, i);
    for (const hhmm of ["09:30", "12:00", "19:00"]) {
      const q = fuoriDalSilenzio(istante(giorno, hhmm));
      if (q === null || q <= ora || usati.has(q)) continue;
      usati.add(q);
      out.push({ id: `turni-${giorno}-${hhmm}`, quando: q, emoji: "⚠️", titolo: "Conflitto turni", testo, url: "/turni/", tag: "turni", urgente: true });
    }
  }
  return out;
}
