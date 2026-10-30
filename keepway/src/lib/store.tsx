"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { impostaModifiche } from "./calendario";
import { inizioSettimana, oggiLocale } from "./date";
import { bossSettimana, giornata, livello, puntiMinima, xpTotali } from "./regole";
import { nuovoId, statoIniziale, statoVuoto, taskStanza } from "./seed";
import { stanzaDelGiorno } from "./stanze";
import type { Bonus, Completamento, Evento, Impostazioni, Modifica, Stato, Task, Vacanza } from "./tipi";

const CHIAVE = "keepway.v1";
const CHIAVE_VECCHIA = "binario.v1"; // il nome precedente: se ci sono dati salvati lì li si recupera

export type Ricompensa = {
  id: string;
  completamentoId: string;
  titolo: string;
  punti: number;
  bonus: number;
  frase: string;
  nuovoLivello: string | null;
  daTimer: boolean; // finita con il timer: suona la fanfara
  moltiplicatore: number; // combo: 1 = nessuna
};

// Momenti "da festa": combo, record, forziere, boss. Compaiono in un popup, uno alla volta.
export type Festa = { id: string; tipo: "combo" | "record" | "forziere" | "boss"; titolo: string; testo: string; xp: number };

const COMBO_PAUSA_MS = 60 * 60_000; // task di fila = tra una e l'altra meno di un'ora
const COMBO_MINIMO = 3;
const MOLTIPLICATORE_COMBO = 1.5;

// Cosa c'è nel forziere: a sorpresa. Quasi sempre un bonus, ogni tanto un jackpot.
function dentroForziere(aree: Stato["aree"]): { testo: string; xp: number } {
  const r = Math.random();
  if (r < 0.05) return { testo: "JACKPOT! Il forziere era pieno.", xp: 150 };
  if (r < 0.4) return { testo: `${aree[Math.floor(Math.random() * aree.length)].frase}. Oggi l'hai dimostrato.`, xp: 30 };
  if (r < 0.65) return { testo: "Titolo sbloccato: «Il Costante»", xp: 25 };
  return { testo: "Bonus giornata chiusa", xp: 30 + Math.floor(Math.random() * 31) };
}

// Avviso con "Annulla" dopo una modifica ai turni.
export type Avviso = { id: string; testo: string; data: string; rimuovi: string[]; ripristina: Modifica[] };

type Contesto = {
  pronto: boolean;
  stato: Stato;
  oggi: string;
  adesso: number; // ora corrente (ms), aggiornata ogni 30 secondi; 0 finché i dati non sono pronti
  xp: number;
  completa: (taskId: string, opzioni: { minima: boolean; minuti?: number; daTimer?: boolean }) => void;
  annulla: (completamentoId: string) => void;
  salvaTask: (t: Task) => void;
  eliminaTask: (id: string) => void;
  impostazioni: (p: Partial<Impostazioni>) => void;
  setFrase: (areaId: string, frase: string) => void;
  apriTimer: (taskId: string, minima: boolean, durataMin: number) => void; // apre la schermata, senza far partire
  partiTimer: () => void;
  pausaTimer: () => void;
  riprendiTimer: () => void;
  fermaTimer: () => void;
  resettaTimer: () => void;
  ignoraOggi: (taskId: string) => void;
  ripristina: (taskId: string) => void;
  rimanda: (taskId: string, alle: number) => void;
  annullaRinvio: (taskId: string) => void;
  impostaMomento: (taskId: string, momento: { da: number; a: number } | null) => void;
  setStanze: (stanze: string[]) => void;
  setVacanza: (v: Vacanza | null) => void;
  salvaEvento: (e: Evento) => void;
  eliminaEvento: (id: string) => void;
  segnaEvento: (id: string, fatto: boolean) => void;
  salvaModifiche: (nuove: Modifica[], testo: string) => void;
  annullaModifiche: (ids: string[]) => void; // toglie le modifiche (e le collegate dello stesso gruppo)
  avviso: Avviso | null;
  festa: Festa[];
  chiudiFesta: () => void;
  annullaAvviso: () => void;
  chiudiAvviso: () => void;
  azzera: () => void;
  ricompensa: Ricompensa | null;
  chiudiRicompensa: () => void;
};

const Ctx = createContext<Contesto | null>(null);

export function useStore(): Contesto {
  const c = useContext(Ctx);
  if (!c) throw new Error("useStore fuori da StoreProvider");
  return c;
}

// Icone: prima erano emoji, ora sono chiavi di icone vere.
const ICONE_VECCHIE: Record<string, string> = { "💪": "dumbbell", "🎯": "target", "🏠": "casa", "🔁": "ripeti" };

// Legge i dati dal telefono e li porta all'ultima forma (aggiunge i campi nuovi senza perdere nulla).
function carica(): Stato {
  try {
    const raw = localStorage.getItem(CHIAVE) ?? localStorage.getItem(CHIAVE_VECCHIA);
    if (raw) {
      const s = JSON.parse(raw) as Partial<Stato> & { versione?: number };
      if (s.versione === 1) {
        const base = statoIniziale();
        // I dati salvati prima di questa versione non hanno i campi nuovi: li aggiungo.
        const task: Task[] = (s.task ?? base.task).map((t) => ({
          ...t,
          soloACasa: (t as Partial<Task>).soloACasa ?? t.areaId === "casa",
          promemoria: (t as Partial<Task>).promemoria ?? [],
          adattaATurni: (t as Partial<Task>).adattaATurni ?? t.tipo === "stanza",
        }));
        // Punti nuovi per le task precaricate (la stanza vale di più), solo se non li hai già cambiati tu.
        const VECCHI_E_NUOVI: Record<string, [number, number]> = { stanza: [15, 50], meditazione: [10, 20], piatti: [15, 20] };
        for (const t of task) {
          const v = VECCHI_E_NUOVI[t.id];
          if (v && t.punti === v[0]) t.punti = v[1];
        }
        if (!task.some((t) => t.id === "stanza")) task.push(taskStanza(oggiLocale()));
        return {
          ...base,
          ...s,
          impostazioni: { ...base.impostazioni, ...s.impostazioni }, // le opzioni nuove prendono il valore predefinito
          aree: (s.aree ?? base.aree).map((a) => ({ ...a, icona: ICONE_VECCHIE[a.icona] ?? a.icona })),
          task,
          stanze: s.stanze ?? base.stanze,
          ignorati: s.ignorati ?? [],
          rinvii: s.rinvii ?? [],
          momenti: s.momenti ?? [],
          vacanza: s.vacanza ?? null,
          eventi: (s.eventi ?? []).map((e) => {
            // Vecchio formato: un solo anticipo (anticipoGiorni). Ora sono più avvisi e lo spostamento.
            const { anticipoGiorni, ...resto } = e as typeof e & { anticipoGiorni?: number };
            return { ...resto, avvisi: e.avvisi ?? (anticipoGiorni ? [anticipoGiorni] : []), spostamentoMin: e.spostamentoMin ?? (e.tipo === "appuntamento" ? 20 : 0) };
          }),
          modifiche: s.modifiche ?? [],
          bonus: s.bonus ?? [],
        } as Stato;
      }
    }
  } catch {
    // dati illeggibili: si riparte da zero
  }
  return statoIniziale();
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [stato, setStato] = useState<Stato>(statoVuoto);
  const [pronto, setPronto] = useState(false);
  const [adesso, setAdesso] = useState(0);
  const [oggi, setOggi] = useState(""); // si imposta nel browser: sul server la data sarebbe quella della build
  const [ricompensa, setRicompensa] = useState<Ricompensa | null>(null);
  const [avviso, setAvviso] = useState<Avviso | null>(null);
  const [festa, setFesta] = useState<Festa[]>([]);
  const ref = useRef(stato); // sempre l'ultimo stato, anche dentro timer e callback

  const aggiorna = useCallback((fn: (s: Stato) => Stato) => {
    const prima = ref.current;
    ref.current = fn(prima);
    if (ref.current.modifiche !== prima.modifiche) impostaModifiche(ref.current.modifiche); // sonno, conflitti e carico leggono il calendario aggiornato
    setStato(ref.current);
  }, []);

  // Carico dal telefono solo dopo l'avvio (sul server non esiste localStorage).
  useEffect(() => {
    ref.current = carica();
    impostaModifiche(ref.current.modifiche);
    setStato(ref.current);
    setOggi(oggiLocale());
    setAdesso(Date.now());
    setPronto(true);
  }, []);

  useEffect(() => {
    if (!pronto) return;
    try {
      localStorage.setItem(CHIAVE, JSON.stringify(stato));
    } catch {
      // memoria piena o bloccata: l'app continua a funzionare
    }
  }, [stato, pronto]);

  // A mezzanotte "oggi" cambia da solo.
  useEffect(() => {
    const id = setInterval(() => {
      setOggi(oggiLocale());
      setAdesso(Date.now());
    }, 30_000);
    return () => clearInterval(id);
  }, []);

  const completa: Contesto["completa"] = useCallback(
    (taskId, { minima, minuti, daTimer }) => {
      const s = ref.current;
      const t = s.task.find((x) => x.id === taskId);
      if (!t) return;
      const data = oggiLocale();
      if (s.completamenti.some((c) => c.taskId === taskId && c.data === data)) return; // una volta al giorno

      // Combo: task fatte di fila oggi, con meno di un'ora tra l'una e l'altra. Dalla terza i punti valgono di più.
      const ts = Date.now();
      const oggiC = s.completamenti.filter((c) => c.data === data).sort((a, b) => a.ts - b.ts);
      let catena = 1;
      let riferimento = ts;
      for (let i = oggiC.length - 1; i >= 0; i--) {
        if (riferimento - oggiC[i].ts > COMBO_PAUSA_MS) break;
        catena++;
        riferimento = oggiC[i].ts;
      }
      const moltiplicatore = catena >= COMBO_MINIMO ? MOLTIPLICATORE_COMBO : 1;
      const punti = Math.round((minima ? puntiMinima(t.punti) : t.punti) * moltiplicatore);
      const bonus = Math.random() < 0.1 ? 5 + Math.floor(Math.random() * 11) : 0; // colpo di fortuna
      const durata = minuti ?? (minima ? t.minimaMin : t.durataMin) ?? 0;
      const stanza = t.tipo === "stanza" ? stanzaDelGiorno(s.stanze, s.completamenti, t.id, data).stanza : null;
      const id = nuovoId();
      const nuova: Completamento = { id, taskId, data, minuti: durata, minima, punti, bonus, combo: catena, ts, ...(stanza ? { nota: stanza } : {}) };
      const completamenti = [...s.completamenti, nuova];
      const dopoS = { ...s, completamenti };

      const feste: Festa[] = [];
      const nuoviBonus: Bonus[] = [];
      if (catena === 3 || catena === 5 || catena === 7) {
        feste.push({ id: nuovoId(), tipo: "combo", titolo: `${catena} Task completate!`, testo: "Stai andando a razzo!", xp: 0 });
      }
      // Record personale di task fatte in un giorno
      const perGiorno = new Map<string, number>();
      for (const c of completamenti) perGiorno.set(c.data, (perGiorno.get(c.data) ?? 0) + 1);
      const oggiN = perGiorno.get(data) ?? 0;
      let maxPrima = 0;
      for (const [d, n] of perGiorno) if (d !== data && n > maxPrima) maxPrima = n;
      if (oggiN >= 3 && maxPrima > 0 && oggiN > maxPrima) {
        feste.push({ id: nuovoId(), tipo: "record", titolo: "NUOVO RECORD", testo: `${oggiN} task in un giorno: mai così tante.`, xp: 0 });
      }
      // Forziere: l'ultima task del giorno lo apre (una volta al giorno), con una ricompensa a sorpresa
      const g = giornata(dopoS, data);
      if (g.previste.length > 0 && g.fatte.length === g.previste.length && !s.bonus.some((b) => b.tipo === "forziere" && b.data === data)) {
        const dentro = dentroForziere(s.aree);
        nuoviBonus.push({ id: nuovoId(), data, xp: dentro.xp, tipo: "forziere", testo: dentro.testo, da: id });
        feste.push({ id: nuovoId(), tipo: "forziere", titolo: "ECCELLENTE!!", testo: dentro.testo, xp: dentro.xp });
      }
      // Boss della settimana: sconfitto quando le task fatte arrivano a quelle previste
      const boss = bossSettimana(dopoS, data);
      if (boss.sconfitto && !s.bonus.some((b) => b.tipo === "boss" && b.data >= inizioSettimana(data))) {
        nuoviBonus.push({ id: nuovoId(), data, xp: 100, tipo: "boss", testo: "Boss della settimana sconfitto", da: id });
        feste.push({ id: nuovoId(), tipo: "boss", titolo: "BOSS SCONFITTO", testo: "Hai fatto tutte le task della settimana. +100 XP", xp: 100 });
      }

      const prima = livello(xpTotali(s.completamenti, s.bonus));
      const dopo = livello(xpTotali(completamenti, [...s.bonus, ...nuoviBonus]));

      aggiorna((x) => ({
        ...x,
        completamenti: [...x.completamenti, nuova],
        bonus: [...x.bonus, ...nuoviBonus],
        timer: x.timer?.taskId === taskId ? null : x.timer,
      }));
      if (feste.length) setFesta((f) => [...f, ...feste]);
      setRicompensa({
        id: nuovoId(),
        completamentoId: id,
        titolo: stanza ? `Sistema ${stanza}` : t.titolo,
        punti,
        bonus,
        frase: s.aree.find((a) => a.id === t.areaId)?.frase ?? "",
        nuovoLivello: dopo.indice > prima.indice ? dopo.nome : null,
        daTimer: !!daTimer,
        moltiplicatore,
      });
    },
    [aggiorna],
  );

  const valore = useMemo<Contesto>(
    () => ({
      pronto,
      stato,
      oggi,
      adesso,
      xp: xpTotali(stato.completamenti, stato.bonus),
      completa,
      annulla: (cid) => {
        // si tolgono anche i bonus (forziere, boss) che quella task aveva fatto scattare
        aggiorna((x) => ({ ...x, completamenti: x.completamenti.filter((c) => c.id !== cid), bonus: x.bonus.filter((b) => b.da !== cid) }));
        setRicompensa(null);
        setFesta([]);
      },
      salvaTask: (t) =>
        aggiorna((x) => ({
          ...x,
          task: x.task.some((y) => y.id === t.id) ? x.task.map((y) => (y.id === t.id ? t : y)) : [...x.task, t],
        })),
      eliminaTask: (id) => aggiorna((x) => ({ ...x, task: x.task.filter((t) => t.id !== id) })),
      impostazioni: (p) => aggiorna((x) => ({ ...x, impostazioni: { ...x.impostazioni, ...p } })),
      setFrase: (areaId, frase) =>
        aggiorna((x) => ({ ...x, aree: x.aree.map((a) => (a.id === areaId ? { ...a, frase } : a)) })),
      apriTimer: (taskId, minima, durataMin) =>
        aggiorna((x) => ({
          ...x,
          timer: { taskId, minima, inizio: null, durataSec: durataMin * 60, pausaInizio: null, pausaTotale: 0 },
        })),
      partiTimer: () =>
        aggiorna((x) => (x.timer && x.timer.inizio === null ? { ...x, timer: { ...x.timer, inizio: Date.now() } } : x)),
      pausaTimer: () =>
        aggiorna((x) => (x.timer && x.timer.inizio !== null && !x.timer.pausaInizio ? { ...x, timer: { ...x.timer, pausaInizio: Date.now() } } : x)),
      riprendiTimer: () =>
        aggiorna((x) =>
          x.timer?.pausaInizio
            ? { ...x, timer: { ...x.timer, pausaTotale: x.timer.pausaTotale + (Date.now() - x.timer.pausaInizio), pausaInizio: null } }
            : x,
        ),
      fermaTimer: () => aggiorna((x) => ({ ...x, timer: null })),
      // Reset: tempo pieno e timer fermo, pronto a ripartire con Start.
      resettaTimer: () =>
        aggiorna((x) => (x.timer ? { ...x, timer: { ...x.timer, inizio: null, pausaInizio: null, pausaTotale: 0 } } : x)),
      ignoraOggi: (taskId) =>
        aggiorna((x) => ({
          ...x,
          ignorati: [...x.ignorati.filter((i) => !(i.taskId === taskId && i.data === oggiLocale())), { taskId, data: oggiLocale() }],
          rinvii: x.rinvii.filter((r) => !(r.taskId === taskId && r.data === oggiLocale())),
        })),
      ripristina: (taskId) =>
        aggiorna((x) => ({ ...x, ignorati: x.ignorati.filter((i) => !(i.taskId === taskId && i.data === oggiLocale())) })),
      rimanda: (taskId, alle) =>
        aggiorna((x) => ({
          ...x,
          rinvii: [...x.rinvii.filter((r) => !(r.taskId === taskId && r.data === oggiLocale())), { taskId, data: oggiLocale(), alle }],
        })),
      annullaRinvio: (taskId) =>
        aggiorna((x) => ({ ...x, rinvii: x.rinvii.filter((r) => !(r.taskId === taskId && r.data === oggiLocale())) })),
      impostaMomento: (taskId, momento) =>
        aggiorna((x) => ({
          ...x,
          momenti: [...x.momenti.filter((m) => !(m.taskId === taskId && m.data === oggiLocale())), ...(momento ? [{ taskId, data: oggiLocale(), ...momento }] : [])],
        })),
      setStanze: (stanze) => aggiorna((x) => ({ ...x, stanze })),
      setVacanza: (vacanza) => aggiorna((x) => ({ ...x, vacanza })),
      salvaEvento: (e) =>
        aggiorna((x) => ({ ...x, eventi: x.eventi.some((y) => y.id === e.id) ? x.eventi.map((y) => (y.id === e.id ? e : y)) : [...x.eventi, e] })),
      eliminaEvento: (id) => aggiorna((x) => ({ ...x, eventi: x.eventi.filter((e) => e.id !== id) })),
      salvaModifiche: (nuove, testo) => {
        const sostituite = ref.current.modifiche.filter((m) => nuove.some((n) => n.data === m.data));
        aggiorna((x) => ({ ...x, modifiche: [...x.modifiche.filter((m) => !nuove.some((n) => n.data === m.data)), ...nuove] }));
        setAvviso({ id: Date.now().toString(36), testo, data: nuove[0]?.data ?? oggiLocale(), rimuovi: nuove.map((n) => n.id), ripristina: sostituite });
      },
      annullaModifiche: (ids) =>
        aggiorna((x) => {
          const gruppi = new Set(x.modifiche.filter((m) => ids.includes(m.id) && m.gruppo).map((m) => m.gruppo));
          return { ...x, modifiche: x.modifiche.filter((m) => !ids.includes(m.id) && !(m.gruppo && gruppi.has(m.gruppo))) };
        }),
      avviso,
      annullaAvviso: () => {
        if (!avviso) return;
        aggiorna((x) => ({ ...x, modifiche: [...x.modifiche.filter((m) => !avviso.rimuovi.includes(m.id)), ...avviso.ripristina] }));
        setAvviso(null);
      },
      chiudiAvviso: () => setAvviso(null),
      festa,
      chiudiFesta: () => setFesta((f) => f.slice(1)),
      segnaEvento: (id, fatto) => aggiorna((x) => ({ ...x, eventi: x.eventi.map((e) => (e.id === id ? { ...e, fatto } : e)) })),
      azzera: () => {
        aggiorna(() => statoIniziale());
        setRicompensa(null);
      },
      ricompensa,
      chiudiRicompensa: () => setRicompensa(null),
    }),
    [stato, pronto, oggi, adesso, ricompensa, avviso, festa, completa, aggiorna],
  );

  return <Ctx.Provider value={valore}>{children}</Ctx.Provider>;
}
