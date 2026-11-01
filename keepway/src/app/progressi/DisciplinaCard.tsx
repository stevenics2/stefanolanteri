"use client";

import { ArrowDown, ArrowUp, Gauge } from "lucide-react";
import { useEffect, useState } from "react";
import { calcolaDisciplina } from "@/lib/disciplina";
import { useStore } from "@/lib/store";
import { useContaSu } from "@/lib/useContaSu";
import { useSalute } from "@/lib/useSalute";
import { dataPiù, MESI_BREVI } from "@/lib/date";
import GraficoLinea from "./GraficoLinea";

const R = 54;
const CIRC = 2 * Math.PI * R;
const colorePunteggio = (p: number) => (p < 40 ? "#f87171" : p < 60 ? "#fbbf24" : p < 75 ? "#a3e635" : p < 90 ? "#4ade80" : "#fcd34d");

// La Disciplina: un numero da 0 a 100, media pesata di sonno, allenamento, ordine, lettura e meditazione (in quest'ordine di importanza).
export default function DisciplinaCard() {
  const { stato, oggi } = useStore();
  const salute = useSalute(40);
  const anim = stato.impostazioni.animazioni;
  const d = calcolaDisciplina(stato, salute ?? [], oggi);
  const andamento = Array.from({ length: 8 }, (_, i) => {
    const fine = dataPiù(oggi, -7 * (7 - i));
    return { etichetta: `${Number(fine.slice(8))} ${MESI_BREVI[Number(fine.slice(5, 7)) - 1]}`, v: calcolaDisciplina(stato, salute ?? [], fine).punteggio };
  });
  const [montato, setMontato] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMontato(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const mostrato = useContaSu(d.punteggio ?? 0, anim, 1000);
  if (d.punteggio === null) return null;
  const colore = colorePunteggio(d.punteggio);
  const diff = d.prima === null ? null : d.punteggio - d.prima;
  const riempi = (anim ? (montato ? d.punteggio : 0) : d.punteggio) / 100;

  return (
    <div className="rounded-3xl bg-card p-4" style={{ boxShadow: d.punteggio >= 90 ? `0 0 30px -10px ${colore}` : undefined }}>
      <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted"><Gauge size={15} /> Disciplina</div>
      <div className="mt-3 flex items-center gap-4">
        <div className="relative h-32 w-32 shrink-0">
          <svg viewBox="0 0 130 130" className="h-full w-full -rotate-90">
            <circle cx="65" cy="65" r={R} fill="none" strokeWidth="11" className="stroke-ov/10" />
            <circle cx="65" cy="65" r={R} fill="none" strokeWidth="11" strokeLinecap="round" stroke={colore} strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - riempi)}
              style={{ transition: anim ? "stroke-dashoffset 1.4s cubic-bezier(.2,.8,.2,1)" : "none", filter: `drop-shadow(0 0 5px ${colore}66)` }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-4xl font-black tabular-nums leading-none" style={{ color: colore }}>{mostrato}</div>
            <div className="text-[10px] text-muted">su 100</div>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-2xl font-bold" style={{ color: colore }}>{d.livello}</div>
          {diff !== null && (
            <div className="mt-1 flex items-center gap-1 text-sm" style={{ color: diff > 0 ? "#4ade80" : diff < 0 ? "#f87171" : undefined }}>
              {diff > 0 ? <ArrowUp size={14} /> : diff < 0 ? <ArrowDown size={14} /> : null}
              {diff === 0 ? "come due settimane fa" : `${diff > 0 ? "+" : ""}${diff} rispetto alle due settimane prima`}
            </div>
          )}
          {d.miglioraSubito && <div className="mt-2 text-xs text-muted">Il modo più rapido per salire: <b className="text-foreground">{d.miglioraSubito.nome.toLowerCase()}</b> ({d.miglioraSubito.punteggio}).</div>}
        </div>
      </div>

      <GraficoLinea annidato titolo="Andamento" sotto="ultime 8 settimane" colore={colore} punti={andamento} yMin={0} yMax={100} passo={25} grande={diff === null ? undefined : `${diff > 0 ? "+" : ""}${diff}`} grandeColore={diff === null ? undefined : diff >= 0 ? "#4ade80" : "#f87171"} />

      <div className="mt-4 space-y-2.5">
        {d.voci.map((v) => (
          <div key={v.id} className={v.punteggio === null ? "opacity-50" : ""}>
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-medium">{v.nome} <span className="text-[10px] font-normal text-muted">{v.punteggio === null ? "" : `pesa ${v.quota}%`}</span></span>
              <span className="font-bold tabular-nums" style={{ color: v.punteggio === null ? undefined : colorePunteggio(v.punteggio) }}>{v.punteggio ?? "—"}</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-ov/10">
              <div className="barra-cresce h-full rounded-full" style={{ width: `${v.punteggio ?? 0}%`, background: v.punteggio === null ? undefined : colorePunteggio(v.punteggio) }} />
            </div>
            <div className="mt-0.5 text-[11px] text-muted">{v.dettaglio}</div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-muted">Media pesata degli ultimi 14 giorni (28 per l&apos;allenamento): sonno conta di più, meditazione di meno. Le voci senza dati non entrano nel calcolo.</p>
    </div>
  );
}
