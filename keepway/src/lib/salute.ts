// Sonno e passi dall'iPhone: un Comando Rapido legge l'app Salute e li manda al nostro server con un indirizzo web e un codice personale.
// Qui si gestisce il codice (lo genera il telefono, a caso) e si scaricano i dati.

export type GiornoSalute = { giorno: string; passi: number | null; sonnoMin: number | null; letto: string | null; sveglia: string | null; aggiornato: number };

const CHIAVE_CODICE = "keepway.salute";
const CHIAVE_CACHE = "keepway.salute.dati";
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
    return c;
  } catch {
    return "";
  }
}

// L'indirizzo che il Comando Rapido deve chiamare (ci si aggiungono passi, sonno, letto e sveglia).
export const indirizzoInvio = () => `${location.origin}/api/salute/invia?t=${codiceSalute()}`;

export function datiInCache(): GiornoSalute[] {
  try {
    return JSON.parse(localStorage.getItem(CHIAVE_CACHE) ?? "[]") as GiornoSalute[];
  } catch {
    return [];
  }
}

export async function scaricaSalute(giorni = 14): Promise<GiornoSalute[]> {
  const codice = codiceSalute();
  if (!codice) return [];
  const r = await fetch(`/api/salute?t=${codice}&giorni=${giorni}`, { cache: "no-store" });
  if (!r.ok) throw new Error("Salute non raggiungibile");
  const d = (await r.json()) as { giorni: GiornoSalute[] };
  try {
    localStorage.setItem(CHIAVE_CACHE, JSON.stringify(d.giorni));
  } catch {
    // pazienza
  }
  return d.giorni;
}

export async function cancellaSalute(): Promise<void> {
  await fetch(`/api/salute/cancella?t=${codiceSalute()}`, { method: "POST" });
  try {
    localStorage.removeItem(CHIAVE_CACHE);
  } catch {
    // pazienza
  }
}

export const oreMinuti = (min: number) => `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, "0")}`;
