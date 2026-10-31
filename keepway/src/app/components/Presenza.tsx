"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

// Fa durare un elemento il tempo di animare l'uscita. Si passa `dato` (null = deve sparire): quando diventa null il contenuto resta
// per `ms` millisecondi con `uscendo` = true (così si può dare la classe di uscita), poi viene tolto.
// Chi sta dentro può anche leggere `useInUscita()` senza che gli si passi niente (lo usa Schermo).
const UscitaContext = createContext(false);
export const useInUscita = () => useContext(UscitaContext);

export default function Presenza<T>({ dato, ms = 300, children }: { dato: T | null | undefined; ms?: number; children: (dato: T, uscendo: boolean) => ReactNode }) {
  const [prec, setPrec] = useState<T | null | undefined>(dato);
  const [tenuto, setTenuto] = useState<T | null>(dato ?? null);
  // Quando cambia il dato si aggiorna lo stato subito (schema consigliato da React per «adattare lo stato a un cambio di props»)
  if (dato !== prec) {
    setPrec(dato);
    if (dato) setTenuto(dato);
  }
  const uscendo = !dato && tenuto !== null;
  useEffect(() => {
    if (dato || tenuto === null) return;
    const t = setTimeout(() => setTenuto(null), ms);
    return () => clearTimeout(t);
  }, [dato, tenuto, ms]);
  if (tenuto === null) return null;
  return <UscitaContext.Provider value={uscendo}>{children(dato ?? tenuto, uscendo)}</UscitaContext.Provider>;
}
