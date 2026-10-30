// I dati di Binario. Per ora stanno nel telefono (localStorage); stessa forma delle tabelle del database che arriverà.

export type Area = { id: string; nome: string; colore: string; icona: string; frase: string };

export type Ricorrenza =
  | { tipo: "giornaliera" }
  | { tipo: "settimana"; giorni: number[] } // 0 = domenica ... 6 = sabato
  | { tipo: "una_volta"; data: string };

export type Fascia = "mattina" | "pomeriggio" | "sera" | "qualsiasi";

export type Task = {
  id: string;
  titolo: string;
  areaId: string;
  durataMin: number | null; // se c'è, si attiva il timer
  minimaMin: number | null; // versione minima: mantiene la serie
  ricorrenza: Ricorrenza;
  fascia: Fascia;
  solo: "sempre" | "lavoro" | "riposo"; // nei giorni con turno / di riposo
  punti: number;
  essenziale: boolean; // resta anche nei giorni dopo la notte
  attiva: boolean;
  creatoIl: string;
};

export type Completamento = {
  id: string;
  taskId: string;
  data: string;
  minuti: number;
  minima: boolean;
  punti: number;
  bonus: number; // "colpo di fortuna" a sorpresa
  ts: number;
};

export type Impostazioni = { suoni: boolean; animazioni: boolean };

export type TimerAttivo = {
  taskId: string;
  minima: boolean;
  inizio: number; // ms: si ricalcola sempre da qui, così funziona anche con lo schermo spento
  durataSec: number;
  pausaInizio: number | null;
  pausaTotale: number; // ms
};

export type Stato = {
  versione: 1;
  aree: Area[];
  task: Task[];
  completamenti: Completamento[];
  impostazioni: Impostazioni;
  timer: TimerAttivo | null;
};
