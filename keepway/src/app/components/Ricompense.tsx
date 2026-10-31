"use client";

import { useEffect } from "react";
import { coriandoli, suono } from "@/lib/effetti";
import { useStore } from "@/lib/store";
import Presenza from "./Presenza";

// Effetto di completamento: coriandoli e suono. Il messaggio con i punti compare dentro il riquadro di avanzamento (RiepilogoOggi); qui resta solo il banner del nuovo livello.
export default function Ricompense() {
  const { ricompensa: r, chiudiRicompensa, stato } = useStore();
  const { suoni, animazioni } = stato.impostazioni;

  useEffect(() => {
    if (!r) return;
    if (animazioni && r.nuovoLivello) void coriandoli(true); // i coriandoli solo per il livello nuovo: per le task ci sono le scintille negli anelli
    if (suoni) suono(r.nuovoLivello ? "livello" : r.daTimer ? "vittoria" : "slot");
    const id = setTimeout(chiudiRicompensa, r.nuovoLivello ? 5000 : 4000);
    return () => clearTimeout(id);
    // Parte una volta sola per ricompensa
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r?.id]);

  const banner = r && !stato.timer && r.nuovoLivello ? r : null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+0.75rem)] z-50 flex flex-col items-center gap-2 px-4">
      <Presenza dato={banner} ms={320}>
        {(b, uscendo) => (
          <div className={`rounded-2xl bg-accent px-6 py-4 text-center text-black shadow-xl ${uscendo ? "alto-fuori" : "alto-dentro"}`}>
            <div className="text-xs font-semibold uppercase tracking-wide">Nuovo livello</div>
            <div className="text-3xl font-extrabold">{b.nuovoLivello}</div>
          </div>
        )}
      </Presenza>
    </div>
  );
}
