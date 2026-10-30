"use client";

import { useEffect, useState } from "react";
import { consiglioSonno, type ConsiglioSonno } from "@/lib/sonno";

// "Stasera vai a dormire alle..." in base al turno di domani.
export default function SonnoCard() {
  const [c, setC] = useState<ConsiglioSonno | null | undefined>(undefined);

  // Si calcola nel browser: serve la data locale di oggi.
  useEffect(() => {
    const n = new Date();
    const p = (x: number) => String(x).padStart(2, "0");
    setC(consiglioSonno(`${n.getFullYear()}-${p(n.getMonth() + 1)}-${p(n.getDate())}`));
  }, []);

  if (!c) return null;

  if (c.tipo === "libero") {
    return (
      <div className="rounded-2xl bg-card p-4">
        <div className="text-sm text-muted">😴 Sonno</div>
        <p className="mt-1">Domani è un giorno di riposo: nessun orario obbligato, ma resta regolare.</p>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl p-4 ${c.ok ? "bg-card" : "bg-amber-500/15 border border-amber-500/50"}`}>
      <div className="text-sm text-muted">😴 Sonno · domani turno {c.turnoDomani}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-4xl font-bold text-accent">{c.aLetto}</span>
        <span className="text-muted">
          {c.aLettoGiorno === "domani" ? "(dopo mezzanotte)" : "a letto entro"}
        </span>
      </div>
      <p className="mt-2 text-sm text-muted">{c.messaggio}</p>
    </div>
  );
}
