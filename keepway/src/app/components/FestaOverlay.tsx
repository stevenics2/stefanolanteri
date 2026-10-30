"use client";

import { Gift, PackageOpen, Swords, Trophy, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { coriandoli, monete, suono } from "@/lib/effetti";
import { useStore } from "@/lib/store";

const ICONE = { forziere: Gift, record: Trophy, boss: Swords, combo: Zap } as const;
const COLORI = { forziere: "#fcd34d", record: "#fcd34d", boss: "#fca5a5", combo: "#7dd3fc" } as const;

// I momenti "da festa": combo, record, forziere, boss. Un popup al centro, uno alla volta; si chiude da solo o con un tocco.
export default function FestaOverlay() {
  const { festa, chiudiFesta, stato } = useStore();
  const f = festa[0];
  const [apertoId, setApertoId] = useState<string | null>(null);
  const { suoni, animazioni } = stato.impostazioni;

  const id = f?.id;
  const tipo = f?.tipo;
  useEffect(() => {
    if (!id || !tipo) return;
    // il forziere prima trema (chiuso), poi si apre; gli altri partono subito
    const attesa = tipo === "forziere" ? 900 : 150;
    const t1 = setTimeout(() => {
      setApertoId(id);
      if (suoni) suono(tipo === "combo" ? "via" : tipo === "boss" ? "vittoria" : "livello");
      if (animazioni) void (tipo === "forziere" ? monete() : tipo === "combo" ? Promise.resolve() : coriandoli(true));
    }, attesa);
    const t2 = setTimeout(chiudiFesta, attesa + 3600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [id, tipo, suoni, animazioni, chiudiFesta]);

  if (!f) return null;
  const aperto = apertoId === f.id;
  const Icona = f.tipo === "forziere" && aperto ? PackageOpen : ICONE[f.tipo];
  const colore = COLORI[f.tipo];
  return (
    <div onClick={chiudiFesta} className="fixed inset-0 z-[60] flex items-center justify-center bg-black/65 px-6 backdrop-blur-sm">
      <div className="pop w-full max-w-xs rounded-3xl border bg-card p-6 text-center" style={{ borderColor: colore, boxShadow: `0 0 60px -8px ${colore}` }}>
        <Icona size={64} strokeWidth={1.6} className={`mx-auto ${f.tipo === "forziere" && !aperto ? "scuoti" : ""}`} style={{ color: colore }} />
        <div className="mt-3 text-2xl font-black tracking-wide" style={{ color: colore }}>
          {f.tipo === "forziere" && !aperto ? "FORZIERE!" : f.titolo}
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
