// I semafori del Trieste Marine Terminal («Empty cntr yard» e «Full cntr yard»): verde = terminal operativo, rosso = operazioni sospese.
// Li legge il server di Keepway dal sito del terminal (dato pubblico) ogni 5 minuti; qui si chiede lo stato al server.
import { blocchiEffettivi } from "./calendario";
import { istanteDaMinutiAssoluti } from "./sonno";

export type StatoTerminal = { empty: string; full: string; controllato: number; cambio: number; fallito: number | null };

const CHIAVE = "keepway.terminal";
const ORE_PRIMA_MS = 3 * 3_600_000;
const DOPO_MS = 30 * 60_000;

export const èAperto = (c: string) => c === "g";

export function terminalInCache(): StatoTerminal | null {
  try {
    return JSON.parse(localStorage.getItem(CHIAVE) ?? "null") as StatoTerminal | null;
  } catch {
    return null;
  }
}

export async function scaricaTerminal(): Promise<StatoTerminal | null> {
  const r = await fetch("/api/terminal", { cache: "no-store" });
  if (!r.ok) throw new Error("Terminal non raggiungibile");
  const d = (await r.json()) as Partial<StatoTerminal> & { vuoto?: boolean };
  if (d.vuoto || !d.empty || !d.full) return null;
  const s = d as StatoTerminal;
  try {
    localStorage.setItem(CHIAVE, JSON.stringify(s));
  } catch {
    // pazienza
  }
  return s;
}

// Le finestre in cui avvisare dei cambi: da 3 ore prima dell'inizio di un turno a mezz'ora dopo la fine, per i prossimi 3 giorni.
export function finestreTerminal(adessoMs: number): { da: number; a: number }[] {
  const out: { da: number; a: number }[] = [];
  for (const b of blocchiEffettivi()) {
    const inizio = istanteDaMinutiAssoluti(b.inizio);
    const fine = istanteDaMinutiAssoluti(b.fine);
    if (fine + DOPO_MS < adessoMs || inizio - ORE_PRIMA_MS > adessoMs + 3 * 86_400_000) continue;
    out.push({ da: inizio - ORE_PRIMA_MS, a: fine + DOPO_MS });
  }
  return out;
}
