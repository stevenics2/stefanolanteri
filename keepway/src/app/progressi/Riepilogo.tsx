"use client";

import { BadgeCheck, CheckCheck, Flame } from "lucide-react";
import { useEffect, useState } from "react";
import { livello, serie } from "@/lib/regole";
import { useStore } from "@/lib/store";
import { giornatePiene } from "@/lib/traguardi";
import { useContaSu } from "@/lib/useContaSu";

const R = 46;
const CIRC = 2 * Math.PI * R;

// L'apertura della pagina: il livello in un anello che si riempie, gli XP che salgono, la serie con la fiamma.
export default function Riepilogo() {
  const { stato, oggi, xp } = useStore();
  const anim = stato.impostazioni.animazioni;
  const l = livello(xp);
  const serieMax = Math.max(0, ...stato.task.map((t) => serie(t, stato.completamenti, oggi, { vacanza: stato.vacanza }, stato.ignorati)));
  const piene = giornatePiene(stato, oggi);
  const totale = stato.completamenti.length;

  const [montato, setMontato] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMontato(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const xpMostrati = useContaSu(xp, anim, 1100);
  const serieMostrata = useContaSu(serieMax, anim, 800);
  const pienaMostrata = useContaSu(piene, anim, 800);
  const totaleMostrato = useContaSu(totale, anim, 800);
  const riempi = anim ? (montato ? l.progresso : 0) : l.progresso;

  return (
    <div className="rounded-3xl bg-card p-4">
      <div className="flex items-center gap-4">
        <div className="relative h-28 w-28 shrink-0">
          <svg viewBox="0 0 110 110" className="h-full w-full -rotate-90">
            <circle cx="55" cy="55" r={R} fill="none" strokeWidth="9" className="stroke-ov/10" />
            <circle
              cx="55" cy="55" r={R} fill="none" strokeWidth="9" strokeLinecap="round" className="stroke-accent"
              strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - riempi)} style={{ transition: anim ? "stroke-dashoffset 1.3s cubic-bezier(.2,.8,.2,1)" : "none" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-[10px] uppercase tracking-wider text-muted">Livello</div>
            <div className="text-3xl font-black leading-none">{l.numero}</div>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs text-muted">Sei al livello</div>
          <div className="text-2xl font-bold leading-tight">{l.nome}</div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-3xl font-black text-accent tabular-nums">{xpMostrati}</span>
            <span className="text-xs text-muted">XP</span>
          </div>
          <div className="text-xs text-muted">{l.prossimo ? `Ancora ${l.mancano} XP per «${l.prossimo.nome}»` : "Livello massimo raggiunto"}</div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Chip icona={<Flame size={18} />} colore="#ffb340" valore={serieMostrata} etichetta="Serie (giorni)" acceso={serieMax > 0} />
        <Chip icona={<CheckCheck size={18} />} colore="#fcd34d" valore={pienaMostrata} etichetta="Giornate piene" acceso={piene > 0} />
        <Chip icona={<BadgeCheck size={18} />} colore="#7dd3fc" valore={totaleMostrato} etichetta="Prove fatte" acceso={totale > 0} />
      </div>
    </div>
  );
}

function Chip({ icona, colore, valore, etichetta, acceso }: { icona: React.ReactNode; colore: string; valore: number; etichetta: string; acceso: boolean }) {
  return (
    <div className="rounded-2xl bg-ov/5 px-2 py-2.5 text-center">
      <div className="mx-auto flex w-fit items-center gap-1" style={{ color: acceso ? colore : undefined }}>
        {icona}
        <span className="text-xl font-black tabular-nums">{valore}</span>
      </div>
      <div className="mt-0.5 text-[10px] leading-tight text-muted">{etichetta}</div>
    </div>
  );
}
