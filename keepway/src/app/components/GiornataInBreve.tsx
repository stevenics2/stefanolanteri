"use client";

import { BedDouble, Briefcase, ChevronDown, Clock3, Sunrise } from "lucide-react";
import { coloreGiorno, oreMin, riepilogoGiorno } from "@/lib/giornata";

// "Giornata in breve": l'essenziale di un giorno in una scheda. Per oggi mostra anche cosa viene dopo e il tasto Espandi.
export default function GiornataInBreve({
  data, nTask, nImpegni, prossimo, espansa, onEspandi,
}: { data: string; nTask: number; nImpegni: number; prossimo?: string | null; espansa?: boolean; onEspandi?: () => void }) {
  const r = riepilogoGiorno(data);
  const colore = coloreGiorno(r);
  return (
    <div className="space-y-3 rounded-2xl bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2 text-base font-bold">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: colore }} />
          <Briefcase size={16} className="opacity-70" /> {r.etichetta}
          {r.orario && <span className="text-sm font-semibold text-muted">{r.orario}</span>}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-white/5 px-2 py-2">
          <Sunrise size={15} className="mx-auto mb-0.5 text-amber-300" />
          <div className="text-sm font-bold tabular-nums">{r.sveglia ?? "–"}</div>
          <div className="text-[10px] uppercase tracking-wide text-muted">Sveglia</div>
        </div>
        <div className="rounded-xl bg-white/5 px-2 py-2">
          <BedDouble size={15} className="mx-auto mb-0.5 text-indigo-300" />
          <div className="text-sm font-bold tabular-nums">{r.aLetto ?? "–"}</div>
          <div className="text-[10px] uppercase tracking-wide text-muted">A letto</div>
        </div>
        <div className="rounded-xl bg-white/5 px-2 py-2">
          <Clock3 size={15} className="mx-auto mb-0.5 text-emerald-300" />
          <div className="text-sm font-bold tabular-nums">{r.liberoMin > 0 ? oreMin(r.liberoMin) : "–"}</div>
          <div className="text-[10px] uppercase tracking-wide text-muted">Libero</div>
        </div>
      </div>

      <div className="text-sm text-muted">
        {nTask} {nTask === 1 ? "task" : "task"} · {nImpegni} {nImpegni === 1 ? "impegno" : "impegni"}
      </div>

      {prossimo && (
        <div className="rounded-xl bg-accent/15 px-3 py-2 text-sm font-semibold text-accent">
          Dopo: <span className="text-white">{prossimo}</span>
        </div>
      )}

      {onEspandi && (
        <button data-suono="via" onClick={onEspandi} className="inline-flex items-center gap-1 text-sm font-semibold text-muted">
          {espansa ? "Comprimi" : "Espandi"} <ChevronDown size={15} className={espansa ? "rotate-180" : ""} />
        </button>
      )}
    </div>
  );
}
