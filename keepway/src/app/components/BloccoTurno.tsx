"use client";

import { Briefcase } from "lucide-react";
import { coloreGiorno, riepilogoGiorno } from "@/lib/giornata";

// Il blocco del turno in cima: solo che turno hai e in che orario (o "Riposo"). Uguale in tutte le viste.
export default function BloccoTurno({ data }: { data: string }) {
  const r = riepilogoGiorno(data);
  const colore = coloreGiorno(r);
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-card px-4 py-3" style={{ borderLeft: `4px solid ${colore}` }}>
      <Briefcase size={17} className="opacity-70" />
      <span className="text-base font-bold">{r.etichetta}</span>
      {r.orario && <span className="text-sm font-semibold text-muted">{r.orario}</span>}
    </div>
  );
}
