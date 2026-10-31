"use client";

import { useEffect, useState } from "react";
import { datiInCache, scaricaSalute, type DatiSalute, type GiornoSalute } from "./salute";

// I dati dall'iPhone (sonno, passi, allenamenti, ultimo invio). Si scaricano quando si apre la schermata, ogni 10 minuti e al rientro nell'app;
// offline restano quelli dell'ultima volta.
export function useDatiSalute(giorni = 14): DatiSalute | null {
  const [dati, setDati] = useState<DatiSalute | null>(null);
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

// Solo l'elenco dei giorni (sonno e passi), come prima.
export function useSalute(giorni = 14): GiornoSalute[] | null {
  return useDatiSalute(giorni)?.giorni ?? null;
}
