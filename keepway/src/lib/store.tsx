"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { impostaModifiche } from "./calendario";
import { oggiLocale } from "./date";
import { livello, puntiMinima, xpTotali } from "./regole";
import { nuovoId, statoIniziale, statoVuoto, taskStanza } from "./seed";
import { stanzaDelGiorno } from "./stanze";
import type { Evento, Impostazioni, Modifica, Stato, Task, Vacanza } from "./tipi";

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
};

// Avviso con "Annulla" dopo una modifica ai turni.
export type Avviso = { id: string; testo: string; rimuovi: string[]; ripristina: Modifica[] };

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
  setStanze: (stanze: string[]) => void;
  setVacanza: (v: Vacanza | null) => void;
  salvaEvento: (e: Evento) => void;
  eliminaEvento: (id: string) => void;
  segnaEvento: (id: string, fatto: boolean) => void;
  salvaModifiche: (nuove: Modifica[], testo: string) => void;
  annullaModifiche: (ids: string[]) => void; // toglie le modifiche (e le collegate dello stesso gruppo)
  avviso: Avviso | null;
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
          vacanza: s.vacanza ?? null,
          eventi: (s.eventi ?? []).map((e) => {
            // Vecchio formato: un solo anticipo (anticipoGiorni). Ora sono più avvisi e lo spostamento.
            const { anticipoGiorni, ...resto } = e as typeof e & { anticipoGiorni?: number };
            return { ...resto, avvisi: e.avvisi ?? (anticipoGiorni ? [anticipoGiorni] : []), spostamentoMin: e.spostamentoMin ?? (e.tipo === "appuntamento" ? 20 : 0) };
          }),
          modifiche: s.modifiche ?? [],
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

      const punti = minima ? puntiMinima(t.punti) : t.punti;
      const bonus = Math.random() < 0.1 ? 5 + Math.floor(Math.random() * 11) : 0; // colpo di fortuna
      const durata = minuti ?? (minima ? t.minimaMin : t.durataMin) ?? 0;
      const stanza = t.tipo === "stanza" ? stanzaDelGiorno(s.stanze, s.completamenti, t.id, data).stanza : null;
      const id = nuovoId();
      const prima = livello(xpTotali(s.completamenti));
      const dopo = livello(xpTotali(s.completamenti) + punti + bonus);

      aggiorna((x) => ({
        ...x,
        completamenti: [...x.completamenti, { id, taskId, data, minuti: durata, minima, punti, bonus, ts: Date.now(), ...(stanza ? { nota: stanza } : {}) }],
        timer: x.timer?.taskId === taskId ? null : x.timer,
      }));
      setRicompensa({
        id: nuovoId(),
        completamentoId: id,
        titolo: stanza ? `Sistema ${stanza}` : t.titolo,
        punti,
        bonus,
        frase: s.aree.find((a) => a.id === t.areaId)?.frase ?? "",
        nuovoLivello: dopo.indice > prima.indice ? dopo.nome : null,
        daTimer: !!daTimer,
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
      xp: xpTotali(stato.completamenti),
      completa,
      annulla: (cid) => {
        aggiorna((x) => ({ ...x, completamenti: x.completamenti.filter((c) => c.id !== cid) }));
        setRicompensa(null);
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
      setStanze: (stanze) => aggiorna((x) => ({ ...x, stanze })),
      setVacanza: (vacanza) => aggiorna((x) => ({ ...x, vacanza })),
      salvaEvento: (e) =>
        aggiorna((x) => ({ ...x, eventi: x.eventi.some((y) => y.id === e.id) ? x.eventi.map((y) => (y.id === e.id ? e : y)) : [...x.eventi, e] })),
      eliminaEvento: (id) => aggiorna((x) => ({ ...x, eventi: x.eventi.filter((e) => e.id !== id) })),
      salvaModifiche: (nuove, testo) => {
        const sostituite = ref.current.modifiche.filter((m) => nuove.some((n) => n.data === m.data));
        aggiorna((x) => ({ ...x, modifiche: [...x.modifiche.filter((m) => !nuove.some((n) => n.data === m.data)), ...nuove] }));
        setAvviso({ id: Date.now().toString(36), testo, rimuovi: nuove.map((n) => n.id), ripristina: sostituite });
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
      segnaEvento: (id, fatto) => aggiorna((x) => ({ ...x, eventi: x.eventi.map((e) => (e.id === id ? { ...e, fatto } : e)) })),
      azzera: () => {
        aggiorna(() => statoIniziale());
        setRicompensa(null);
      },
      ricompensa,
      chiudiRicompensa: () => setRicompensa(null),
    }),
    [stato, pronto, oggi, adesso, ricompensa, avviso, completa, aggiorna],
  );

  return <Ctx.Provider value={valore}>{children}</Ctx.Provider>;
}
