"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { oggiLocale } from "./date";
import { livello, puntiMinima, xpTotali } from "./regole";
import { nuovoId, statoIniziale, statoVuoto } from "./seed";
import type { Impostazioni, Stato, Task } from "./tipi";

const CHIAVE = "binario.v1";

export type Ricompensa = {
  id: string;
  completamentoId: string;
  titolo: string;
  punti: number;
  bonus: number;
  frase: string;
  nuovoLivello: string | null;
};

type Contesto = {
  pronto: boolean;
  stato: Stato;
  oggi: string;
  xp: number;
  completa: (taskId: string, opzioni: { minima: boolean; minuti?: number }) => void;
  annulla: (completamentoId: string) => void;
  salvaTask: (t: Task) => void;
  eliminaTask: (id: string) => void;
  impostazioni: (p: Partial<Impostazioni>) => void;
  setFrase: (areaId: string, frase: string) => void;
  avviaTimer: (taskId: string, minima: boolean, durataMin: number) => void;
  pausaTimer: () => void;
  riprendiTimer: () => void;
  fermaTimer: () => void;
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

function carica(): Stato {
  try {
    const raw = localStorage.getItem(CHIAVE);
    if (raw) {
      const s = JSON.parse(raw) as Stato;
      if (s.versione === 1) return s;
    }
  } catch {
    // dati illeggibili: si riparte da zero
  }
  return statoIniziale();
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [stato, setStato] = useState<Stato>(statoVuoto);
  const [pronto, setPronto] = useState(false);
  const [oggi, setOggi] = useState(""); // si imposta nel browser: sul server la data sarebbe quella della build
  const [ricompensa, setRicompensa] = useState<Ricompensa | null>(null);
  const ref = useRef(stato); // sempre l'ultimo stato, anche dentro timer e callback

  const aggiorna = useCallback((fn: (s: Stato) => Stato) => {
    ref.current = fn(ref.current);
    setStato(ref.current);
  }, []);

  // Carico dal telefono solo dopo l'avvio (sul server non esiste localStorage).
  useEffect(() => {
    ref.current = carica();
    setStato(ref.current);
    setOggi(oggiLocale());
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
    const id = setInterval(() => setOggi(oggiLocale()), 30_000);
    return () => clearInterval(id);
  }, []);

  const completa: Contesto["completa"] = useCallback(
    (taskId, { minima, minuti }) => {
      const s = ref.current;
      const t = s.task.find((x) => x.id === taskId);
      if (!t) return;
      const data = oggiLocale();
      if (s.completamenti.some((c) => c.taskId === taskId && c.data === data)) return; // una volta al giorno

      const punti = minima ? puntiMinima(t.punti) : t.punti;
      const bonus = Math.random() < 0.1 ? 5 + Math.floor(Math.random() * 11) : 0; // colpo di fortuna
      const durata = minuti ?? (minima ? t.minimaMin : t.durataMin) ?? 0;
      const id = nuovoId();
      const prima = livello(xpTotali(s.completamenti));
      const dopo = livello(xpTotali(s.completamenti) + punti + bonus);

      aggiorna((x) => ({
        ...x,
        completamenti: [...x.completamenti, { id, taskId, data, minuti: durata, minima, punti, bonus, ts: Date.now() }],
        timer: x.timer?.taskId === taskId ? null : x.timer,
      }));
      setRicompensa({
        id: nuovoId(),
        completamentoId: id,
        titolo: t.titolo,
        punti,
        bonus,
        frase: s.aree.find((a) => a.id === t.areaId)?.frase ?? "",
        nuovoLivello: dopo.indice > prima.indice ? dopo.nome : null,
      });
    },
    [aggiorna],
  );

  const valore = useMemo<Contesto>(
    () => ({
      pronto,
      stato,
      oggi,
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
      avviaTimer: (taskId, minima, durataMin) =>
        aggiorna((x) => ({
          ...x,
          timer: { taskId, minima, inizio: Date.now(), durataSec: durataMin * 60, pausaInizio: null, pausaTotale: 0 },
        })),
      pausaTimer: () =>
        aggiorna((x) => (x.timer && !x.timer.pausaInizio ? { ...x, timer: { ...x.timer, pausaInizio: Date.now() } } : x)),
      riprendiTimer: () =>
        aggiorna((x) =>
          x.timer?.pausaInizio
            ? { ...x, timer: { ...x.timer, pausaTotale: x.timer.pausaTotale + (Date.now() - x.timer.pausaInizio), pausaInizio: null } }
            : x,
        ),
      fermaTimer: () => aggiorna((x) => ({ ...x, timer: null })),
      azzera: () => {
        aggiorna(() => statoIniziale());
        setRicompensa(null);
      },
      ricompensa,
      chiudiRicompensa: () => setRicompensa(null),
    }),
    [stato, pronto, oggi, ricompensa, completa, aggiorna],
  );

  return <Ctx.Provider value={valore}>{children}</Ctx.Provider>;
}
