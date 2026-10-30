"use client";

import { useEffect } from "react";
import { coriandoli, suono } from "@/lib/effetti";
import { useStore } from "@/lib/store";

// Effetto di completamento: coriandoli e suono. Il messaggio con i punti compare dentro il riquadro di avanzamento (RiepilogoOggi); qui resta solo il banner del nuovo livello.
export default function Ricompense() {
  const { ricompensa: r, chiudiRicompensa, stato } = useStore();
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

  if (!r || stato.timer) return null; // con il timer aperto non deve coprire nulla
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+0.75rem)] z-50 flex flex-col items-center gap-2 px-4">
      {r.nuovoLivello && (
        <div className="pop rounded-2xl bg-accent px-6 py-4 text-center text-black shadow-xl">
          <div className="text-xs font-semibold uppercase tracking-wide">Nuovo livello</div>
          <div className="text-3xl font-extrabold">{r.nuovoLivello}</div>
        </div>
      )}
    </div>
  );
}
