"use client";

import { ArrowRight, TriangleAlert } from "lucide-react";
import { giornoBreve } from "@/lib/cambiPiano";
import { useStore } from "@/lib/store";

// Quando il piano automatico cambia da solo (un turno, un appuntamento nuovo...) lo dice, con il motivo, e chiede conferma:
// «Va bene» tiene il piano nuovo, «Tieni…» riporta la task al giorno di prima (se si può).
export default function CambiPiano() {
  const { stato, confermaCambioPiano, tieniGiornoPiano } = useStore();
  const cambi = (stato.cambiPiano ?? []).filter((c) => stato.task.some((t) => t.id === c.taskId));
  if (cambi.length === 0) return null;
  return (
    <div className="entra space-y-2 rounded-2xl border border-amber-400/50 bg-amber-500/10 p-3">
      <div className="flex items-center gap-2 text-sm font-bold text-amber-200"><TriangleAlert size={16} /> Il piano è cambiato</div>
      {cambi.map((c) => {
        const titolo = stato.task.find((t) => t.id === c.taskId)?.titolo ?? "";
        return (
          <div key={c.id} className="rounded-xl bg-card p-3">
            <div className="flex flex-wrap items-center gap-x-2 text-sm font-semibold">
              <span>{titolo}:</span>
              <span className="capitalize">{giornoBreve(c.da)}</span>
              <ArrowRight size={14} className="text-muted" />
              <span className="capitalize">{c.a ? giornoBreve(c.a) : "tolta"}</span>
            </div>
            <div className="mt-1 text-xs text-muted">{c.motivo}</div>
            <div className="mt-2 flex gap-2">
              <button data-suono="ok" onClick={() => confermaCambioPiano(c.id)} className="flex-1 rounded-xl bg-accent py-2 text-sm font-bold text-black">Va bene</button>
              {c.tieniPossibile && <button data-suono="indietro" onClick={() => tieniGiornoPiano(c.id)} className="flex-1 rounded-xl bg-ov/10 py-2 text-sm font-semibold capitalize">Tieni {giornoBreve(c.da)}</button>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
