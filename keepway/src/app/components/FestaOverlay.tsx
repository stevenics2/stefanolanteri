"use client";

import { Gift, PackageOpen, Swords, Trophy, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { coriandoli, monete, suono } from "@/lib/effetti";
import { useStore } from "@/lib/store";

export const EVENTO_FIAMMATA = "keepway-fiammata";
const ATTESA_ANELLI_MS = 1500; // il tempo dell'animazione degli anelli, che parte per prima
const ICONE = { forziere: Gift, record: Trophy, boss: Swords, combo: Zap } as const;
const COLORI = { forziere: "#fcd34d", record: "#fcd34d", boss: "#fca5a5", combo: "#7dd3fc" } as const;

// I momenti "da festa": combo, record, forziere, boss. Un popup al centro, uno alla volta; si chiude da solo o con un tocco.
export default function FestaOverlay() {
  const { festa, chiudiFesta, stato } = useStore();
  const f = festa[0];
  const [apertoId, setApertoId] = useState<string | null>(null);
  const [visibileId, setVisibileId] = useState<string | null>(null);
  const { suoni, animazioni } = stato.impostazioni;

  const id = f?.id;
  const tipo = f?.tipo;
  useEffect(() => {
    if (!id || !tipo) return;
    // prima gli anelli (tremito e scintille), poi il popup; il forziere prima trema (chiuso), poi si apre
    const attesa = tipo === "forziere" ? 900 : 150;
    const t0 = setTimeout(() => setVisibileId(id), ATTESA_ANELLI_MS);
    const t1 = setTimeout(() => {
      setApertoId(id);
      if (suoni) suono(tipo === "combo" || tipo === "boss" ? "vittoria" : "livello");
      if (animazioni) void (tipo === "forziere" ? monete() : tipo === "combo" ? Promise.resolve() : coriandoli(true));
    }, ATTESA_ANELLI_MS + attesa);
    const t2 = setTimeout(() => {
      // a fine popup della combo: una fiammata su tutto il riquadro di avanzamento
      if (tipo === "combo" && animazioni) window.dispatchEvent(new Event(EVENTO_FIAMMATA));
      chiudiFesta();
    }, ATTESA_ANELLI_MS + attesa + 3600);
    return () => {
      clearTimeout(t0);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [id, tipo, suoni, animazioni, chiudiFesta]);

  if (!f || visibileId !== f.id) return null;
  const aperto = apertoId === f.id;
  const Icona = f.tipo === "forziere" && aperto ? PackageOpen : ICONE[f.tipo];
  const colore = COLORI[f.tipo];
  return (
    <div onClick={chiudiFesta} className="fixed inset-0 z-[60] flex items-center justify-center bg-black/65 px-6 backdrop-blur-sm">
      <div className="pop w-full max-w-xs rounded-3xl border bg-card p-6 text-center" style={{ borderColor: colore, boxShadow: `0 0 60px -8px ${colore}` }}>
        <Icona size={64} strokeWidth={1.6} className={`mx-auto ${f.tipo === "forziere" && !aperto ? "scuoti" : ""}`} style={{ color: colore }} />
        <div className="mt-3 text-2xl font-black tracking-wide" style={{ color: colore }}>
          {f.tipo === "forziere" && !aperto ? "COMPLETATO!" : f.titolo}
        </div>
        {(f.tipo !== "forziere" || aperto) && (
          <>
            <p className="mt-2 text-sm">{f.testo}</p>
            {f.xp > 0 && <div className="mt-3 text-4xl font-black text-accent">+{f.xp} XP</div>}
          </>
        )}
      </div>
    </div>
  );
}
