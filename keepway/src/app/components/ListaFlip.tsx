"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";

// Quando le righe cambiano posto (una task fatta scende in fondo, una nuova entra) scivolano nella nuova posizione invece di saltare.
// Ogni figlio diretto deve avere data-flip="id".
export default function ListaFlip({ children, className }: { children: ReactNode; className?: string }) {
  const rif = useRef<HTMLDivElement>(null);
  const prima = useRef(new Map<string, number>());
  useLayoutEffect(() => {
    const el = rif.current;
    if (!el) return;
    const figli = Array.from(el.querySelectorAll<HTMLElement>(":scope > [data-flip]"));
    const ora = new Map<string, number>();
    for (const f of figli) ora.set(f.dataset.flip!, f.getBoundingClientRect().top + window.scrollY);
    if (document.documentElement.dataset.animazioni !== "off" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      for (const f of figli) {
        const vecchia = prima.current.get(f.dataset.flip!);
        const nuova = ora.get(f.dataset.flip!)!;
        if (vecchia !== undefined && Math.abs(vecchia - nuova) > 2) {
          f.animate([{ transform: `translateY(${vecchia - nuova}px)` }, { transform: "translateY(0)" }], { duration: 520, easing: "cubic-bezier(0.16, 1, 0.3, 1)" });
        }
      }
    }
    prima.current = ora;
  });
  return <div ref={rif} className={className}>{children}</div>;
}
