"use client";

import type { ReactNode } from "react";

type Voce<T extends string> = { id: T; etichetta: ReactNode };

// Un selettore a segmenti come quello di iOS: la pillola di colore scivola da una voce all'altra con una piccola molla,
// e il testo cambia colore in dissolvenza. Le voci hanno tutte la stessa larghezza.
export default function Segmentato<T extends string>({
  voci, valore, onCambia, contenitore = "rounded-xl bg-ov/10", pillola = "rounded-lg bg-accent", testoAttivo = "text-black", testoSpento = "text-muted",
  bottone = "py-1.5 text-sm font-medium", margine = 4, aria, inline = false,
}: {
  voci: Voce<T>[];
  valore: T;
  onCambia: (v: T) => void;
  contenitore?: string;
  pillola?: string;
  testoAttivo?: string;
  testoSpento?: string;
  bottone?: string;
  margine?: number;
  aria?: string;
  inline?: boolean;
}) {
  const n = voci.length;
  const indice = Math.max(0, voci.findIndex((v) => v.id === valore));
  return (
    <div className={`relative ${inline ? "inline-grid" : "grid"} grid-flow-col auto-cols-fr ${contenitore}`} style={{ padding: margine }} role="group" aria-label={aria}>
      <span
        aria-hidden
        className={`pointer-events-none absolute ${pillola}`}
        style={{
          top: margine,
          bottom: margine,
          left: margine,
          width: `calc((100% - ${margine * 2}px) / ${n})`,
          transform: `translateX(${indice * 100}%)`,
          transition: "transform 0.5s var(--molla)",
        }}
      />
      {voci.map((v) => (
        <button
          key={v.id}
          type="button"
          data-suono="via"
          onClick={() => onCambia(v.id)}
          aria-pressed={valore === v.id}
          className={`relative z-10 inline-flex items-center justify-center gap-1.5 px-3 transition-colors duration-300 ${bottone} ${valore === v.id ? `${testoAttivo} font-semibold` : testoSpento}`}
        >
          {v.etichetta}
        </button>
      ))}
    </div>
  );
}
