"use client";

import { useEffect } from "react";
import { LIVELLI_MEDAGLIA, livelliSbloccati, valutaTraguardi } from "@/lib/traguardi";
import { useStore, type Festa } from "@/lib/store";

// Controlla i traguardi dopo ogni cambiamento: la prima volta registra in silenzio quelli già raggiunti, poi festeggia solo i nuovi.
export default function SbloccaTraguardi() {
  const { pronto, stato, oggi, sbloccaTraguardi } = useStore();
  useEffect(() => {
    if (!pronto || !oggi) return;
    const valutati = valutaTraguardi(stato, oggi);
    const livelli = livelliSbloccati(valutati);
    const salvati = stato.traguardi;
    if (!salvati) {
      sbloccaTraguardi(livelli, []); // prima volta: niente festa per quello che hai già
      return;
    }
    const feste: Festa[] = [];
    const nuovi: Record<string, number> = { ...salvati };
    for (const v of valutati) {
      if (v.livello > (salvati[v.id] ?? 0)) {
        nuovi[v.id] = v.livello;
        feste.push({ id: `${v.id}-${v.livello}-${Date.now()}`, tipo: "traguardo", titolo: `${LIVELLI_MEDAGLIA[v.livello - 1].toUpperCase()}!`, testo: `${v.titolo}: ${v.descrizione}`, xp: 0 });
      }
    }
    if (feste.length) sbloccaTraguardi(nuovi, feste);
  }, [pronto, stato, oggi, sbloccaTraguardi]);
  return null;
}
