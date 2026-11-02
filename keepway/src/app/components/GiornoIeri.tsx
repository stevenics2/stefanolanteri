"use client";

import { Check, Undo2 } from "lucide-react";
import { èIgnorata, èPrevista } from "@/lib/regole";
import { titoloTask } from "@/lib/stanze";
import { useStore } from "@/lib/store";
import AreaIcona, { iconaTask } from "./AreaIcona";
import BloccoTurno from "./BloccoTurno";

// Ieri si può ancora riprendere: le task previste si segnano (o si tolgono) qui, e contano per ieri. Gli altri giorni restano solo da guardare.
export default function GiornoIeri({ data }: { data: string }) {
  const { stato, completa, annulla } = useStore();
  const previste = stato.task.filter((t) => èPrevista(t, data, { vacanza: stato.vacanza }) && !èIgnorata(stato.ignorati, t.id, data));
  const riga = (t: (typeof previste)[number]) => {
    const fatto = stato.completamenti.find((c) => c.taskId === t.id && c.data === data);
    const area = stato.aree.find((a) => a.id === t.areaId);
    const colore = area?.colore ?? "#888";
    return (
      <div key={t.id} className={`flex items-center gap-3 rounded-2xl bg-card px-3 py-2.5 ${fatto ? "opacity-70" : ""}`} style={{ borderLeft: `4px solid ${colore}` }}>
        <AreaIcona nome={iconaTask(t, area?.icona ?? "")} colore={colore} />
        <span className="min-w-0 flex-1 font-semibold leading-tight"><span className={`barrato ${fatto ? "fatto" : ""}`}>{titoloTask(t, stato, data)}</span></span>
        {fatto ? (
          <button data-suono="indietro" onClick={() => annulla(fatto.id)} className="inline-flex shrink-0 items-center gap-1 text-xs text-muted">
            <Undo2 size={13} /> Annulla
          </button>
        ) : (
          <button data-suono="via" onClick={() => completa(t.id, { minima: false, data })} className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1.5 text-xs font-bold text-emerald-300">
            <Check size={14} /> Fatto
          </button>
        )}
      </div>
    );
  };
  return (
    <div className="space-y-3">
      <BloccoTurno data={data} />
      <p className="text-xs text-muted">Ieri: puoi ancora segnare le task, contano per ieri.</p>
      <div className="space-y-2">
        {previste.length === 0 && <p className="text-sm text-muted">Niente di previsto per ieri.</p>}
        {previste.map(riga)}
      </div>
    </div>
  );
}
