"use client";

import { AlertTriangle } from "lucide-react";
import { useState } from "react";
import { formatoGiornoMese, violazioniDa } from "@/lib/calendario";
import { useStore } from "@/lib/store";
import MenuTurno from "../turni/MenuTurno";

// Il promemoria rosso: due turni troppo vicini (meno di 12 ore) o un doppio turno non consentito. Resta finché non lo sistemi.
export default function TurniDaSistemare({ className = "" }: { className?: string }) {
  const { pronto, oggi } = useStore();
  const [apri, setApri] = useState<string | null>(null);
  if (!pronto) return null;
  const lista = violazioniDa(oggi).slice(0, 4);
  if (lista.length === 0) return null;

  return (
    <div className={`space-y-3 rounded-2xl border border-red-500/50 bg-red-500/10 p-4 ${className}`}>
      <div className="flex items-center gap-2 font-bold text-red-200">
        <AlertTriangle size={20} /> Attenzione: Conflitto turni
      </div>
      {lista.map((v, i) => {
        const date = [...new Set([v.primo.data, v.secondo.data])].filter((d) => d >= oggi);
        return (
          <div key={i} className="space-y-2">
            <p className="text-sm">{v.testo}</p>
            <div className="flex flex-wrap gap-2">
              {date.map((d) => (
                <button key={d} data-suono="via" onClick={() => setApri(d)} className="rounded-lg bg-accent px-3 py-1.5 text-sm font-bold text-black">
                  Modifica il {formatoGiornoMese(d)}
                </button>
              ))}
            </div>
          </div>
        );
      })}
      {apri && <MenuTurno key={apri} data={apri} onClose={() => setApri(null)} />}
    </div>
  );
}
