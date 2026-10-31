import { oggiLocale } from "./date";
import type { Area, Stato, Task } from "./tipi";

export const AREE: Area[] = [
  { id: "allenamento", nome: "Allenamento", colore: "#ef4444", icona: "dumbbell", frase: "Sono uno che si allena" },
  { id: "progetti", nome: "Progetti", colore: "#8b5cf6", icona: "target", frase: "Sono uno che porta a termine le cose" },
  { id: "casa", nome: "Ordine in casa", colore: "#22c55e", icona: "casa", frase: "Sono uno che tiene in ordine" },
  { id: "abitudini", nome: "Abitudini quotidiane", colore: "#f5a524", icona: "ripeti", frase: "Sono uno costante" },
];

// Ora corrente in ms. Sta qui (e non dentro i componenti) perché va chiamata solo quando l'utente fa qualcosa, mai durante il disegno.
export const adessoMs = () => Date.now();

export const nuovoId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

// Task precaricate: le abitudini fisse della v1.
function precaricate(): Task[] {
  const oggi = oggiLocale();
  const base = { areaId: "abitudini", ricorrenza: { tipo: "giornaliera" } as const, solo: "sempre" as const, soloACasa: false, promemoria: [], attiva: true, creatoIl: oggi };
  return [
    { ...base, id: "meditazione", titolo: "Meditazione", durataMin: 10, minimaMin: 3, fascia: "mattina", essenziale: true, punti: 20 },
    { ...base, id: "lettura", titolo: "Lettura", durataMin: 20, minimaMin: 5, fascia: "qualsiasi", essenziale: true, punti: 20 },
    { ...base, id: "piatti", titolo: "Lavare i piatti", durataMin: 15, minimaMin: 5, fascia: "sera", essenziale: false, soloACasa: true, punti: 20 },
    taskStanza(oggi),
  ];
}

// "Sistema una stanza": una al giorno, a rotazione, finché le hai fatte tutte (poi si ricomincia).
export function taskStanza(creatoIl: string): Task {
  return {
    id: "stanza", titolo: "Sistema una stanza", tipo: "stanza", areaId: "casa",
    durataMin: 15, minimaMin: 5, ricorrenza: { tipo: "giornaliera" }, fascia: "qualsiasi", solo: "sempre", adattaATurni: true,
    soloACasa: true, essenziale: false, punti: 50, promemoria: ["10:00", "14:00", "18:00", "20:30"],
    attiva: true, creatoIl,
  };
}

export const STANZE_INIZIALI = ["il soggiorno", "il bagno", "la camera", "la cucina", "l'ingresso", "il balcone"];

export function statoIniziale(): Stato {
  return {
    versione: 1,
    aree: AREE,
    task: precaricate(),
    completamenti: [],
    impostazioni: { suoni: true, animazioni: true, vibrazione: true, suonoTocco: true, vistaOggi: "compatta", tema: "scuro" },
    timer: null,
    stanze: STANZE_INIZIALI,
    ignorati: [],
    rinvii: [],
    momenti: [],
    pianoAuto: [],
    vacanza: null,
    eventi: [],
    modifiche: [],
    bonus: [],
  };
}

// Stato vuoto, senza date: serve solo al primo disegno, prima che l'app legga i dati dal telefono.
export const statoVuoto: Stato = {
  versione: 1,
  aree: AREE,
  task: [],
  completamenti: [],
  impostazioni: { suoni: true, animazioni: true, vibrazione: true, suonoTocco: true, vistaOggi: "compatta", tema: "scuro" },
  timer: null,
  stanze: STANZE_INIZIALI,
  ignorati: [],
  rinvii: [],
  momenti: [],
  pianoAuto: [],
  vacanza: null,
  eventi: [],
  modifiche: [],
  bonus: [],
};
