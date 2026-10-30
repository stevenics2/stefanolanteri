// I dati di Keepway. Per ora stanno nel telefono (localStorage); stessa forma delle tabelle del database che arriverà.

// icona = chiave di un'icona (vedi components/AreaIcona.tsx), non un'emoji
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
  soloACasa: boolean; // in modalità fuori casa (vacanza/trasferta) non viene proposta
  promemoria: string[]; // orari "HH:MM" dei promemoria, ripetuti fino a quando non è fatta (partono con le notifiche)
  tipo?: "stanza"; // "stanza" = ogni giorno una stanza diversa, a rotazione
  adattaATurni?: boolean; // il momento giusto e i promemoria si scelgono nei momenti liberi tra turni e sonno
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
  nota?: string; // per le task "stanza": quale stanza
  ts: number;
};

// "Salta oggi": la task sparisce per quel giorno e non rompe la serie.
export type Ignorato = { taskId: string; data: string };
// "Più tardi": ricordamela alle `alle` (ms).
export type Rinvio = { taskId: string; data: string; alle: number };
// Modalità fuori casa: dal giorno `dal` fino ad `al` (vuoto = finché non torno).
export type Vacanza = { dal: string; al: string | null };

export type Impostazioni = { suoni: boolean; animazioni: boolean; vibrazione: boolean; suonoTocco: boolean };

export type TimerAttivo = {
  taskId: string;
  minima: boolean;
  inizio: number | null; // ms; null = timer aperto ma non ancora partito. Si ricalcola sempre da qui, così funziona anche con lo schermo spento
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
  stanze: string[]; // le stanze da sistemare a rotazione, scritte per intero ("il soggiorno")
  ignorati: Ignorato[];
  rinvii: Rinvio[];
  vacanza: Vacanza | null;
};
