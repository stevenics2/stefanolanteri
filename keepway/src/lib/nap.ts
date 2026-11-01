// Il power nap: dopo una notte corta, un riposino di 20-45 minuti nel primo pomeriggio (preferibilmente alle 14:00).
import { riepilogoGiorno } from "./giornata";
import { finestreLibere } from "./sonno";

export const DURATE_NAP = [20, 30, 45] as const;
const SOGLIA_NOTTE_CORTA_MIN = 6 * 60;
const SOGLIA_DEBITO_MIN = 4 * 60;
const ORE_PRIMA_DI_DORMIRE_MIN = 6 * 60; // il riposino deve finire almeno 6 ore prima di andare a letto, per non rovinare la notte
const CANDIDATI = [14 * 60, 14 * 60 + 15, 13 * 60 + 45, 14 * 60 + 30, 13 * 60 + 30, 14 * 60 + 45, 15 * 60]; // dalle 14:00 in poi, in ordine di preferenza

export const serveNap = (notteMin: number | null, debitoMin: number, obiettivoMin: number) =>
  notteMin !== null && (notteMin < SOGLIA_NOTTE_CORTA_MIN || (debitoMin >= SOGLIA_DEBITO_MIN && notteMin < obiettivoMin));

// Quando farlo oggi: un momento libero (tra turni, appuntamenti e sonno) che non sia troppo vicino al sonno della notte. null = nessuno.
export function momentoNap(oggi: string, adessoMin: number, durataMin: number): { da: number; a: number } | null {
  const r = riepilogoGiorno(oggi);
  if (r.codici.includes("1")) return null; // dopo la notte di lavoro il sonno del giorno è già nel piano
  const letto = r.aLetto ? Number(r.aLetto.slice(0, 2)) * 60 + Number(r.aLetto.slice(3, 5)) : null;
  const lettoAssoluto = letto === null ? null : letto < 12 * 60 ? letto + 1440 : letto;
  const finestre = finestreLibere(oggi, 13 * 60, 16 * 60 + 30, durataMin + 10);
  for (const s of CANDIDATI) {
    const fine = s + durataMin;
    if (s < adessoMin + 5) continue;
    if (lettoAssoluto !== null && fine > lettoAssoluto - ORE_PRIMA_DI_DORMIRE_MIN) continue;
    if (finestre.some((f) => s >= f.da && fine + 5 <= f.a)) return { da: s, a: fine };
  }
  return null;
}
