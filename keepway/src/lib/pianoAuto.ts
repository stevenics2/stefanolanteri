import type { PianoVoce } from "./tipi";

// L'indice del piano automatico: lo imposta lo store a ogni cambiamento, e chi deve sapere "oggi questa task è in piano?" lo legge da qui
// (come per il calendario dei turni).
let indice = new Map<string, PianoVoce>();

export function impostaPianoAuto(voci: PianoVoce[]) {
  indice = new Map(voci.filter((v) => v.tipo !== "escluso").map((v) => [`${v.taskId}|${v.data}`, v]));
}
// Una task il cui piano lo decide l'app: «N volte a settimana» oppure «ogni N giorni».
export const èPianificata = (t: { ricorrenza: { tipo: string } }) => t.ricorrenza.tipo === "auto" || t.ricorrenza.tipo === "intervallo";
export const voceAuto = (taskId: string, data: string) => indice.get(`${taskId}|${data}`);
export const nelPianoAuto = (taskId: string, data: string) => indice.has(`${taskId}|${data}`);
