"use client";

import Link from "next/link";
import { dataPiù, inizioSettimana } from "@/lib/date";
import { èPrevista, livello } from "@/lib/regole";
import { useStore } from "@/lib/store";

const ANELLI = [
  { r: 16, colore: "#8fd3ff" }, // oggi
  { r: 10.5, colore: "#29a3f0" }, // settimana
  { r: 5, colore: "#6d7cff" }, // livello
];

// Il box ricompensa ridotto al minimo: tre anelli piccoli (oggi, settimana, livello), il livello e gli XP al prossimo. Il box grande sta in Progressi.
export default function BarraLivello({ fatte, totale }: { fatte: number; totale: number }) {
  const { stato, oggi, xp } = useStore();
  const l = livello(xp);
  const lunedi = inizioSettimana(oggi);
  let previsteSett = 0;
  for (let d = lunedi; d <= oggi; d = dataPiù(d, 1)) previsteSett += stato.task.filter((x) => èPrevista(x, d, { vacanza: stato.vacanza })).length;
  const fatteSett = stato.completamenti.filter((c) => c.data >= lunedi && c.data <= oggi).length;
  const frazioni = [totale > 0 ? fatte / totale : 0, previsteSett > 0 ? Math.min(1, fatteSett / previsteSett) : 0, l.prossimo ? l.progresso : 1];

  return (
    <Link href="/progressi/" data-suono="via" className="block rounded-2xl border border-[#29a3f0]/25 bg-black/60 px-3 py-2.5 active:scale-[0.99]" aria-label="Livello e progressi">
      <div key={fatte} className="barra-impulso flex items-center gap-3">
        <svg width="40" height="40" viewBox="0 0 38 38" className="shrink-0 -rotate-90" aria-hidden>
          {ANELLI.map((a, i) => {
            const c = 2 * Math.PI * a.r;
            return (
              <g key={i}>
                <circle cx="19" cy="19" r={a.r} fill="none" stroke={a.colore} strokeOpacity="0.18" strokeWidth={i === 2 ? 3 : 4} />
                <circle cx="19" cy="19" r={a.r} fill="none" stroke={a.colore} strokeWidth={i === 2 ? 3 : 4} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - Math.max(0.02, frazioni[i]))} style={{ transition: "stroke-dashoffset 0.9s cubic-bezier(.3,.7,.2,1)" }} />
              </g>
            );
          })}
        </svg>
        <div className="min-w-0 flex-1 font-mono">
          <div className="flex items-baseline justify-between text-[11px] tracking-wide text-[#9fb3c8]">
            <span>LV.{l.numero} {l.nome.toUpperCase()}</span>
            <span>{xp} XP</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-[#29a3f0] to-[#a5e3ff]" style={{ width: `${Math.round(l.progresso * 100)}%`, transition: "width 0.9s cubic-bezier(.3,.7,.2,1)" }} />
          </div>
          <div className="mt-1 text-[10px] text-[#6b7c8e]">{l.prossimo ? `${l.mancano} XP al livello ${l.numero + 1}` : "livello massimo"}</div>
        </div>
      </div>
    </Link>
  );
}
