"use client";

import { Clover } from "lucide-react";
import { useEffect } from "react";
import { coriandoli, suono } from "@/lib/effetti";
import { useStore } from "@/lib/store";

// Effetto di completamento: coriandoli, suono, punti che saltano fuori e frase identitaria.
export default function Ricompense() {
  const { ricompensa: r, chiudiRicompensa, annulla, stato } = useStore();
  const { suoni, animazioni } = stato.impostazioni;

  useEffect(() => {
    if (!r) return;
    if (animazioni) void coriandoli(!!r.nuovoLivello);
    if (suoni) suono(r.nuovoLivello ? "livello" : r.daTimer ? "vittoria" : "ok");
    const id = setTimeout(chiudiRicompensa, r.nuovoLivello ? 5000 : 4000);
    return () => clearTimeout(id);
    // Parte una volta sola per ricompensa
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r?.id]);

  if (!r) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[max(1rem,env(safe-area-inset-top))] z-50 flex flex-col items-center gap-2 px-4">
      {r.nuovoLivello && (
        <div className="pop rounded-2xl bg-accent px-6 py-4 text-center text-black shadow-xl">
          <div className="text-xs font-semibold uppercase tracking-wide">Nuovo livello</div>
          <div className="text-3xl font-extrabold">{r.nuovoLivello}</div>
        </div>
      )}
      <div className="pop pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl bg-card p-3 shadow-xl ring-1 ring-white/10">
        <div className="flex-1">
          <div className="font-semibold">
            <span className="text-accent">+{r.punti} XP</span>
            {r.bonus > 0 && <span className="ml-2 inline-flex items-center gap-1 text-emerald-400"><Clover size={16} /> +{r.bonus} colpo di fortuna!</span>}
          </div>
          <div className="text-sm text-muted">{r.frase || r.titolo}</div>
        </div>
        <button data-suono="indietro" onClick={() => annulla(r.completamentoId)} className="rounded-lg bg-white/10 px-3 py-1.5 text-sm">
          Annulla
        </button>
      </div>
    </div>
  );
}
