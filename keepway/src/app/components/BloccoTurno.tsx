"use client";

import { Briefcase } from "lucide-react";
import { coloreGiorno, riepilogoGiorno } from "@/lib/giornata";

// Il blocco del turno in cima: solo che turno hai e in che orario (o "Riposo"). Uguale in tutte le viste.
// Con uno straordinario: il turno di prima, sotto in viola l'orario aggiunto e la striscia «ORE DI STRAORDINARIO».
export default function BloccoTurno({ data }: { data: string }) {
  const r = riepilogoGiorno(data);
  const colore = coloreGiorno(r);
  const s = r.straordinario;
  if (s) {
    return (
      <div className="overflow-hidden rounded-2xl bg-card">
        <div className="flex items-center gap-2 px-4 py-3" style={{ borderLeft: "4px solid #3b82f6" }}>
          <Briefcase size={17} className="opacity-70" />
          <span className="text-base font-bold">{s.etichettaOriginale === "R" ? "Riposo" : `Turno ${s.etichettaOriginale}`}</span>
          {s.orarioOriginale && <span className="text-sm font-semibold text-muted">{s.orarioOriginale}</span>}
        </div>
        <div className="bg-violet-500 px-4 py-2 text-base font-bold text-white">{s.orarioExtra}</div>
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
