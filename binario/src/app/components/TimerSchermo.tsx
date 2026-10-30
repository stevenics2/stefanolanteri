"use client";

import { Pause, Play, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { titoloTask } from "@/lib/stanze";
import { useStore } from "@/lib/store";
import AreaIcona from "./AreaIcona";

const R = 120;
const CIRC = 2 * Math.PI * R;

const mmss = (sec: number) => {
  const s = Math.max(0, Math.ceil(sec));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

// Timer a schermo intero. Salva l'ora di inizio e ricalcola sempre da lì:
// funziona anche se l'app va in background o lo schermo si spegne.
export default function TimerSchermo() {
  const { stato, oggi, completa, pausaTimer, riprendiTimer, fermaTimer, resettaTimer } = useStore();
  const timer = stato.timer;
  const task = timer ? stato.task.find((t) => t.id === timer.taskId) : undefined;
  const [ora, setAdesso] = useState(0); // aggiornato dall'intervallo: niente Date.now() all'avvio
  const finito = useRef<number | null>(null);

  useEffect(() => {
    if (!timer) return;
    const id = setInterval(() => setAdesso(Date.now()), 250);
    const rientro = () => setAdesso(Date.now());
    document.addEventListener("visibilitychange", rientro);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", rientro);
    };
  }, [timer]);

  // Tiene lo schermo acceso mentre il timer gira (se il telefono lo permette).
  useEffect(() => {
    if (!timer) return;
    let lock: WakeLockSentinel | null = null;
    navigator.wakeLock?.request("screen").then((l) => (lock = l)).catch(() => {});
    return () => void lock?.release().catch(() => {});
  }, [timer?.inizio]); // eslint-disable-line react-hooks/exhaustive-deps

  const adesso = timer ? Math.max(ora, timer.inizio) : 0; // mai prima dell'inizio
  const trascorsoMs = timer ? (timer.pausaInizio ?? adesso) - timer.inizio - timer.pausaTotale : 0;
  const restanteSec = timer ? timer.durataSec - trascorsoMs / 1000 : 0;

  // Scaduto: segno la task come fatta (si può annullare dalla notifica a schermo).
  useEffect(() => {
    if (!timer || !task || restanteSec > 0 || finito.current === timer.inizio) return;
    finito.current = timer.inizio;
    navigator.vibrate?.([200, 100, 200]);
    completa(task.id, { minima: timer.minima, minuti: Math.round(timer.durataSec / 60), daTimer: true });
  }, [timer, task, restanteSec, completa]);

  if (!timer || !task) return null;

  const area = stato.aree.find((a) => a.id === task.areaId);
  const colore = area?.colore ?? "#f5a524";
  const progresso = Math.min(1, trascorsoMs / 1000 / timer.durataSec);
  const inPausa = timer.pausaInizio !== null;
  const minimoMin = task.minimaMin ?? 0;
  const trascorsiMin = trascorsoMs / 60000;

  // "Termina ora": se ho già fatto almeno la versione minima conta come fatta, altrimenti si annulla.
  const termina = () => {
    if (minimoMin > 0 && trascorsiMin >= minimoMin) completa(task.id, { minima: true, minuti: Math.floor(trascorsiMin), daTimer: true });
    else fermaTimer();
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-between bg-background px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(3rem,env(safe-area-inset-top))]">
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 text-sm text-muted">
          <AreaIcona nome={area?.icona ?? ""} colore={colore} size={14} badge={false} /> {area?.nome}
        </div>
        <h2 className="mt-1 text-2xl font-bold">{titoloTask(task, stato, oggi)}</h2>
        {timer.minima && <div className="mt-1 text-sm text-accent">versione minima</div>}
      </div>

      <div className="relative">
        <svg width="280" height="280" viewBox="0 0 280 280" className="-rotate-90">
          <circle cx="140" cy="140" r={R} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="14" />
          <circle
            cx="140" cy="140" r={R} fill="none" stroke={colore} strokeWidth="14" strokeLinecap="round"
            strokeDasharray={CIRC} strokeDashoffset={CIRC * progresso}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-6xl font-bold tabular-nums">{mmss(restanteSec)}</div>
          {inPausa && <div className="mt-1 text-accent">in pausa</div>}
        </div>
      </div>

      <div className="flex w-full max-w-sm flex-col gap-3">
        <button
          data-suono={inPausa ? "riprendi" : "pausa"}
          onClick={inPausa ? riprendiTimer : pausaTimer}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-accent py-4 text-lg font-bold text-black"
        >
          {inPausa ? <><Play size={20} fill="currentColor" /> Riprendi</> : <><Pause size={20} fill="currentColor" /> Pausa</>}
        </button>
        <button data-suono="indietro" onClick={resettaTimer} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/10 py-3">
          <RotateCcw size={18} /> Ricomincia da capo
        </button>
        <button data-suono={minimoMin > 0 && trascorsiMin >= minimoMin ? "nessuno" : "indietro"} onClick={termina} className="rounded-2xl bg-white/10 py-3">
          {minimoMin > 0 && trascorsiMin >= minimoMin ? "Termina ora (conta come minima)" : "Annulla timer"}
        </button>
      </div>
    </div>
  );
}
