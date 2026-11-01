// La settimana: cosa c'è in ogni giorno, quanto è carico, gli obiettivi della settimana e il rito della domenica.
import { caricoGiorno } from "./carico";
import { dataPiù, giornoSettimana, inizioSettimana } from "./date";
import { durataTotaleMin } from "./durata";
import { eventiDelGiorno } from "./eventi";
import { riepilogoGiorno } from "./giornata";
import { momentoAttuale } from "./momento";
import { èIgnorata, èPrevista, giornata } from "./regole";
import type { GiornoSalute } from "./salute";
import { èAllenamento, ALLENAMENTI_A_SETTIMANA } from "./traguardi";
import type { Evento, ObiettivoSett, Stato, Task } from "./tipi";

export const OBIETTIVI_PREDEFINITI: ObiettivoSett[] = [
  { id: "allenamenti", attivo: true, target: ALLENAMENTI_A_SETTIMANA },
  { id: "notti", attivo: true, target: 5 },
  { id: "piene", attivo: true, target: 3 },
  { id: "libero", attivo: false, target: 1, testo: "" },
];

export const obiettiviDi = (s: Stato): ObiettivoSett[] => {
  const salvati = s.settimana?.obiettivi ?? [];
  return OBIETTIVI_PREDEFINITI.map((p) => ({ ...p, ...(salvati.find((x) => x.id === p.id) ?? {}) }));
};

// Il lunedì della settimana da preparare: la domenica è quella che arriva, gli altri giorni quella in corso.
export const lunediDaPreparare = (oggi: string) => (giornoSettimana(oggi) === 0 ? dataPiù(oggi, 1) : inizioSettimana(oggi));

// Il rito della domenica: si propone dalla domenica pomeriggio e il lunedì, finché la settimana non è preparata.
export function ritoDaFare(s: Stato, oggi: string, oraMin: number): string | null {
  const g = giornoSettimana(oggi);
  const lunedi = lunediDaPreparare(oggi);
  if (s.settimana?.programmata === lunedi) return null;
  if (g === 0 && oraMin >= 12 * 60) return lunedi;
  if (g === 1) return lunedi;
  return null;
}

// --- Le righe di un giorno: task (di ogni tipo) e appuntamenti, con l'orario ---
export type RigaGiorno = { id: string; t: number; orario: string; titolo: string; fatto: boolean; task?: Task; evento?: Evento };

export function righeGiorno(s: Stato, data: string, oggi: string, adessoMin: number): RigaGiorno[] {
  const out: RigaGiorno[] = [];
  const hh = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  for (const t of s.task) {
    if (!èPrevista(t, data, { vacanza: s.vacanza }) || èIgnorata(s.ignorati, t.id, data)) continue;
    const scelto = s.momenti.find((m) => m.taskId === t.id && m.data === data);
    const f = momentoAttuale(t, data, { oggi, adessoMin, eventi: s.eventi, scelto }).finestra;
    out.push({ id: t.id, t: f?.da ?? 9999, orario: f ? `${hh(f.da)}–${hh(f.a)}` : "", titolo: t.titolo, fatto: s.completamenti.some((c) => c.taskId === t.id && c.data === data), task: t });
  }
  for (const e of eventiDelGiorno(s.eventi, data, oggi).filter((x) => x.data === data)) {
    out.push({ id: e.id, t: e.ora ? Number(e.ora.slice(0, 2)) * 60 + Number(e.ora.slice(3)) : -1, orario: e.ora ?? "tutto il giorno", titolo: e.titolo, fatto: e.fatto, evento: e });
  }
  return out.sort((a, b) => a.t - b.t);
}

// --- Il carico di un giorno: quanto del tempo libero (tra turni e sonno) è occupato da task e appuntamenti ---
export type LivelloCarico = "recupero" | "essenziale" | "leggero" | "normale" | "pesante";
export type CaricoGiorno = { livello: LivelloCarico; usatoMin: number; liberoMin: number; righe: number };

export function caricoDelGiorno(s: Stato, data: string, oggi: string, adessoMin = 0): CaricoGiorno {
  const c = caricoGiorno(data);
  const righe = righeGiorno(s, data, oggi, adessoMin);
  const usato = righe.reduce((t, r) => t + (r.task ? durataTotaleMin(r.task) : (r.evento?.durataMin || 60) + 2 * (r.evento?.spostamentoMin ?? 0)), 0);
  const libero = riepilogoGiorno(data).liberoMin;
  if (c === "nessuna") return { livello: "recupero", usatoMin: usato, liberoMin: libero, righe: righe.length };
  const rapporto = libero > 0 ? usato / libero : usato > 0 ? 2 : 0;
  const livello: LivelloCarico = c === "essenziale" && righe.length > 0 && rapporto < 0.7 ? "essenziale" : rapporto >= 0.7 ? "pesante" : rapporto >= 0.35 ? "normale" : "leggero";
  return { livello, usatoMin: usato, liberoMin: libero, righe: righe.length };
}

// --- Gli obiettivi della settimana, con a che punto sei ---
export type ProgressoObiettivo = { id: ObiettivoSett["id"]; titolo: string; valore: number; target: number; fatto: boolean };

export function progressoObiettivi(s: Stato, lunedi: string, giorniSalute: GiornoSalute[], oggi: string): ProgressoObiettivo[] {
  const giorni = Array.from({ length: 7 }, (_, i) => dataPiù(lunedi, i));
  const idAll = new Set(s.task.filter(èAllenamento).map((t) => t.id));
  const nAll = s.completamenti.filter((c) => idAll.has(c.taskId) && c.data >= giorni[0] && c.data <= giorni[6]).length;
  const piene = giorni.filter((d) => {
    if (d > oggi) return false;
    const g = giornata(s, d);
    return g.previste.length > 0 && g.fatte.length === g.previste.length;
  }).length;
  const notti = giorni.filter((d) => (giorniSalute.find((g) => g.giorno === d)?.sonnoMin ?? 0) >= s.impostazioni.obiettivoSonnoMin).length;
  const out: ProgressoObiettivo[] = [];
  for (const o of obiettiviDi(s)) {
    if (!o.attivo) continue;
    if (o.id === "allenamenti") out.push({ id: o.id, titolo: "Allenamenti", valore: nAll, target: o.target, fatto: nAll >= o.target });
    else if (o.id === "notti") out.push({ id: o.id, titolo: "Notti sopra l'obiettivo", valore: notti, target: o.target, fatto: notti >= o.target });
    else if (o.id === "piene") out.push({ id: o.id, titolo: "Giornate piene", valore: piene, target: o.target, fatto: piene >= o.target });
    else if (o.testo?.trim()) {
      const fatto = s.settimana?.liberoFatto === lunedi;
      out.push({ id: o.id, titolo: o.testo.trim(), valore: fatto ? 1 : 0, target: 1, fatto });
    }
  }
  return out;
}
