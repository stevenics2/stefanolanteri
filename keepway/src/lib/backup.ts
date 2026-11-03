// Il backup: un solo file con tutto quello che Keepway tiene sul telefono (task, completamenti, impostazioni, giornata chiusa, codice Salute...).
// Si esporta quando vuoi e si rimette su questo telefono o su un altro. Le cose che si riscaricano da sole (dati Salute, semafori) e
// l'identità delle notifiche del singolo telefono non ci sono: si rifanno da sole.

export const CHIAVI_BACKUP = ["keepway.v1", "keepway.salute", "keepway.giornoChiuso", "keepway.presenza"] as const;
const CHIAVE_ULTIMO = "keepway.backup.ultimo";
const CHIAVE_PRIMA = "keepway.prima-del-ripristino";
const FORMATO = 1;

export type Backup = { app: "keepway"; formato: number; creato: string; dati: Record<string, string> };
export type RiepilogoBackup = { creato: string; task: number; completamenti: number; primo: string | null; ultimo: string | null };

const leggi = (k: string): string | null => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};

export function creaBackup(adesso = new Date()): { testo: string; nome: string } {
  const dati: Record<string, string> = {};
  for (const k of CHIAVI_BACKUP) {
    const v = leggi(k);
    if (v !== null) dati[k] = v;
  }
  const b: Backup = { app: "keepway", formato: FORMATO, creato: adesso.toISOString(), dati };
  const p = (n: number) => String(n).padStart(2, "0");
  const nome = `keepway-backup-${adesso.getFullYear()}-${p(adesso.getMonth() + 1)}-${p(adesso.getDate())}.json`;
  return { testo: JSON.stringify(b), nome };
}

export type EsitoLettura = { ok: true; backup: Backup; riepilogo: RiepilogoBackup } | { ok: false; errore: string };

// Controlla che il file sia davvero un backup di Keepway prima di toccare qualunque cosa.
export function leggiBackup(testo: string): EsitoLettura {
  let b: Backup;
  try {
    b = JSON.parse(testo) as Backup;
  } catch {
    return { ok: false, errore: "Il file non è un backup di Keepway (non si legge)." };
  }
  if (!b || b.app !== "keepway" || typeof b.dati !== "object" || b.dati === null) return { ok: false, errore: "Questo file non è un backup di Keepway." };
  if (typeof b.formato !== "number" || b.formato > FORMATO) return { ok: false, errore: "Il backup è di una versione più nuova di Keepway: aggiorna l'app e riprova." };
  const grezzo = b.dati["keepway.v1"];
  if (typeof grezzo !== "string") return { ok: false, errore: "Nel file mancano i dati principali di Keepway." };
  let stato: { versione?: number; task?: unknown; completamenti?: { data?: string }[] };
  try {
    stato = JSON.parse(grezzo);
  } catch {
    return { ok: false, errore: "I dati dentro il file sono rovinati." };
  }
  if (!stato || typeof stato.versione !== "number" || !Array.isArray(stato.task) || !Array.isArray(stato.completamenti)) return { ok: false, errore: "I dati dentro il file non hanno la forma giusta." };
  for (const k of Object.keys(b.dati)) if (!(CHIAVI_BACKUP as readonly string[]).includes(k)) delete b.dati[k]; // si rimettono solo le chiavi note
  const date = stato.completamenti.map((c) => c.data).filter((d): d is string => typeof d === "string").sort();
  return { ok: true, backup: b, riepilogo: { creato: b.creato, task: stato.task.length, completamenti: stato.completamenti.length, primo: date[0] ?? null, ultimo: date[date.length - 1] ?? null } };
}

// Rimette i dati e ricarica l'app. Prima si tiene una copia di quelli di adesso, per non perdere niente se ci si pente.
export function ripristinaBackup(b: Backup): void {
  try {
    const prima: Record<string, string> = {};
    for (const k of CHIAVI_BACKUP) {
      const v = leggi(k);
      if (v !== null) prima[k] = v;
    }
    localStorage.setItem(CHIAVE_PRIMA, JSON.stringify({ salvato: new Date().toISOString(), dati: prima }));
    for (const k of CHIAVI_BACKUP) {
      if (k in b.dati) localStorage.setItem(k, b.dati[k]);
      else localStorage.removeItem(k);
    }
  } catch {
    // memoria piena: meglio non ricaricare a metà
    throw new Error("Non riesco a scrivere i dati su questo telefono.");
  }
  location.reload();
}

export const hoCopiaPrimaDelRipristino = () => leggi(CHIAVE_PRIMA) !== null;

export function segnaBackupFatto(adesso = Date.now()): void {
  try {
    localStorage.setItem(CHIAVE_ULTIMO, String(adesso));
  } catch {
    // pazienza
  }
}
export function ultimoBackup(): number | null {
  const v = Number(leggi(CHIAVE_ULTIMO));
  return v > 0 ? v : null;
}
