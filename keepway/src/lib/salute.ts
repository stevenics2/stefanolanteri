// Sonno e passi dall'iPhone: un Comando Rapido legge l'app Salute e li manda al nostro server con un indirizzo web e un codice personale.
// Qui si gestisce il codice (lo genera il telefono, a caso) e si scaricano i dati.

export type GiornoSalute = { giorno: string; passi: number | null; sonnoMin: number | null; letto: string | null; sveglia: string | null; aggiornato: number };

export type AllenamentoSalute = { giorno: string; tipo: "corsa" | "palestra" | "altro"; inizio: string; minuti: number | null; km: number | null };
export type DatiSalute = { ultimo: number | null; allenamenti: AllenamentoSalute[]; giorni: GiornoSalute[] };

const CHIAVE_CODICE = "keepway.salute";
const CHIAVE_CACHE = "keepway.salute.dati";
const CHIAVE_ULTIMO = "keepway.salute.ultimo";
export const COMANDO_RAPIDO = "Keepway Salute"; // il nome del Comando Rapido da far partire con «Sincronizza»
export const linkSincronizza = () => `shortcuts://run-shortcut?name=${encodeURIComponent(COMANDO_RAPIDO)}`;
export const OBIETTIVO_PASSI = 8000;
export const SONNO_MINIMO_MIN = 7 * 60;

const casuale = () => {
  const alfabeto = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const byte = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(byte, (b) => alfabeto[b % alfabeto.length]).join("");
};

export function codiceSalute(): string {
  try {
    let c = localStorage.getItem(CHIAVE_CODICE);
    if (!c) {
      c = casuale();
      localStorage.setItem(CHIAVE_CODICE, c);
    }
    return c;
  } catch {
    return "";
  }
}

export function rigeneraCodice(): string {
  try {
    const c = casuale();
    localStorage.setItem(CHIAVE_CODICE, c);
    localStorage.removeItem(CHIAVE_CACHE);
    localStorage.removeItem(CHIAVE_ULTIMO);
    return c;
  } catch {
    return "";
  }
}

// L'indirizzo che il Comando Rapido deve chiamare (ci si aggiungono passi, sonno, letto e sveglia).
export const indirizzoInvio = () => `${location.origin}/api/salute/invia?t=${codiceSalute()}`;

const VUOTI: DatiSalute = { ultimo: null, allenamenti: [], giorni: [] };

export function datiInCache(): DatiSalute {
  try {
    const d = JSON.parse(localStorage.getItem(CHIAVE_CACHE) ?? "null") as DatiSalute | GiornoSalute[] | null;
    if (!d) return VUOTI;
    return Array.isArray(d) ? { ...VUOTI, giorni: d } : d; // vecchio formato: solo l'elenco dei giorni
  } catch {
    return VUOTI;
  }
}

export async function scaricaSalute(giorni = 14): Promise<DatiSalute> {
  const codice = codiceSalute();
  if (!codice) return VUOTI;
  const r = await fetch(`/api/salute?t=${codice}&giorni=${giorni}`, { cache: "no-store" });
  if (!r.ok) throw new Error("Salute non raggiungibile");
  const d = (await r.json()) as DatiSalute;
  try {
    // si ricorda anche «hai mai sincronizzato?»: serve alla notifica delle 22:30
    if (d.ultimo) localStorage.setItem(CHIAVE_ULTIMO, String(d.ultimo));
    localStorage.setItem(CHIAVE_CACHE, JSON.stringify(d));
  } catch {
    // pazienza
  }
  return d;
}

// Quando è arrivato l'ultimo dato dall'iPhone (ms), o null se non è mai arrivato niente.
export function ultimoDatoRicevuto(): number | null {
  try {
    return Number(localStorage.getItem(CHIAVE_ULTIMO)) || null;
  } catch {
    return null;
  }
}

export async function cancellaSalute(): Promise<void> {
  await fetch(`/api/salute/cancella?t=${codiceSalute()}`, { method: "POST" });
  try {
    localStorage.removeItem(CHIAVE_CACHE);
    localStorage.removeItem(CHIAVE_ULTIMO);
  } catch {
    // pazienza
  }
}

export const oreMinuti = (min: number) => `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, "0")}`;
