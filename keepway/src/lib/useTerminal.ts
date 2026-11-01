"use client";

import { useEffect, useState } from "react";
import { scaricaTerminal, terminalInCache, type StatoTerminal } from "./terminal";

// Lo stato dei semafori: si chiede quando si apre la schermata, ogni 5 minuti e al rientro nell'app. Offline resta l'ultimo noto.
export function useTerminal(): StatoTerminal | null {
  const [stato, setStato] = useState<StatoTerminal | null>(null);
  useEffect(() => {
    let spento = false;
    const carica = () =>
      scaricaTerminal()
        .then((s) => !spento && setStato(s))
        .catch(() => !spento && setStato((prec) => prec ?? terminalInCache()));
    void carica();
    const id = setInterval(carica, 5 * 60_000);
    const rientro = () => document.visibilityState === "visible" && void carica();
    document.addEventListener("visibilitychange", rientro);
    return () => {
      spento = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", rientro);
    };
  }, []);
  return stato;
}
