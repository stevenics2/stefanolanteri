"use client";

import { ChevronsUp, Flame, Shield } from "lucide-react";
import { useEffect, useState } from "react";
import { dataPiù } from "@/lib/date";
import { LIVELLI, livello } from "@/lib/regole";
import { useStore } from "@/lib/store";
import { useContaSu } from "@/lib/useContaSu";

const xpDelGiorno = (s: ReturnType<typeof useStore>["stato"], d: string) =>
  s.completamenti.filter((c) => c.data === d).reduce((t, c) => t + c.punti + c.bonus, 0) + s.bonus.filter((b) => b.data === d).reduce((t, b) => t + b.xp, 0);

// Il grado: livello e XP. Mostrina con i gradi, XP che salgono, quanto hai guadagnato oggi, barra con il riflesso verso il grado successivo.
export default function Livello() {
  const { xp, stato, oggi } = useStore();
  const anim = stato.impostazioni.animazioni;
  const l = livello(xp);
  const [montato, setMontato] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMontato(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const mostrati = useContaSu(xp, anim, 1100);

  const giorni = Array.from({ length: 7 }, (_, i) => dataPiù(oggi, i - 6));
  const serie = giorni.map((d) => xpDelGiorno(stato, d));
  const oggiXp = serie[6];
  const media14 = Array.from({ length: 14 }, (_, i) => xpDelGiorno(stato, dataPiù(oggi, -i - 1))).reduce((a, b) => a + b, 0) / 14;
  const giorniAlProssimo = l.prossimo && media14 > 0 ? Math.ceil(l.mancano / media14) : null;
  const max = Math.max(10, ...serie);
  const vicino = !!l.prossimo && l.progresso >= 0.85;
  const pct = Math.round(l.progresso * 100);

  return (
    <div className="rounded-2xl bg-card p-4" style={{ backgroundImage: "radial-gradient(120% 90% at 0% 0%, rgba(245,165,36,0.14), transparent 60%)" }}>
      <div className="flex items-center gap-3">
        <div className="relative flex h-16 w-14 shrink-0 items-center justify-center">
          <Shield size={56} strokeWidth={1.4} className="text-accent" style={{ filter: "drop-shadow(0 0 8px rgba(245,165,36,0.55))" }} fill="rgba(245,165,36,0.12)" />
          <span className="absolute text-xl font-black">{l.numero}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-muted">Grado {l.numero} di {LIVELLI.length}</div>
          <div className="text-2xl font-black leading-tight">{l.nome}</div>
          <div className="mt-0.5 flex gap-1">
            {LIVELLI.map((_, i) => <span key={i} className="h-1.5 w-5 rounded-full" style={{ background: i <= l.indice ? "var(--accent)" : "rgba(128,128,128,0.25)", boxShadow: i === l.indice ? "0 0 6px var(--accent)" : undefined }} />)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-black tabular-nums text-accent">{mostrati}</div>
          <div className="text-[11px] text-muted">XP</div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${oggiXp > 0 ? "bg-green-500/20 text-green-300" : "bg-ov/10 text-muted"}`}>
          <ChevronsUp size={13} /> {oggiXp > 0 ? `+${oggiXp} XP oggi` : "0 XP oggi: parti da una task"}
        </span>
        {media14 > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-ov/10 px-2.5 py-1 text-xs text-muted"><Flame size={13} className="text-orange-400" /> {Math.round(media14)} XP al giorno</span>}
      </div>

      <div className="mt-3">
        <div className={`relative h-3 overflow-hidden rounded-full bg-ov/10 ${vicino ? "respira" : ""}`}>
          <div className="shimmer relative h-full overflow-hidden rounded-full bg-accent" style={{ width: `${anim ? (montato ? pct : 0) : pct}%`, minWidth: pct > 0 ? 8 : 0, transition: anim ? "width 1.2s cubic-bezier(.2,.8,.2,1)" : "none" }} />
        </div>
        <div className="mt-1.5 flex items-baseline justify-between text-xs text-muted">
          <span>{l.prossimo ? <>{pct}% · mancano <b className="text-foreground">{l.mancano} XP</b> a «{l.prossimo.nome}»</> : "Grado massimo raggiunto"}</span>
          {giorniAlProssimo !== null && <span>~{giorniAlProssimo} {giorniAlProssimo === 1 ? "giorno" : "giorni"} al tuo ritmo</span>}
        </div>
      </div>

      <div className="mt-3 flex h-10 items-end gap-1.5" aria-label="XP degli ultimi 7 giorni">
        {serie.map((v, i) => (
          <div key={giorni[i]} className="flex h-full flex-1 items-end">
            <div className="barra-sale w-full rounded-sm" style={{ height: `${(v / max) * 100}%`, minHeight: v ? 3 : 2, background: i === 6 ? "var(--accent)" : "rgba(245,165,36,0.4)", opacity: v ? 1 : 0.35 }} />
          </div>
        ))}
      </div>
      <div className="mt-0.5 text-[10px] text-muted">XP degli ultimi 7 giorni</div>
    </div>
  );
}
