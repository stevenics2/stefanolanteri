// Il meteo di Trieste (Open-Meteo, gratuito e senza chiave): temperatura e cielo di adesso. Se non risponde, il benvenuto semplicemente non ne parla.
export type Meteo = { gradi: number; cielo: string };

const TRIESTE = { lat: 45.6495, lon: 13.7768 };
const CHIAVE = "keepway.meteo";
const VALIDO_MS = 30 * 60_000;

// I codici del tempo (WMO) in parole.
export function cieloDa(codice: number): string {
  if (codice === 0) return "cielo sereno";
  if (codice === 1) return "cielo quasi sereno";
  if (codice === 2) return "cielo parzialmente nuvoloso";
  if (codice === 3) return "cielo coperto";
  if (codice === 45 || codice === 48) return "nebbia";
  if (codice >= 51 && codice <= 57) return "pioggerella";
  if (codice >= 61 && codice <= 67) return "pioggia";
  if (codice >= 71 && codice <= 77) return "neve";
  if (codice >= 80 && codice <= 82) return "rovesci";
  if (codice === 85 || codice === 86) return "neve a tratti";
  if (codice >= 95) return "temporale";
  return "tempo variabile";
}

export async function scaricaMeteo(): Promise<Meteo | null> {
  try {
    const c = JSON.parse(localStorage.getItem(CHIAVE) ?? "null") as { ts: number; m: Meteo } | null;
    if (c && Date.now() - c.ts < VALIDO_MS) return c.m;
  } catch {
    // niente cache
  }
  const stop = new AbortController();
  const timer = setTimeout(() => stop.abort(), 3500);
  try {
    const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${TRIESTE.lat}&longitude=${TRIESTE.lon}&current=temperature_2m,weather_code&timezone=Europe%2FRome`, { signal: stop.signal });
    if (!r.ok) return null;
    const d = (await r.json()) as { current?: { temperature_2m?: number; weather_code?: number } };
    const t = d.current?.temperature_2m;
    if (typeof t !== "number") return null;
    const m: Meteo = { gradi: Math.round(t), cielo: cieloDa(d.current?.weather_code ?? -1) };
    try {
      localStorage.setItem(CHIAVE, JSON.stringify({ ts: Date.now(), m }));
    } catch {
      // pazienza
    }
    return m;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
