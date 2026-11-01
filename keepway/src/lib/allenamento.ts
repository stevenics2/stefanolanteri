import { giornoEffettivo } from "./calendario";
import { caricoGiorno } from "./carico";
import { dataPiù, inizioSettimana } from "./date";
import { durataMin, durataTotaleMin } from "./durata";
import { attesaPerTask, finestreLibere, inizioUtile, limiteSerale, oreSonnoPrima, type Finestra } from "./sonno";
import type { Evento, PianoVoce, Stato, Task } from "./tipi";
import { èPianificata } from "./pianoAuto";
import { adessoMs } from "./seed";

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
export function senzaEventi(finestre: Finestra[], eventi: Evento[], data: string): Finestra[] {
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

// La lavatrice (e le faccende col seguito, tipo «stendi il bucato»): va messa quando, a fine ciclo, sei sveglio e a casa.
// Si cerca l'orario di partenza più presto per cui il seguito cade in un momento libero; se non c'è, il primo momento libero.
function analizzaFaccenda(task: Task, data: string, eventi: Evento[], dopoMin = 0): AnalisiGiorno {
  const g = giornoEffettivo(data);
  if (g?.modifica?.tipo === "assenza" && g.modifica.assenza === "malattia") return { slot: null, qualita: 0, nota: "", motivo: "malattia" };
  if (g && g.codici.includes("1") && g.codici.includes("4")) return { slot: null, qualita: 0, nota: "", motivo: "1+4: giornata troppo pesante" };
  const serve = durataMin(task) || 15;
  const dopo = task.seguito?.dopoMin ?? 0;
  const liberi = senzaEventi(finestreLibere(data, Math.max(8 * 60, dopoMin, inizioUtile(data, attesaPerTask(task))), 22 * 60 + 30, 15), eventi, data);
  const adatti = liberi.filter((f) => f.a - f.da >= serve);
  if (adatti.length === 0) return { slot: null, qualita: 0, nota: "", motivo: "nessun momento libero" };
  for (const f of adatti) {
    for (let da = f.da; da + serve <= f.a; da += 30) {
      const fineCiclo = da + serve + dopo;
      if (liberi.some((l) => fineCiclo >= l.da && fineCiclo <= l.a - 10)) {
        return { slot: { da, a: da + serve }, qualita: 3, nota: `${dopo >= 60 ? `${Math.round(dopo / 6) / 10}`.replace(".", ",") + " ore" : `${dopo} min`} dopo sei libero` };
      }
    }
  }
  return { slot: { da: adatti[0].da, a: adatti[0].da + serve }, qualita: 1, nota: "a fine ciclo potresti essere in turno o a dormire" };
}

// Una task qualsiasi con la pianificazione automatica: niente nei giorni pesanti (solo l'essenziale se è essenziale), nella fascia scelta
// (mattina, pomeriggio, prima di dormire), nel primo momento libero abbastanza lungo tra turni, sonno e appuntamenti.
function analizzaGenerica(task: Task, data: string, eventi: Evento[], dopoMin = 0): AnalisiGiorno {
  const carico = caricoGiorno(data);
  if (carico === "nessuna") return { slot: null, qualita: 0, nota: "", motivo: "notte + sera: giornata di recupero" };
  if (carico === "essenziale" && !task.essenziale) return { slot: null, qualita: 0, nota: "", motivo: "giornata pesante: solo l'essenziale" };
  const g = giornoEffettivo(data);
  const tranquilla = /medit|lettur|leggi/i.test(task.titolo);
  const sera = tranquilla ? Math.max(22 * 60 + 30, limiteSerale(data)) : 22 * 60 + 30;
  const [da, a, nota] =
    task.fascia === "mattina" ? [8 * 60, 13 * 60, "mattina"] : task.fascia === "pomeriggio" ? [13 * 60, 19 * 60, "pomeriggio"] : task.fascia === "sera" ? [18 * 60, sera, "prima di dormire"] : [8 * 60, sera, "quando sei libero"];
  const serveMin = durataTotaleMin(task);
  const liberi = senzaEventi(finestreLibere(data, Math.max(da, dopoMin, inizioUtile(data, attesaPerTask(task))), a, 15), eventi, data).filter((f) => f.a - f.da >= serveMin); // mai prima di un'ora dopo la sveglia (mezz'ora per la meditazione)
  if (liberi.length === 0) return { slot: null, qualita: 0, nota, motivo: "nessun momento libero adatto" };
  const f = liberi[0];
  return { slot: { da: f.da, a: f.da + serveMin }, qualita: (g?.riposo ? 3 : carico === "normale" ? 2 : 1), nota };
}

// Un giorno per una task: il momento proposto (o perché no).
// `dopoMin` = non prima di quest'ora (minuti dalla mezzanotte): serve per cercare un nuovo momento quando quello di prima è passato.
export function analizzaGiorno(task: Task, data: string, eventi: Evento[], dopoMin = 0): AnalisiGiorno {
  if (task.seguito) return analizzaFaccenda(task, data, eventi, dopoMin);
  if (task.areaId !== "allenamento") return analizzaGenerica(task, data, eventi, dopoMin); // gli allenamenti hanno le loro regole sui turni
  const e = regolaAllenamento(data);
  if ("motivo" in e) return { slot: null, qualita: 0, nota: "", motivo: e.motivo };
  const serve = durataTotaleMin(task);
  const liberi = senzaEventi(finestreLibere(data, Math.max(e.regola.dopo, dopoMin, inizioUtile(data)), e.regola.prima, 15), eventi, data).filter((f) => f.a - f.da >= serve);
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
  // Per oggi si propone solo quello che è ancora da venire: alle 23:40 niente «oggi alle 13:00» (e niente oggi, se non c'è più un momento libero).
  const adesso = new Date(adessoMs());
  const dopoOggi = Math.ceil((adesso.getHours() * 60 + adesso.getMinutes()) / 15) * 15;
  const dopo = (d: string) => (d === oggi ? dopoOggi : 0);
  const limiteVecchi = dataPiù(oggi, -60);
  const lunedi = inizioSettimana(oggi);
  const out: PianoVoce[] = [];

  // Le voci di task non più automatiche (o eliminate) spariscono
  const automatiche = stato.task.filter((t) => t.attiva && èPianificata(t));
  const idAuto = new Set(stato.task.filter(èPianificata).map((t) => t.id));

  for (const task of automatiche) {
    const ric = task.ricorrenza;
    if (ric.tipo !== "auto" && ric.tipo !== "intervallo") continue;
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
    if (ric.tipo === "intervallo") {
      // «Ogni N giorni»: si parte dall'ultima volta che l'hai fatta e si conta N giorni da lì (se la fai prima o dopo, si riparte da quel giorno).
      // Nei giorni impossibili (turni pesanti) si prende il più vicino a quello giusto, prima nella tolleranza e poi il primo possibile dopo.
      const { ogni, tolleranza } = ric;
      const orizzonte = dataPiù(oggi, 27);
      const ok = (d: string) => d >= oggi && !esclusi.has(d) ? analizzaGiorno(task, d, eventi, dopo(d)) : null;
      let prec: string | null = [...fatti].filter((d) => d <= oggi).sort().pop() ?? null;
      const fissati = tenute.filter((v) => v.tipo === "fissato" && v.data >= oggi).map((v) => v.data).sort();
      for (let giro = 0; giro < 12; giro++) {
        let da: string;
        let a: string;
        if (prec === null) {
          da = oggi;
          a = dataPiù(oggi, 2); // la prima volta: nei prossimi giorni
        } else {
          da = dataPiù(prec, ogni); // mai prima di N giorni dall'ultima volta
          a = dataPiù(prec, ogni + tolleranza); // al massimo N + tolleranza
          if (a < oggi) { da = oggi; a = dataPiù(oggi, 1); } // in ritardo: appena possibile
          if (da < oggi) da = oggi;
        }
        const bersaglio = prec === null ? oggi : dataPiù(prec, ogni);
        let scelta: { d: string; a: AnalisiGiorno } | null = null;
        const fis = fissati.find((d) => d >= da && d <= a);
        if (fis) scelta = { d: fis, a: analizzaGiorno(task, fis, eventi, dopo(fis)) };
        else {
          let migliore: { d: string; a: AnalisiGiorno; p: number } | null = null;
          for (let d = da; d <= a; d = dataPiù(d, 1)) {
            const x = ok(d);
            if (!x || !x.slot) continue;
            const p = x.qualita * 10 - Math.abs(giorniTraDate(bersaglio, d)) * 8; // il più vicino a quello giusto (il primo)
            if (!migliore || p > migliore.p) migliore = { d, a: x, p };
          }
          if (migliore) scelta = migliore;
          else {
            // nessun giorno possibile nella finestra: il primo possibile dopo (fino a metà intervallo), altrimenti prima
            for (let d = dataPiù(a, 1); d <= dataPiù(a, Math.max(2, Math.floor(ogni / 2))); d = dataPiù(d, 1)) {
              const x = ok(d);
              if (x?.slot) { scelta = { d, a: x }; break; }
            }
          }
        }
        if (!scelta || scelta.d > orizzonte || !scelta.a.slot) break;
        scelti.push({ taskId: task.id, data: scelta.d, tipo: "auto", da: scelta.a.slot.da, a: scelta.a.slot.a });
        prec = scelta.d;
      }
    }
    for (let sett = 0; sett < (ric.tipo === "auto" ? 2 : 0); sett++) {
      const volte = ric.tipo === "auto" ? ric.volte : 0;
      const giorni = Array.from({ length: 7 }, (_, i) => dataPiù(lunedi, sett * 7 + i));
      const inSett = (d: string) => giorni.includes(d);
      const gia = [...contanti].filter(inSett).length;
      let servono = volte - gia;
      const candidati = giorni
        .filter((d) => d >= oggi && !contanti.has(d) && !esclusi.has(d))
        .map((d) => ({ d, a: analizzaGiorno(task, d, eventi, dopo(d)) }))
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
        const slot = analizzaGiorno(task, v.data, eventi, dopo(v.data)).slot;
        out.push({ ...v, da: slot?.da, a: slot?.a });
      } else out.push(v);
    }
    out.push(...scelti);
  }
  // voci di task spente: restano com'erano (se si riaccende la task, il piano riparte)
  for (const v of stato.pianoAuto) if (v.data >= limiteVecchi && idAuto.has(v.taskId) && !automatiche.some((t) => t.id === v.taskId)) out.push(v);
  return out.sort((a, b) => a.data.localeCompare(b.data) || a.taskId.localeCompare(b.taskId));
}

// --- Le proposte per il popup «Pianificazione automatica»: 2-3 piani diversi per i prossimi 7 giorni ---
export type Proposta = { voci: PianoVoce[] }; // i giorni scelti nei prossimi 7 giorni, con il momento di ognuno

// La prima è il piano migliore; le altre sono lo stesso piano ma senza uno dei giorni scelti (così cambia davvero qualcosa), tutte diverse tra loro.
export function proposte(stato: Stato, bozza: Task, oggi: string, quante = 3): Proposta[] {
  const intervallo = bozza.ricorrenza.tipo === "intervallo";
  const fine = dataPiù(oggi, intervallo ? 27 : 6);
  const calcola = (esclusi: string[]) => {
    const s2: Stato = {
      ...stato,
      task: [...stato.task.filter((t) => t.id !== bozza.id), bozza],
      pianoAuto: [...stato.pianoAuto.filter((v) => v.taskId !== bozza.id), ...esclusi.map((d) => ({ taskId: bozza.id, data: d, tipo: "escluso" as const }))],
    };
    return pianifica(s2, oggi).filter((v) => v.taskId === bozza.id && v.tipo === "auto" && v.data >= oggi && v.data <= fine).slice(0, intervallo ? 4 : 99);
  };
  const chiave = (v: PianoVoce[]) => v.map((x) => x.data).join("|");
  const out: Proposta[] = [];
  const viste = new Set<string>();
  const aggiungi = (voci: PianoVoce[]) => {
    const k = chiave(voci);
    if (voci.length > 0 && !viste.has(k) && out.length < quante) {
      viste.add(k);
      out.push({ voci });
    }
  };
  const migliore = calcola([]);
  aggiungi(migliore);
  const giorni = migliore.map((v) => v.data);
  for (const d of giorni) aggiungi(calcola([d])); // senza uno dei giorni
  if (giorni.length >= 2) aggiungi(calcola([giorni[0], giorni[1]]));
  // ancora poche: si prova a togliere i giorni scelti dalle altre proposte
  for (const p of [...out]) for (const v of p.voci) aggiungi(calcola([...new Set([giorni[0], v.data])].filter(Boolean) as string[]));
  return out;
}
