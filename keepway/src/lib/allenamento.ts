import { giornoEffettivo } from "./calendario";
import { dataPiù, inizioSettimana } from "./date";
import { durataTotaleMin } from "./durata";
import { finestreLibere, oreSonnoPrima, type Finestra } from "./sonno";
import type { Evento, PianoVoce, Stato, Task } from "./tipi";

// --- Quando ha senso allenarsi, in base ai turni del giorno ---
// dopo/prima = in che fascia oraria (minuti dalla mezzanotte); qualita = quanto è un buon giorno (3 = il migliore).
type Regola = { dopo: number; prima: number; qualita: number; nota: string };
type Esito = { regola: Regola } | { motivo: string };

const SONNO_MINIMO_MIN = 7 * 60;

export function regolaAllenamento(data: string): Esito {
  const g = giornoEffettivo(data);
  if (!g) return { regola: { dopo: 9 * 60, prima: 22 * 60 + 30, qualita: 1, nota: "turni non noti" } };
  if (g.modifica?.tipo === "assenza" && g.modifica.assenza === "malattia") return { motivo: "malattia" };
  const c = g.codici;
  if (c.length === 0) return { regola: { dopo: 9 * 60, prima: 22 * 60 + 30, qualita: 3, nota: "giorno libero: meglio la mattina" } };
  if (c.includes("1") && c.includes("4")) return { motivo: "1+4: giornata troppo pesante" };
  if (c.length === 1 && c[0] === "1") return { regola: { dopo: 17 * 60, prima: 22 * 60 + 30, qualita: 2, nota: "solo notte: dal tardo pomeriggio" } };
  if (c.includes("2") && c.includes("3")) return { regola: { dopo: 19 * 60 + 30, prima: 22 * 60 + 30, qualita: 1, nota: "2+3: la sera" } };
  if (c.includes("3") && c.includes("4")) {
    const sonno = oreSonnoPrima(data);
    if (sonno !== null && sonno < SONNO_MINIMO_MIN) return { motivo: "3+4: dormiresti troppo poco" };
    return { regola: { dopo: 8 * 60, prima: 12 * 60 + 30, qualita: 1, nota: "3+4: la mattina" } };
  }
  if (c.length === 1 && c[0] === "2") return { regola: { dopo: 15 * 60, prima: 22 * 60 + 30, qualita: 2, nota: "turno 2: dal pomeriggio" } };
  if (c.length === 1 && c[0] === "3") return { regola: { dopo: 8 * 60, prima: 12 * 60 + 30, qualita: 2, nota: "turno 3: la mattina" } };
  if (c.length === 1 && c[0] === "4") return { regola: { dopo: 9 * 60, prima: 17 * 60, qualita: 2, nota: "turno 4: mattina o primo pomeriggio" } };
  return { motivo: "combinazione di turni non prevista" };
}

// Toglie dalle finestre il tempo occupato dagli appuntamenti (con il viaggio, andata e ritorno).
function senzaEventi(finestre: Finestra[], eventi: Evento[], data: string): Finestra[] {
  let out = finestre;
  for (const e of eventi) {
    if (e.data !== data || !e.ora || e.fatto || e.tipo !== "appuntamento") continue;
    const inizio = Number(e.ora.slice(0, 2)) * 60 + Number(e.ora.slice(3));
    const da = inizio - e.spostamentoMin;
    const a = inizio + e.durataMin + e.spostamentoMin;
    out = out.flatMap((f) => {
      if (a <= f.da || da >= f.a) return [f];
      const pezzi: Finestra[] = [];
      if (da > f.da) pezzi.push({ da: f.da, a: da });
      if (a < f.a) pezzi.push({ da: a, a: f.a });
      return pezzi;
    });
  }
  return out;
}

export type AnalisiGiorno = { slot: Finestra | null; qualita: number; nota: string; motivo?: string };

// Un giorno per una task: il momento proposto (o perché no).
export function analizzaGiorno(task: Task, data: string, eventi: Evento[]): AnalisiGiorno {
  const e = regolaAllenamento(data);
  if ("motivo" in e) return { slot: null, qualita: 0, nota: "", motivo: e.motivo };
  const serve = durataTotaleMin(task);
  const liberi = senzaEventi(finestreLibere(data, e.regola.dopo, e.regola.prima, 15), eventi, data).filter((f) => f.a - f.da >= serve);
  if (liberi.length === 0) return { slot: null, qualita: 0, nota: e.regola.nota, motivo: "nessun momento libero abbastanza lungo" };
  const f = liberi[0];
  return { slot: { da: f.da, a: f.da + serve }, qualita: e.regola.qualita, nota: e.regola.nota };
}

const giorniTraDate = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);

// --- Il pianificatore: sceglie i giorni delle task "N volte a settimana" ---
// Mantiene: i giorni passati, quelli già fatti, quelli che hai fissato tu e quelli che hai tolto. Il resto lo ricalcola a ogni cambiamento
// (un turno spostato, un appuntamento nuovo, una task fatta o saltata): prima i giorni migliori, poi quelli distanziati da altri allenamenti.
export function pianifica(stato: Stato, oggi: string): PianoVoce[] {
  const eventi = stato.eventi;
  const limiteVecchi = dataPiù(oggi, -60);
  const lunedi = inizioSettimana(oggi);
  const out: PianoVoce[] = [];

  // Le voci di task non più automatiche (o eliminate) spariscono
  const automatiche = stato.task.filter((t) => t.attiva && t.ricorrenza.tipo === "auto");
  const idAuto = new Set(stato.task.filter((t) => t.ricorrenza.tipo === "auto").map((t) => t.id));

  for (const task of automatiche) {
    if (task.ricorrenza.tipo !== "auto") continue;
    const volte = task.ricorrenza.volte;
    const sue = stato.pianoAuto.filter((v) => v.taskId === task.id && v.data >= limiteVecchi);
    const fatti = new Set(stato.completamenti.filter((c) => c.taskId === task.id).map((c) => c.data));
    const tenute: PianoVoce[] = [];

    for (const v of sue) {
      if (v.tipo === "escluso") tenute.push(v); // la scelta di toglierlo resta
      else if (v.tipo === "fissato") tenute.push(v);
      else if (v.data < oggi || fatti.has(v.data)) tenute.push(v); // passato o già fatto: non si tocca
    }

    // quali giorni "contano" già: fatti, o fissati da oggi in poi
    const contanti = new Set<string>([...fatti]);
    for (const v of tenute) if (v.tipo === "fissato" && v.data >= oggi) contanti.add(v.data);
    const esclusi = new Set(tenute.filter((v) => v.tipo === "escluso").map((v) => v.data));
    for (const i of stato.ignorati) if (i.taskId === task.id) esclusi.add(i.data);

    const scelti: PianoVoce[] = [];
    for (let sett = 0; sett < 2; sett++) {
      const giorni = Array.from({ length: 7 }, (_, i) => dataPiù(lunedi, sett * 7 + i));
      const inSett = (d: string) => giorni.includes(d);
      const gia = [...contanti].filter(inSett).length;
      let servono = volte - gia;
      const candidati = giorni
        .filter((d) => d >= oggi && !contanti.has(d) && !esclusi.has(d))
        .map((d) => ({ d, a: analizzaGiorno(task, d, eventi) }))
        .filter((x) => x.a.slot !== null);
      const presi = new Set<string>(); // giorni scelti in questa settimana
      while (servono > 0 && candidati.length > 0) {
        const altri = [...contanti, ...scelti.filter((s) => s.taskId === task.id).map((s) => s.data), ...presi];
        const punteggio = (x: (typeof candidati)[number]) => {
          const dist = altri.length ? Math.min(...altri.map((o) => Math.abs(giorniTraDate(o, x.d)))) : 9;
          return x.a.qualita * 10 + Math.min(dist, 3) * 6 - (dist === 1 ? 25 : 0);
        };
        candidati.sort((p, q) => punteggio(q) - punteggio(p) || p.d.localeCompare(q.d));
        const migliore = candidati.shift()!;
        presi.add(migliore.d);
        scelti.push({ taskId: task.id, data: migliore.d, tipo: "auto", da: migliore.a.slot!.da, a: migliore.a.slot!.a });
        servono--;
      }
    }

    // i momenti proposti si aggiornano anche per i giorni fissati e per quelli già in piano da oggi
    for (const v of tenute) {
      if (v.tipo !== "escluso" && v.data >= oggi) {
        const slot = analizzaGiorno(task, v.data, eventi).slot;
        out.push({ ...v, da: slot?.da, a: slot?.a });
      } else out.push(v);
    }
    out.push(...scelti);
  }
  // voci di task spente: restano com'erano (se si riaccende la task, il piano riparte)
  for (const v of stato.pianoAuto) if (v.data >= limiteVecchi && idAuto.has(v.taskId) && !automatiche.some((t) => t.id === v.taskId)) out.push(v);
  return out.sort((a, b) => a.data.localeCompare(b.data) || a.taskId.localeCompare(b.taskId));
}
