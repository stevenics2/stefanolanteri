"use client";

import { ArrowDown, ArrowUp, Gauge } from "lucide-react";
import { useEffect, useState } from "react";
import { dataPiù, MESI_BREVI } from "@/lib/date";
import { calcolaDisciplina, fraseDisciplina } from "@/lib/disciplina";
import { useStore } from "@/lib/store";
import { useContaSu } from "@/lib/useContaSu";
import { useDatiSalute } from "@/lib/useSalute";
import Approfondisci from "./Approfondisci";
import GraficoLinea from "./GraficoLinea";

const R = 42;
const ZONE: [number, number, string][] = [[0, 40, "#f87171"], [40, 60, "#fbbf24"], [60, 75, "#a3e635"], [75, 90, "#4ade80"], [90, 100, "#fcd34d"]];
const colorePunteggio = (p: number) => ZONE.find((z) => p < z[1])?.[2] ?? "#fcd34d";

// Un quadrante ad arco (270°) con le fasce di colore e il punteggio al centro.
function Arco({ valore, mostrato, colore, anim, montato }: { valore: number; mostrato: number; colore: string; anim: boolean; montato: boolean }) {
  const lungo = ((anim ? (montato ? valore : 0) : valore) / 100) * 75;
  return (
    <div className="relative h-28 w-28 shrink-0">
      <svg viewBox="0 0 110 110" className="h-full w-full" style={{ transform: "rotate(135deg)" }}>
        {ZONE.map(([da, a, c]) => (
          <circle key={da} cx="55" cy="55" r={R} fill="none" stroke={c} strokeOpacity="0.28" strokeWidth="7" pathLength={100} strokeDasharray={`${((a - da) / 100) * 75 - 0.8} 100`} strokeDashoffset={-((da / 100) * 75)} />
        ))}
        <circle cx="55" cy="55" r={R} fill="none" stroke={colore} strokeWidth="9" strokeLinecap="round" pathLength={100} strokeDasharray={`${lungo} 100`} style={{ transition: anim ? "stroke-dasharray 1.4s cubic-bezier(.2,.8,.2,1)" : "none", filter: `drop-shadow(0 0 5px ${colore}88)` }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-3xl font-black tabular-nums leading-none" style={{ color: colore }}>{mostrato}</div>
        <div className="text-[10px] text-muted">su 100</div>
      </div>
    </div>
  );
}

// La Disciplina, compatta: a sinistra le cinque voci con la barra, a destra il punteggio medio; sotto, l'andamento e una frase del giorno.
export default function DisciplinaCard() {
  const { stato, oggi } = useStore();
  const tutti = useDatiSalute(60);
  const salute = tutti ? tutti.giorni : null;
  const sonni = tutti?.sonni ?? [];
  const anim = stato.impostazioni.animazioni;
  const d = calcolaDisciplina(stato, salute ?? [], oggi, sonni);
  const andamento = Array.from({ length: 8 }, (_, i) => {
    const fine = dataPiù(oggi, -7 * (7 - i));
    return { etichetta: `${Number(fine.slice(8))} ${MESI_BREVI[Number(fine.slice(5, 7)) - 1]}`, v: calcolaDisciplina(stato, salute ?? [], fine, sonni).punteggio };
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

  return (
    <div className="rounded-3xl bg-card p-4" style={{ boxShadow: d.punteggio >= 90 ? `0 0 28px -10px ${colore}` : undefined }}>
      <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted"><Gauge size={15} /> Disciplina</div>

      <div className="mt-3 flex items-center gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          {d.voci.map((v) => (
            <div key={v.id} className={v.punteggio === null ? "opacity-45" : ""}>
              <div className="flex items-baseline justify-between text-xs">
                <span className="font-medium">{v.nome}</span>
                <span className="font-bold tabular-nums" style={{ color: v.punteggio === null ? undefined : colorePunteggio(v.punteggio) }}>{v.punteggio ?? "—"}</span>
              </div>
              <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-ov/10">
                <div className="barra-cresce h-full rounded-full" style={{ width: `${v.punteggio ?? 0}%`, background: v.punteggio === null ? undefined : colorePunteggio(v.punteggio) }} />
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-col items-center">
          <Arco valore={d.punteggio} mostrato={mostrato} colore={colore} anim={anim} montato={montato} />
          <div className="-mt-1 text-sm font-black uppercase tracking-wide" style={{ color: colore }}>{d.livello}</div>
          {diff !== null && (
            <div className="flex items-center gap-0.5 text-[11px]" style={{ color: diff > 0 ? "#4ade80" : diff < 0 ? "#f87171" : undefined }}>
              {diff > 0 ? <ArrowUp size={11} /> : diff < 0 ? <ArrowDown size={11} /> : null}{diff > 0 ? "+" : ""}{diff} in 2 sett.
            </div>
          )}
        </div>
      </div>

      <GraficoLinea annidato alto={120} titolo="Andamento" sotto="ultime 8 settimane" colore={colore} punti={andamento} yMin={0} yMax={100} passo={50} />

      <p className="mt-3 rounded-xl bg-ov/5 px-3 py-2 text-sm font-semibold italic">{fraseDisciplina(d.punteggio, oggi)}</p>

      <Approfondisci>
        <p>Media pesata di cinque voci, in ordine di importanza: sonno (5), allenamento (4), ordine (3), lettura (2), meditazione (1).</p>
        <p>Si guardano gli ultimi 14 giorni (28 per l&apos;allenamento, rispetto a 3 a settimana). Il sonno conta le notti rispetto al tuo obiettivo. Le voci senza dati non entrano nel calcolo e i pesi si ridistribuiscono.</p>
        {d.miglioraSubito && <p>Il modo più rapido per far salire il punteggio: <b className="text-foreground">{d.miglioraSubito.nome.toLowerCase()}</b> ({d.miglioraSubito.punteggio}).</p>}
        <p>Zone: sotto 40 da costruire, 40–59 in crescita, 60–74 solida, 75–89 forte, 90 e oltre di ferro.</p>
      </Approfondisci>
    </div>
  );
}
