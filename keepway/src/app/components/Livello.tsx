"use client";

import { useStore } from "@/lib/store";
import { livello } from "@/lib/regole";

// Livello attuale e barra verso il prossimo.
export default function Livello() {
  const { xp } = useStore();
  const l = livello(xp);
  return (
    <div className="rounded-2xl bg-card p-4">
      <div className="flex items-baseline justify-between">
        <div>
          <span className="text-xs text-muted">Livello {l.numero}</span>
          <div className="text-xl font-bold">{l.nome}</div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-accent">{xp}</div>
          <div className="text-xs text-muted">XP</div>
        </div>
      </div>
      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-ov/10">
        <div className="h-full rounded-full bg-accent transition-all duration-700" style={{ width: `${Math.round(l.progresso * 100)}%` }} />
      </div>
      <div className="mt-1.5 text-xs text-muted">
        {l.prossimo ? `Ancora ${l.mancano} XP per «${l.prossimo.nome}»` : "Livello massimo raggiunto"}
      </div>
    </div>
  );
}
