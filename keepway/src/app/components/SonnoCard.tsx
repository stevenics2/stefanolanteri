"use client";

import { BedDouble } from "lucide-react";
import { useMemo } from "react";
import { consiglioSonno } from "@/lib/sonno";
import { useStore } from "@/lib/store";

// Prossimo sonno consigliato, in base ai turni (dopo la notte, riposino prima della notte, notte normale).
export default function SonnoCard() {
  const { pronto, oggi } = useStore();
  // Si ricalcola quando cambia il giorno o i dati sono pronti (serve l'ora locale del telefono).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const c = useMemo(() => (pronto ? consiglioSonno(new Date()) : undefined), [pronto, oggi]);

  if (c === undefined) return null;

  if (c === null) {
    return (
      <div className="rounded-2xl bg-card p-4">
        <div className="flex items-center gap-2 text-sm text-muted"><BedDouble size={16} /> Sonno</div>
        <p className="mt-1">Nelle prossime 24 ore nessun turno ti vincola: dormi regolare.</p>
      </div>
    );
  }

  // Riposino e dopo-notte sono corti per forza: non sono un allarme, quindi tono normale.
  const allarme = c.sonno.corto && c.sonno.tipo === "notte";
  return (
    <div className={`rounded-2xl p-4 ${allarme ? "bg-amber-500/15 border border-amber-500/50" : "bg-card"}`}>
      <div className="flex items-center gap-2 text-sm text-muted"><BedDouble size={16} /> {c.titolo}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-4xl font-bold text-accent">{c.aLetto}</span>
        <span className="text-muted">
          {c.quando} → sveglia {c.sveglia}
        </span>
      </div>
      <p className="mt-2 text-sm text-muted">{c.messaggio}</p>
    </div>
  );
}
