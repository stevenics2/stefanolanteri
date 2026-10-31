"use client";

import { Clock } from "lucide-react";
import { eventiDelGiorno } from "@/lib/eventi";
import { momentoGiusto } from "@/lib/momento";
import { èPrevista } from "@/lib/regole";
import { hhmm } from "@/lib/sonno";
import { titoloTask } from "@/lib/stanze";
import { useStore } from "@/lib/store";
import AreaIcona, { iconaTask } from "./AreaIcona";
import GiornataInBreve from "./GiornataInBreve";

// Un giorno che non è oggi: il riassunto e cosa è previsto. Solo da guardare (le task si spuntano il giorno stesso).
export default function GiornoSeguente({ data, onApri }: { data: string; onApri?: (e: import("@/lib/tipi").Evento) => void }) {
  const { stato, oggi } = useStore();
  const task = stato.task.filter((t) => èPrevista(t, data, { vacanza: stato.vacanza }));
  const eventi = eventiDelGiorno(stato.eventi, data, oggi).filter((e) => e.data === data);
  const righe = [
    ...task.map((t) => {
      const m = momentoGiusto(t, data);
      const area = stato.aree.find((a) => a.id === t.areaId);
      return { id: t.id, t: m?.da ?? 9999, orario: m ? `${hhmm(m.da)}–${hhmm(m.a)}` : "", titolo: titoloTask(t, stato, data), icona: iconaTask(t, area?.icona ?? ""), colore: area?.colore ?? "#888", evento: null as null | import("@/lib/tipi").Evento };
    }),
    ...eventi.map((e) => ({ id: e.id, t: e.ora ? Number(e.ora.slice(0, 2)) * 60 + Number(e.ora.slice(3)) : -1, orario: e.ora ?? "tutto il giorno", titolo: e.titolo, icona: e.icona, colore: "#38bdf8", evento: e })),
  ].sort((a, b) => a.t - b.t);

  return (
    <div className="space-y-3">
      <GiornataInBreve data={data} nTask={task.length} nImpegni={eventi.length} />
      <div className="space-y-2">
        {righe.length === 0 && <p className="text-sm text-muted">Niente di previsto per questo giorno.</p>}
        {righe.map((r) => (
          <button
            key={r.id}
            disabled={!r.evento || !onApri}
            onClick={() => r.evento && onApri?.(r.evento)}
            className="flex w-full items-center gap-3 rounded-2xl bg-card px-3 py-2.5 text-left"
            style={{ borderLeft: `4px solid ${r.colore}` }}
          >
            <AreaIcona nome={r.icona} colore={r.colore} />
            <span className="min-w-0 flex-1">
              <span className="block font-semibold leading-tight">{r.titolo}</span>
              {r.orario && (
                <span className="mt-0.5 inline-flex items-center gap-1 text-xs font-semibold text-emerald-300">
                  <Clock size={11} /> {r.orario}
                </span>
              )}
            </span>
          </button>
        ))}
      </div>
      <p className="text-xs text-muted">Giorno futuro: qui lo guardi, le task le spunti il giorno stesso.</p>
    </div>
  );
}
