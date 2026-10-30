"use client";

import { Flame, Target, Trophy, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { inizioSettimana } from "@/lib/date";
import { livello, serie } from "@/lib/regole";
import { useStore } from "@/lib/store";

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

const R = 38;
const CIRC = 2 * Math.PI * R;

// Il riassunto in cima a Oggi: livello, punti, giornata, serie. Pensato per darti la carica.
export default function RiepilogoOggi({ fatte, totale }: { fatte: number; totale: number }) {
  const { stato, oggi, xp } = useStore();
  const anima = stato.impostazioni.animazioni;
  const l = livello(xp);

  const xpOggi = stato.completamenti.filter((c) => c.data === oggi).reduce((t, c) => t + c.punti + c.bonus, 0);
  const lunedi = inizioSettimana(oggi);
  const settimana = stato.completamenti.filter((c) => c.data >= lunedi && c.data <= oggi).length;
  const migliore = stato.task
    .map((t) => ({ t, giorni: serie(t, stato.completamenti, oggi, { vacanza: stato.vacanza }, stato.ignorati) }))
    .sort((a, b) => b.giorni - a.giorni)[0];
  const giorniSerie = migliore?.giorni ?? 0;

  const xpMostrati = useConteggio(xp, anima);
  const progressoGiorno = totale > 0 ? fatte / totale : 0;
  const finita = totale > 0 && fatte === totale;

  // La frase sotto: cambia con la giornata.
  const frase = (() => {
    if (l.prossimo && l.mancano <= 30 && l.mancano > 0) return `A soli ${l.mancano} XP dal livello «${l.prossimo.nome}»! Una task e ci sei.`;
    if (totale === 0) return "Giornata libera dalle task: goditela, te la sei guadagnata.";
    if (finita) return `Giornata chiusa! ${stato.aree[0]?.frase ?? "Sei uno costante"}.`;
    if (fatte === 0) return "Si parte. La prima è la più difficile: poi è tutta in discesa.";
    const mancano = totale - fatte;
    return `${fatte} fatte, ${mancano === 1 ? "ne manca solo 1" : `ne mancano ${mancano}`}. Stai andando forte!`;
  })();

  return (
    <div className="relative overflow-hidden rounded-3xl border border-amber-400/30 bg-gradient-to-br from-amber-500/25 via-card to-card p-5 shadow-[0_0_40px_-12px_rgba(245,165,36,0.55)]">
      <div className="flex items-center gap-4">
        <div className="relative h-24 w-24 shrink-0">
          <svg viewBox="0 0 100 100" className="-rotate-90">
            <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="9" />
            <circle
              cx="50" cy="50" r={R} fill="none" stroke={finita ? "#34d399" : "#f5a524"} strokeWidth="9" strokeLinecap="round"
              strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - progressoGiorno)}
              style={{ transition: "stroke-dashoffset 0.9s ease-out, stroke 0.4s" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
            <span className="text-2xl font-black tabular-nums">{totale > 0 ? `${fatte}/${totale}` : "—"}</span>
            <span className="mt-1 text-[10px] uppercase tracking-wider text-muted">oggi</span>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-300">
            <Trophy size={14} /> Livello {l.numero}
          </div>
          <div className="bg-gradient-to-r from-amber-200 to-amber-400 bg-clip-text text-3xl font-extrabold leading-tight text-transparent">
            {l.nome}
          </div>
          <div className="mt-0.5 flex items-baseline gap-1.5">
            <span className="text-3xl font-black tabular-nums">{xpMostrati}</span>
            <span className="text-sm font-semibold text-muted">XP</span>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <div className="relative h-3 overflow-hidden rounded-full bg-white/10">
          <div
            className="shimmer relative h-full overflow-hidden rounded-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-1000"
            style={{ width: `${Math.max(4, Math.round(l.progresso * 100))}%` }}
          />
        </div>
        <div className="mt-1.5 text-xs text-muted">
          {l.prossimo ? `Ancora ${l.mancano} XP per «${l.prossimo.nome}»` : "Livello massimo raggiunto"}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-2xl bg-black/20 py-2.5">
          <Flame size={20} className={`mx-auto text-orange-400 ${giorniSerie > 0 ? "fiamma" : ""}`} />
          <div className="mt-1 text-lg font-extrabold leading-none tabular-nums">{giorniSerie}</div>
          <div className="mt-1 text-[10px] uppercase tracking-wider text-muted">giorni di serie</div>
        </div>
        <div className="rounded-2xl bg-black/20 py-2.5">
          <Zap size={20} className="mx-auto text-yellow-300" />
          <div className="mt-1 text-lg font-extrabold leading-none tabular-nums">+{xpOggi}</div>
          <div className="mt-1 text-[10px] uppercase tracking-wider text-muted">XP oggi</div>
        </div>
        <div className="rounded-2xl bg-black/20 py-2.5">
          <Target size={20} className="mx-auto text-sky-300" />
          <div className="mt-1 text-lg font-extrabold leading-none tabular-nums">{settimana}</div>
          <div className="mt-1 text-[10px] uppercase tracking-wider text-muted">task in settimana</div>
        </div>
      </div>

      <p className="mt-4 text-center text-sm font-medium text-amber-100/90">{frase}</p>
    </div>
  );
}
