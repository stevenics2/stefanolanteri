import type { PianoVoce } from "./tipi";

// L'indice del piano automatico: lo imposta lo store a ogni cambiamento, e chi deve sapere "oggi questa task è in piano?" lo legge da qui
// (come per il calendario dei turni).
let indice = new Map<string, PianoVoce>();

export function impostaPianoAuto(voci: PianoVoce[]) {
  indice = new Map(voci.filter((v) => v.tipo !== "escluso").map((v) => [`${v.taskId}|${v.data}`, v]));
}
export const voceAuto = (taskId: string, data: string) => indice.get(`${taskId}|${data}`);
export const nelPianoAuto = (taskId: string, data: string) => indice.has(`${taskId}|${data}`);
