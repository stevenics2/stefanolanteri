import type { Task } from "./tipi";

export const MIN_PER_KM = 6; // ritmo di corsa per stimare la durata

// Quanto dura una task (corsa: dai km).
export const durataMin = (t: Pick<Task, "durataMin" | "km">) => (t.km ? Math.round(t.km * MIN_PER_KM) : (t.durataMin ?? 0));

// Quanto tempo occupa davvero: la durata più andata e ritorno.
export const durataTotaleMin = (t: Pick<Task, "durataMin" | "km" | "spostamentoMin">) => (durataMin(t) || 15) + 2 * (t.spostamentoMin ?? 0);
