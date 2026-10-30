"use client";

import { serie } from "@/lib/regole";
import { useStore } from "@/lib/store";
import type { Task } from "@/lib/tipi";

// Una task nella schermata Oggi: avvia il timer, segna come fatta, oppure fa la versione minima.
export default function TaskCard({ task, soloMinima }: { task: Task; soloMinima: boolean }) {
  const { stato, oggi, completa, annulla, avviaTimer } = useStore();
  const area = stato.aree.find((a) => a.id === task.areaId);
  const fatto = stato.completamenti.find((c) => c.taskId === task.id && c.data === oggi);
  const giorni = serie(task, stato.completamenti, oggi);
  const colore = area?.colore ?? "#888";
  const minima = task.minimaMin;

  return (
    <div
      className={`rounded-2xl bg-card p-4 ${fatto ? "opacity-60" : ""}`}
      style={{ borderLeft: `4px solid ${colore}` }}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className={`font-semibold ${fatto ? "line-through" : ""}`}>{task.titolo}</div>
          <div className="mt-0.5 text-xs text-muted">
            {area?.icona} {area?.nome}
            {task.durataMin ? ` · ${task.durataMin} min` : ""}
            {minima ? ` (minima ${minima})` : ""}
          </div>
        </div>
        {giorni > 0 && <div className="shrink-0 text-sm font-semibold text-accent">🔥 {giorni}</div>}
      </div>

      {fatto ? (
        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="text-emerald-400">
            ✓ Fatta{fatto.minima ? " (versione minima)" : ""} · +{fatto.punti + fatto.bonus} XP
          </span>
          <button onClick={() => annulla(fatto.id)} className="text-muted underline">
            Annulla
          </button>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {task.durataMin && !soloMinima && (
            <button
              onClick={() => avviaTimer(task.id, false, task.durataMin!)}
              className="rounded-xl bg-accent px-4 py-2 text-sm font-bold text-black"
            >
              ▶ Avvia
            </button>
          )}
          {soloMinima && minima && (
            <button
              onClick={() => avviaTimer(task.id, true, minima)}
              className="rounded-xl bg-accent px-4 py-2 text-sm font-bold text-black"
            >
              ▶ Avvia ({minima} min)
            </button>
          )}
          <button
            onClick={() => completa(task.id, { minima: soloMinima && !!minima })}
            className="rounded-xl bg-white/10 px-4 py-2 text-sm"
          >
            ✓ Fatta
          </button>
          {minima && !soloMinima && (
            <button onClick={() => completa(task.id, { minima: true })} className="rounded-xl bg-white/10 px-4 py-2 text-sm">
              Minima ({minima}′)
            </button>
          )}
        </div>
      )}
    </div>
  );
}
