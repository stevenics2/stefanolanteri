import { oggiLocale } from "./date";
import { puntiAuto } from "./regole";
import type { Area, Stato, Task } from "./tipi";

export const AREE: Area[] = [
  { id: "allenamento", nome: "Allenamento", colore: "#ef4444", icona: "💪", frase: "Sono uno che si allena" },
  { id: "progetti", nome: "Progetti", colore: "#8b5cf6", icona: "🎯", frase: "Sono uno che porta a termine le cose" },
  { id: "casa", nome: "Ordine in casa", colore: "#22c55e", icona: "🏠", frase: "Sono uno che tiene in ordine" },
  { id: "abitudini", nome: "Abitudini quotidiane", colore: "#f5a524", icona: "🔁", frase: "Sono uno costante" },
];

export const nuovoId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

// Task precaricate: le abitudini fisse della v1.
function precaricate(): Task[] {
  const oggi = oggiLocale();
  const base = { areaId: "abitudini", ricorrenza: { tipo: "giornaliera" } as const, solo: "sempre" as const, attiva: true, creatoIl: oggi };
  return [
    { ...base, id: "meditazione", titolo: "Meditazione", durataMin: 10, minimaMin: 3, fascia: "mattina", essenziale: true, punti: puntiAuto(10) },
    { ...base, id: "lettura", titolo: "Lettura", durataMin: 20, minimaMin: 5, fascia: "qualsiasi", essenziale: true, punti: puntiAuto(20) },
    { ...base, id: "piatti", titolo: "Lavare i piatti", durataMin: 15, minimaMin: 5, fascia: "sera", essenziale: false, punti: puntiAuto(15) },
  ];
}

export function statoIniziale(): Stato {
  return {
    versione: 1,
    aree: AREE,
    task: precaricate(),
    completamenti: [],
    impostazioni: { suoni: true, animazioni: true },
    timer: null,
  };
}

// Stato vuoto, senza date: serve solo al primo disegno, prima che l'app legga i dati dal telefono.
export const statoVuoto: Stato = {
  versione: 1,
  aree: AREE,
  task: [],
  completamenti: [],
  impostazioni: { suoni: true, animazioni: true },
  timer: null,
};
