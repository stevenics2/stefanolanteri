"use client";

import { useId } from "react";

export type PuntoGrafico = { etichetta: string; v: number | null };

// Un grafico a linea come nelle app di allenamento: linea luminosa con i punti, griglia tratteggiata, riga dell'obiettivo,
// titolo e variazione in alto. La linea si disegna da sinistra a destra.
export default function GraficoLinea({
  titolo, grande, grandeEtichetta, grandeNota, grandeColore, sotto, colore, punti, yMin, yMax, passo, formatoY = (n) => String(n), riferimento, annidato = false, alto = 170, colorePerValore,
}: {
  titolo: string;
  grande?: string; // in alto a destra (es. «+33%»)
  grandeEtichetta?: string; // piccola scritta sotto il numero grande (es. «ultima notte»)
  grandeNota?: string; // una seconda riga, ancora più piccola (es. «media 5 notti 6 h 05 min»)
  grandeColore?: string;
  sotto?: string; // sotto il titolo, nel colore del grafico (es. «1 ott – 31 ott»)
  colore: string;
  punti: PuntoGrafico[];
  yMin: number;
  yMax: number;
  passo: number;
  formatoY?: (n: number) => string;
  riferimento?: { v: number; etichetta: string };
  annidato?: boolean;
  alto?: number; // altezza del disegno
  colorePerValore?: (v: number) => string; // se c'è, la linea e i punti cambiano colore secondo il valore (es. verde sopra lo zero, rosso sotto)
}) {
  const id = useId().replace(/:/g, "");
  const W = 340;
  const H = alto;
  const sx = 34;
  const dx = 12;
  const top = 12;
  const bot = 24;
  const x = (i: number) => (punti.length <= 1 ? sx + (W - sx - dx) / 2 : sx + ((W - sx - dx) * i) / (punti.length - 1));
  const y = (v: number) => top + (H - top - bot) * (1 - (Math.min(yMax, Math.max(yMin, v)) - yMin) / (yMax - yMin));
  const ticks: number[] = [];
  for (let t = yMin; t <= yMax + 1e-9; t += passo) ticks.push(t);

  // segmenti continui (un punto senza dato interrompe la linea)
  const segmenti: { i: number; v: number }[][] = [];
  let corrente: { i: number; v: number }[] = [];
  punti.forEach((p, i) => {
    if (p.v === null) {
      if (corrente.length) segmenti.push(corrente);
      corrente = [];
    } else corrente.push({ i, v: p.v });
  });
  if (corrente.length) segmenti.push(corrente);
  const mostra = new Set([0, Math.floor((punti.length - 1) / 2), punti.length - 1]);

  const corpo = (
    <>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-lg font-black uppercase tracking-wide">{titolo}</div>
          {sotto && <div className="text-xs font-medium" style={{ color: colore }}>{sotto}</div>}
        </div>
        {grande && (
          <div className="text-right">
            <div className="text-2xl font-black tabular-nums" style={{ color: grandeColore ?? colore }}>{grande}</div>
            {grandeEtichetta && <div className="-mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">{grandeEtichetta}</div>}
            {grandeNota && <div className="text-[10px] tabular-nums text-muted">{grandeNota}</div>}
          </div>
        )}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full" role="img" aria-label={titolo}>
        <defs>
          {colorePerValore && (
            <linearGradient id={`v${id}`} gradientUnits="userSpaceOnUse" x1="0" x2="0" y1={y(yMax)} y2={y(yMin)}>
              {Array.from({ length: 41 }, (_, k) => {
                const v = yMax - ((yMax - yMin) * k) / 40;
                return <stop key={k} offset={`${(k / 40) * 100}%`} stopColor={colorePerValore(v)} />;
              })}
              <stop offset={`${((yMax - 0) / (yMax - yMin)) * 100}%`} stopColor={colorePerValore(0)} />
            </linearGradient>
          )}
          <linearGradient id={`g${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colore} stopOpacity="0.35" />
            <stop offset="100%" stopColor={colore} stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={sx} x2={W - dx} y1={y(t)} y2={y(t)} stroke="currentColor" strokeOpacity="0.14" />
            <text x={sx - 6} y={y(t) + 3} textAnchor="end" fontSize="9" fill="currentColor" fillOpacity="0.55">{formatoY(t)}</text>
          </g>
        ))}
        {punti.map((_, i) => (
          <line key={i} x1={x(i)} x2={x(i)} y1={top} y2={H - bot} stroke="currentColor" strokeOpacity="0.07" strokeDasharray="2 4" />
        ))}
        {riferimento && riferimento.v >= yMin && riferimento.v <= yMax && (
          <g>
            <line x1={sx} x2={W - dx} y1={y(riferimento.v)} y2={y(riferimento.v)} stroke="#4ade80" strokeOpacity="0.8" strokeDasharray="4 4" />
            <text x={sx + 4} y={y(riferimento.v) - 4} textAnchor="start" fontSize="9" fill="#4ade80">{riferimento.etichetta}</text>
          </g>
        )}
        {segmenti.map((seg, k) =>
          seg.length > 1 ? (
            <g key={k}>
              {!colorePerValore && <path d={`M ${x(seg[0].i)} ${H - bot} ${seg.map((p) => `L ${x(p.i)} ${y(p.v)}`).join(" ")} L ${x(seg[seg.length - 1].i)} ${H - bot} Z`} fill={`url(#g${id})`} />}
              <path d={seg.map((p, j) => `${j ? "L" : "M"} ${x(p.i)} ${y(p.v)}`).join(" ")} pathLength={1} fill="none" stroke={colorePerValore ? `url(#v${id})` : colore} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="linea-disegna" style={{ filter: `drop-shadow(0 0 4px ${colore}aa)` }} />
            </g>
          ) : null,
        )}
        {punti.map((p, i) => (p.v === null ? null : <circle key={i} cx={x(i)} cy={y(p.v)} r="3.6" fill={colorePerValore ? colorePerValore(p.v) : colore} stroke="var(--card)" strokeWidth="1.5" className="punto-compare" style={{ animationDelay: `${Math.min(900, i * 60)}ms` }} />))}
        {punti.map((p, i) => (mostra.has(i) ? <text key={i} x={x(i)} y={H - 6} textAnchor={i === 0 ? "start" : i === punti.length - 1 ? "end" : "middle"} fontSize="9" fill="currentColor" fillOpacity="0.6">{p.etichetta}</text> : null))}
      </svg>
    </>
  );
  return annidato ? <div className="mt-4">{corpo}</div> : <div className="rounded-2xl bg-card p-4" style={{ backgroundImage: `radial-gradient(120% 80% at 50% 110%, ${colore}1f, transparent 70%)` }}>{corpo}</div>;
}

// Le tessere con un numero grande, come nella foto: icona e nome in alto, il valore sotto.
export function TessereKpi({ voci }: { voci: { icona: React.ReactNode; titolo: string; valore: string; unita?: string; colore: string }[] }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {voci.map((v) => (
        <div key={v.titolo} className="rounded-xl bg-card px-3 py-2">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-muted"><span style={{ color: v.colore }}>{v.icona}</span> {v.titolo}</div>
          <div className="mt-0.5 text-xl font-black tabular-nums leading-none">{v.valore}<span className="ml-0.5 text-xs font-bold text-muted">{v.unita}</span></div>
        </div>
      ))}
    </div>
  );
}
