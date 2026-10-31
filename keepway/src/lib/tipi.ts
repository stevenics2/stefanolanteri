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
  icona?: string; // icona della task (se manca, quella dell'area)
  km?: number; // corsa: distanza; la durata si ricava (6 minuti al km) e non c'è il timer
  spostamentoMin?: number; // minuti per andare (e altrettanti per tornare) se la task si fa fuori casa
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
  combo?: number; // quante task di fila (con pause sotto l'ora) fino a questa, compresa
  nota?: string; // per le task "stanza": quale stanza
  ts: number;
};

// "Salta oggi": la task sparisce per quel giorno e non rompe la serie.
export type Ignorato = { taskId: string; data: string };
// "Più tardi": ricordamela alle `alle` (ms).
// Momento giusto scelto a mano per una task in un giorno (minuti dalla mezzanotte).
export type Momento = { taskId: string; data: string; da: number; a: number };
export type Rinvio = { taskId: string; data: string; alle: number };
// Modalità fuori casa: dal giorno `dal` fino ad `al` (vuoto = finché non torno).
export type Vacanza = { dal: string; al: string | null };

export type Priorita = "alta" | "media" | "bassa";

// Appuntamenti (dentista, psicologa...) e promemoria: cose che succedono in un giorno preciso.
export type Evento = {
  id: string;
  tipo: "appuntamento" | "promemoria";
  titolo: string;
  icona: string; // chiave di un'icona (vedi components/AreaIcona.tsx)
  data: string; // AAAA-MM-GG
  ora: string | null; // "HH:MM"; null = tutto il giorno
  durataMin: number;
  priorita: Priorita;
  luogo: string;
  avvisi: number[]; // quanti giorni prima avvisare (es. [7, 3]): compare in "In arrivo" e arriva la notifica
  spostamentoMin: number; // minuti per andare (e altrettanti per tornare)
  fatto: boolean;
  creato: number;
};

// Cosa è cambiato in un giorno rispetto ai turni importati. Ogni modifica si può annullare.
export type TipoModifica = "straordinario" | "cambio_azienda" | "cambio_personale" | "assenza";
export type Assenza = "ferie" | "malattia" | "permesso" | "altro";
export type Modifica = {
  id: string;
  data: string;
  tipo: TipoModifica;
  codici: string[]; // i turni che il giorno ha DOPO la modifica ([] = riposo)
  ex: string; // come era prima: "3", "2+3", "RD"...
  mostraEx: boolean; // scrivere "(ex 3)" accanto al nuovo turno
  extra?: string[]; // straordinario: i turni aggiunti
  assenza?: Assenza;
  gruppo?: string; // modifiche collegate (es. un turno spostato da un giorno a un altro)
  creato: number;
};

// Punti extra che non vengono da una task: il forziere di fine giornata e il boss della settimana.
export type Bonus = { id: string; data: string; xp: number; tipo: "forziere" | "boss"; testo: string; da: string /* il completamento che lo ha fatto scattare */ };

export type Impostazioni = { suoni: boolean; animazioni: boolean; vibrazione: boolean; suonoTocco: boolean; vistaOggi: "lista" | "compatta" | "estesa" };

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
  momenti: Momento[];
  vacanza: Vacanza | null;
  eventi: Evento[];
  modifiche: Modifica[];
  bonus: Bonus[];
};
