"use client";

import { useEffect, useRef } from "react";

const CARATTERI = "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉ0123456789ｦﾝ";

// Pioggia di caratteri verdi, stile Matrix, dietro il riepilogo. Leggera: poche colonne, ~14 fotogrammi al secondo, ferma se la pagina è nascosta.
export default function PioggiaMatrix({ attiva }: { attiva: boolean }) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !attiva || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const passo = 13;
    let colonne: number[] = [];
    let larghezza = 0;
    let altezza = 0;
    const misura = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      larghezza = r.width;
      altezza = r.height;
      canvas.width = larghezza * dpr;
      canvas.height = altezza * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      colonne = Array.from({ length: Math.ceil(larghezza / passo) }, () => Math.random() * -20);
    };
    misura();
    const ro = new ResizeObserver(misura);
    ro.observe(canvas);

    let ultimo = 0;
    let raf = 0;
    const disegna = (t: number) => {
      raf = requestAnimationFrame(disegna);
      if (document.hidden || t - ultimo < 70) return; // ~14 fps
      ultimo = t;
      ctx.fillStyle = "rgba(0, 0, 0, 0.14)"; // sfuma la scia
      ctx.fillRect(0, 0, larghezza, altezza);
      ctx.font = `${passo - 1}px monospace`;
      colonne.forEach((riga, i) => {
        const c = CARATTERI[Math.floor(Math.random() * CARATTERI.length)];
        ctx.fillStyle = "#b9ffd6"; // la "testa" è più chiara
        ctx.fillText(c, i * passo, riga * passo);
        ctx.fillStyle = "rgba(0, 255, 156, 0.55)";
        ctx.fillText(CARATTERI[Math.floor(Math.random() * CARATTERI.length)], i * passo, (riga - 1) * passo);
        colonne[i] = riga * passo > altezza && Math.random() > 0.96 ? 0 : riga + 1;
      });
    };
    raf = requestAnimationFrame(disegna);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [attiva]);

  return <canvas ref={ref} aria-hidden className="pointer-events-none absolute inset-0 h-full w-full opacity-30" />;
}
