"use client";

import { useEffect, useState } from "react";

// Un numero che sale da 0 fino al valore (come il contachilometri): dà soddisfazione quando si apre la pagina.
export function useContaSu(target: number, attivo = true, ms = 900): number {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!attivo) return;
    let r = 0;
    const t0 = performance.now();
    const passo = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) r = requestAnimationFrame(passo);
    };
    r = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(r);
  }, [target, attivo, ms]);
  return attivo ? v : target;
}
