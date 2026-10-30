"use client";

import { Flame, Target, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { inizioSettimana } from "@/lib/date";
import { livello, serie } from "@/lib/regole";
import { useStore } from "@/lib/store";
import PioggiaMatrix from "./PioggiaMatrix";

// Un numero che "sale" fino al valore: più soddisfazione che vederlo comparire.
function useConteggio(valore: number, anima: boolean) {
  const [v, setV] = useState(0);
  const da = useRef(0);
  useEffect(() => {
    if (!anima) return;
    const inizio = performance.now();
    const partenza = da.current;
    let raf = 0;
    const passo = (t: number) => {
      const k = Math.min(1, (t - inizio) / 800);
      const x = Math.round(partenza + (valore - partenza) * (1 - Math.pow(1 - k, 3)));
      da.current = x;
      setV(x);
      if (k < 1) raf = requestAnimationFrame(passo);
    };
    raf = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(raf);
  }, [valore, anima]);
  return anima ? v : valore;
}

const R = 21;
const CIRC = 2 * Math.PI * R;
const VERDE = "#3dffa8";

// Il recap in cima a Oggi, in stile Matrix: compatto, un colpo d'occhio su livello, punti e giornata.
export default function RiepilogoOggi({ fatte, totale }: { fatte: number; totale: number }) {
  const { stato, oggi, xp } = useStore();
  const anima = stato.impostazioni.animazioni;
  const l = livello(xp);

  const xpOggi = stato.completamenti.filter((c) => c.data === oggi).reduce((t, c) => t + c.punti + c.bonus, 0);
  const lunedi = inizioSettimana(oggi);
  const settimana = stato.completamenti.filter((c) => c.data >= lunedi && c.data <= oggi).length;
  const giorniSerie = Math.max(0, ...stato.task.map((t) => serie(t, stato.completamenti, oggi, { vacanza: stato.vacanza }, stato.ignorati)));

  const xpMostrati = useConteggio(xp, anima);
  const progressoGiorno = totale > 0 ? fatte / totale : 0;
  const finita = totale > 0 && fatte === totale;

  const frase = (() => {
    if (l.prossimo && l.mancano <= 30 && l.mancano > 0) return `a ${l.mancano} xp dal livello «${l.prossimo.nome}»`;
    if (totale === 0) return "giornata libera: goditela";
    if (finita) return "giornata chiusa. sei uno costante";
    if (fatte === 0) return "si parte. la prima è la più dura";
    return `${fatte} fatte, ne ${totale - fatte === 1 ? "manca 1" : `mancano ${totale - fatte}`}`;
  })();

  return (
    <div
      className="relative overflow-hidden rounded-2xl border bg-black p-3 font-mono"
      style={{ borderColor: "rgba(61,255,168,0.35)", boxShadow: "0 0 28px -10px rgba(61,255,168,0.6), inset 0 0 24px rgba(61,255,168,0.06)" }}
    >
      <PioggiaMatrix attiva={anima} />
      <div className="relative">
        <div className="flex items-center gap-3">
          <div className="relative h-14 w-14 shrink-0">
            <svg viewBox="0 0 50 50" className="-rotate-90">
              <circle cx="25" cy="25" r={R} fill="none" stroke="rgba(61,255,168,0.15)" strokeWidth="4" />
              <circle
                cx="25" cy="25" r={R} fill="none" stroke={VERDE} strokeWidth="4" strokeLinecap="round"
                strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - progressoGiorno)}
                style={{ transition: "stroke-dashoffset 0.9s ease-out", filter: "drop-shadow(0 0 4px rgba(61,255,168,0.8))" }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-sm font-black tabular-nums" style={{ color: VERDE }}>
              {totale > 0 ? `${fatte}/${totale}` : "—"}
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "rgba(61,255,168,0.75)" }}>
              &gt; lv.{l.numero} · {l.nome}
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black leading-none tabular-nums" style={{ color: VERDE, textShadow: "0 0 14px rgba(61,255,168,0.6)" }}>
                {xpMostrati}
              </span>
              <span className="text-xs font-semibold" style={{ color: "rgba(61,255,168,0.6)" }}>XP</span>
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-1 text-[11px] font-bold" style={{ color: VERDE }}>
            <span className="inline-flex items-center justify-end gap-1"><Flame size={12} className={giorniSerie > 0 ? "fiamma" : ""} /> {giorniSerie}</span>
            <span className="inline-flex items-center justify-end gap-1"><Zap size={12} /> +{xpOggi}</span>
            <span className="inline-flex items-center justify-end gap-1"><Target size={12} /> {settimana}</span>
          </div>
        </div>

        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full" style={{ background: "rgba(61,255,168,0.12)" }}>
          <div
            className="shimmer relative h-full overflow-hidden rounded-full transition-all duration-1000"
            style={{ width: `${Math.max(3, Math.round(l.progresso * 100))}%`, background: `linear-gradient(90deg, #00c878, ${VERDE})`, boxShadow: "0 0 10px rgba(61,255,168,0.7)" }}
          />
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[10px] uppercase tracking-wider" style={{ color: "rgba(61,255,168,0.6)" }}>
          <span>{l.prossimo ? `${l.mancano} xp → ${l.prossimo.nome}` : "livello massimo"}</span>
          <span className="normal-case tracking-normal">{frase}<span className="cursore">_</span></span>
        </div>
      </div>
    </div>
  );
}
