// Il benvenuto del mattino: quando comparire e le frasi (scritte come le scriverebbe una persona, non una tabella).
import { nomeAssenza, type GiornoEffettivo } from "./calendario";
import type { Meteo } from "./meteo";

const CHIAVE = "keepway.benvenuto";
export const PAUSA_MINIMA_MS = 8 * 3_600_000; // tra un benvenuto e il successivo

export function ultimoBenvenuto(): number | null {
  try {
    return Number(localStorage.getItem(CHIAVE)) || null;
  } catch {
    return null;
  }
}
export function segnaBenvenuto(ms: number = Date.now()) {
  try {
    localStorage.setItem(CHIAVE, String(ms));
  } catch {
    // pazienza
  }
}

export function saluto(ora: number, nome: string): string {
  const n = nome.trim() ? ` ${nome.trim()}` : "";
  if (ora >= 5 && ora < 12) return `Buongiorno${n} ☀️`;
  if (ora >= 12 && ora < 18) return `Buon pomeriggio${n} 🌤️`;
  if (ora >= 18 && ora < 23) return `Buonasera${n} 🌙`;
  return `Ciao${n} 🌙`;
}

const plurale = (n: number, uno: string, molti: string) => `${n} ${n === 1 ? uno : molti}`;
export function oreEMinutiInParole(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h === 0) return plurale(m, "minuto", "minuti");
  if (m === 0) return plurale(h, "ora", "ore");
  return `${plurale(h, "ora", "ore")} e ${plurale(m, "minuto", "minuti")}`;
}

// «**…**» = grassetto.
export function fraseSonno(min: number, obiettivoMin: number): string {
  const d = oreEMinutiInParole(min);
  const o = oreEMinutiInParole(obiettivoMin);
  const diff = min - obiettivoMin;
  if (diff >= 60) return `Hai dormito **${d}**: più di un'ora sopra il tuo obiettivo di ${o}. Recupero ottimo 💪`;
  if (diff >= 0) return `Hai dormito **${d}**, in linea con il tuo obiettivo di ${o}. Bel lavoro 👏`;
  if (diff >= -60) return `Hai dormito **${d}**, appena sotto l'obiettivo di ${o}. Niente di grave.`;
  return `Hai dormito **${d}**, sotto l'obiettivo di ${o}. Oggi vai piano e, se riesci, ritagliati un riposino 😴`;
}

const orarioParole = (orario: string) => {
  const p = orario.split("–");
  return orario.includes("/") || p.length !== 2 ? orario : `dalle ${p[0]} alle ${p[1]}`;
};

function descrizioneTurno(g: GiornoEffettivo): string {
  if (g.modifica?.tipo === "assenza") return `in **${nomeAssenza(g.modifica.assenza ?? "altro").toLowerCase()}**`;
  if (g.riposo) return "a **riposo**";
  const nome = g.codici.length > 1 ? `doppio turno ${g.codici.slice().sort().join("+")}` : `turno ${g.codici[0]}`;
  return `**${nome}**, ${orarioParole(g.orario)}`;
}

export function fraseTurno(g: GiornoEffettivo | undefined): string | null {
  if (!g) return null;
  if (g.modifica?.tipo === "assenza") return `Oggi sei ${descrizioneTurno(g)}.`;
  if (g.riposo) return "Oggi sei **a riposo** 🌿";
  return `In programma hai il ${descrizioneTurno(g)}.`;
}
export function fraseDomani(g: GiornoEffettivo | undefined): string | null {
  if (!g) return null;
  if (g.modifica?.tipo === "assenza" || g.riposo) return `Domani sei ${descrizioneTurno(g)}.`;
  return `Domani hai il ${descrizioneTurno(g)}.`;
}

export function fraseMeteo(m: Meteo): string {
  const g = Math.abs(m.gradi) === 1 ? "grado" : "gradi";
  return `Fuori c'è **${m.cielo}** e la temperatura è di circa **${m.gradi} ${g}** 🌡️`;
}
