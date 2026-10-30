import { dataPiù, giornoSettimana, GIORNI_LUNGHI, MESI_LUNGHI } from "./date";
import type { Evento, Priorita } from "./tipi";

export const PRIORITA: { id: Priorita; nome: string; colore: string; classe: string; peso: number }[] = [
  { id: "alta", nome: "Alta", colore: "#f87171", classe: "bg-red-500/15 text-red-300", peso: 0 },
  { id: "media", nome: "Media", colore: "#fbbf24", classe: "bg-amber-500/15 text-amber-300", peso: 1 },
  { id: "bassa", nome: "Bassa", colore: "#7dd3fc", classe: "bg-sky-500/15 text-sky-300", peso: 2 },
];
export const prioritaDi = (p: Priorita) => PRIORITA.find((x) => x.id === p)!;

// Differenza in giorni tra due date "AAAA-MM-GG".
export function giorniTra(da: string, a: string): number {
  const t = (s: string) => {
    const [y, m, g] = s.split("-").map(Number);
    return Date.UTC(y, m - 1, g) / 86_400_000;
  };
  return Math.round(t(a) - t(da));
}

// "mar 10 nov"
export function dataBreve(data: string): string {
  const [, m, g] = data.split("-").map(Number);
  return `${GIORNI_LUNGHI[giornoSettimana(data)].slice(0, 3)} ${g} ${MESI_LUNGHI[m - 1].slice(0, 3)}`;
}

// "Tra 6 giorni", "Tra una settimana", "Domani"...
export function traQuanto(oggi: string, data: string): string {
  const n = giorniTra(oggi, data);
  if (n <= 0) return "Oggi";
  if (n === 1) return "Domani";
  if (n === 7) return "Tra una settimana";
  if (n === 14) return "Tra due settimane";
  if (n < 14) return `Tra ${n} giorni`;
  return `Tra ${Math.round(n / 7)} settimane`;
}

const ordina = (a: Evento, b: Evento) => (a.ora ?? "00:00").localeCompare(b.ora ?? "00:00") || prioritaDi(a.priorita).peso - prioritaDi(b.priorita).peso;

// Gli eventi di un giorno, in ordine di ora. I promemoria non ancora fatti e scaduti restano visibili oggi.
export function eventiDelGiorno(eventi: Evento[], data: string, oggi: string): Evento[] {
  return eventi
    .filter((e) => e.data === data || (e.tipo === "promemoria" && !e.fatto && e.data < data && data === oggi))
    .sort(ordina);
}

// "In arrivo": dopo domani, entro i giorni di anticipo scelti per ciascun evento. Prima le priorità alte, poi la data.
export function inArrivo(eventi: Evento[], oggi: string): Evento[] {
  return eventi
    .filter((e) => !e.fatto && e.anticipoGiorni > 0)
    .filter((e) => {
      const n = giorniTra(oggi, e.data);
      return n >= 2 && n <= e.anticipoGiorni;
    })
    .sort((a, b) => prioritaDi(a.priorita).peso - prioritaDi(b.priorita).peso || a.data.localeCompare(b.data) || ordina(a, b));
}

export const domani = (oggi: string) => dataPiù(oggi, 1);
