"use client";

import { useStore } from "@/lib/store";
import { èAperto } from "@/lib/terminal";
import { useTerminal } from "@/lib/useTerminal";

const VERDE = "#22c55e";
const ROSSO = "#ef4444";
const GRIGIO = "#94a3b8";

// I due semafori del terminal («Empty» e «Full yard»), a destra del turno: pulsano piano. Sotto, a parole: operativo o sospeso.
export default function SemaforiTerminal() {
  const { stato: t, aggiorna, aggiornando } = useTerminal();
  const { adesso } = useStore();
  const empty = t ? (èAperto(t.empty) ? VERDE : ROSSO) : GRIGIO;
  const full = t ? (èAperto(t.full) ? VERDE : ROSSO) : GRIGIO;
  const tutti = t && èAperto(t.empty) && èAperto(t.full);
  const nessuno = t && !èAperto(t.empty) && !èAperto(t.full);
  const testo = !t ? "Stato non disponibile" : tutti ? "Terminal operativo" : nessuno ? "Operazioni sospese" : "Operativo in parte";
  const colore = !t ? GRIGIO : tutti ? VERDE : nessuno ? ROSSO : "#facc15";
  // se il dato è vecchio (il server non riesce a leggere il sito) lo si dice, invece di far credere che sia aggiornato
  const vecchio = !!t && (t.fallito !== null || (adesso > 0 && adesso - t.controllato > 20 * 60_000));
  const ora = t ? new Date(t.controllato).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }) : "";

  return (
    <button
      type="button"
      onClick={aggiorna}
      aria-busy={aggiornando}
      className="flex w-[7.2rem] shrink-0 flex-col items-center justify-center rounded-2xl bg-card px-2 py-2 text-center active:scale-[0.97]"
      aria-label={`Terminal: ${aggiornando ? "aggiorno" : testo}. Tocca per aggiornare`}
      title={t ? `Controllato alle ${ora}` : undefined}
    >
      <div className="flex items-start justify-center gap-3">
        <Luce colore={empty} etichetta="Empty" sfasamento={0} />
        <Luce colore={full} etichetta="Full" sfasamento={-1.6} />
      </div>
      <div className={`mt-1.5 text-[10px] font-bold leading-tight ${aggiornando ? "animate-pulse" : ""}`} style={{ color: aggiornando ? GRIGIO : colore }}>{aggiornando ? "Aggiorno..." : testo}</div>
      {vecchio && !aggiornando && <div className="text-[9px] text-muted">dato delle {ora}</div>}
    </button>
  );
}

function Luce({ colore, etichetta, sfasamento }: { colore: string; etichetta: string; sfasamento: number }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="terminal-luce block h-4 w-4 rounded-full" style={{ "--luce": colore, background: colore, animationDelay: `${sfasamento}s` } as React.CSSProperties} />
      <span className="text-[8px] uppercase tracking-wide text-muted">{etichetta}</span>
    </div>
  );
}
