"use client";

import { Briefcase } from "lucide-react";
import { coloreGiorno, riepilogoGiorno } from "@/lib/giornata";

// Il blocco del turno in cima: solo che turno hai e in che orario (o "Riposo"). Uguale in tutte le viste.
// Con uno straordinario: gli orari uno sotto l'altro, in ordine, e sotto la striscia viola «ORE DI STRAORDINARIO».
export default function BloccoTurno({ data }: { data: string }) {
  const r = riepilogoGiorno(data);
  const colore = coloreGiorno(r);
  const s = r.straordinario;
  if (s) {
    return (
      <div className="overflow-hidden rounded-2xl bg-card">
        <div className="px-4 py-3" style={{ borderLeft: `4px solid ${colore}` }}>
          <div className="flex items-center gap-2">
            <Briefcase size={17} className="opacity-70" />
            <span className="text-base font-bold">{r.etichetta}</span>
          </div>
          {s.orari.map((o) => <div key={o} className="ml-[25px] text-sm font-semibold text-muted">{o}</div>)}
        </div>
        <div className="bg-violet-600 px-4 py-1.5 text-center text-[11px] font-extrabold uppercase tracking-wide text-white">Ore di straordinario</div>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-card px-4 py-3" style={{ borderLeft: `4px solid ${colore}` }}>
      <Briefcase size={17} className="opacity-70" />
      <span className="text-base font-bold">{r.etichetta}</span>
      {r.orario && <span className="text-sm font-semibold text-muted">{r.orario}</span>}
    </div>
  );
}
