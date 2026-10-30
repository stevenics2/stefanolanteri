"use client";

import { useEffect, useState } from "react";
import { consiglioSonno, type ConsiglioSonno } from "@/lib/sonno";

// Prossimo sonno consigliato, in base ai turni (dopo la notte, riposino prima della notte, notte normale).
export default function SonnoCard() {
  // undefined = non ancora calcolato (serve l'ora locale del telefono), null = nessun vincolo
  const [c, setC] = useState<ConsiglioSonno | null | undefined>(undefined);

  useEffect(() => {
    setC(consiglioSonno(new Date()));
  }, []);

  if (c === undefined) return null;

  if (c === null) {
    return (
      <div className="rounded-2xl bg-card p-4">
        <div className="text-sm text-muted">😴 Sonno</div>
        <p className="mt-1">Nelle prossime 24 ore nessun turno ti vincola: dormi regolare.</p>
      </div>
    );
  }

  // Riposino e dopo-notte sono corti per forza: non sono un allarme, quindi tono normale.
  const allarme = c.sonno.corto && c.sonno.tipo === "notte";
  return (
    <div className={`rounded-2xl p-4 ${allarme ? "bg-amber-500/15 border border-amber-500/50" : "bg-card"}`}>
      <div className="text-sm text-muted">😴 {c.titolo}</div>
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
