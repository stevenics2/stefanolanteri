// Il sonno visto nel tempo: le notti, il debito di sonno e quanto sei regolare. I dati arrivano dall'iPhone (una riga per giorno).
import type { GiornoSalute } from "./salute";

export const OBIETTIVO_SONNO_PREDEFINITO = 420; // 7 ore
export type Notte = { giorno: string; minuti: number; letto: string | null; sveglia: string | null };

// Solo i giorni con un dato di sonno vero (le notti senza dato non contano: non ti penalizzo se non hai sincronizzato).
export const notti = (giorni: GiornoSalute[]): Notte[] =>
  giorni
    .filter((g) => g.sonnoMin && g.sonnoMin >= 60)
    .map((g) => ({ giorno: g.giorno, minuti: g.sonnoMin!, letto: g.letto, sveglia: g.sveglia }))
    .sort((a, b) => (a.giorno < b.giorno ? -1 : 1));

// Il debito di sonno: ogni notte sotto l'obiettivo lo fa salire dei minuti che mancano; ogni notte sopra lo fa scendere, ma solo della metà
// (il sonno perso non si recupera tutto in una notte). Mai sotto zero.
export function debitoDiSonno(n: Notte[], obiettivoMin: number): { debito: number; storia: { giorno: string; debito: number }[] } {
  let debito = 0;
  const storia: { giorno: string; debito: number }[] = [];
  for (const x of n) {
    const manca = obiettivoMin - x.minuti;
    debito = Math.max(0, debito + (manca > 0 ? manca : manca * 0.5));
    storia.push({ giorno: x.giorno, debito: Math.round(debito) });
  }
  return { debito: Math.round(debito), storia };
}

const minuti = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
const scarto = (v: number[]) => {
  if (v.length < 3) return null;
  const m = v.reduce((a, b) => a + b, 0) / v.length;
  return Math.round(Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / v.length));
};

// Quanto variano l'ora del letto e della sveglia (deviazione in minuti) nelle ultime notti. Il letto si conta dalle 18:00, così 23:30 e 01:00 sono vicini.
export function regolarita(n: Notte[]): { letto: number | null; sveglia: number | null } {
  const ultime = n.slice(-7);
  const letti = ultime.filter((x) => x.letto).map((x) => (minuti(x.letto!) - 18 * 60 + 1440) % 1440);
  const sveglie = ultime.filter((x) => x.sveglia).map((x) => minuti(x.sveglia!));
  return { letto: scarto(letti), sveglia: scarto(sveglie) };
}

export const giudizioRegolarita = (sd: number | null) => (sd === null ? null : sd <= 30 ? "ottima" : sd <= 60 ? "buona" : sd <= 100 ? "variabile" : "irregolare");

export const oreEMinuti = (min: number) => `${Math.floor(min / 60)} h ${String(Math.round(min % 60)).padStart(2, "0")}`;
