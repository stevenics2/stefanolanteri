"use client";

import { useEffect, useState } from "react";
import { datiInCache, scaricaSalute, type GiornoSalute } from "./salute";

// I dati di salute più recenti (sonno e passi). Si scaricano quando si apre la schermata e ogni 10 minuti; offline restano quelli dell'ultima volta.
export function useSalute(giorni = 14) {
  const [dati, setDati] = useState<GiornoSalute[] | null>(null);
  useEffect(() => {
    let spento = false;
    const carica = () =>
      scaricaSalute(giorni)
        .then((d) => !spento && setDati(d))
        .catch(() => !spento && setDati((prec) => prec ?? datiInCache()));
    void carica();
    const id = setInterval(carica, 10 * 60_000);
    const rientro = () => document.visibilityState === "visible" && void carica();
    document.addEventListener("visibilitychange", rientro);
    return () => {
      spento = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", rientro);
    };
  }, [giorni]);
  return dati;
}
