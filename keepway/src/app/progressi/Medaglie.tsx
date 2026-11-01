"use client";

import { BadgeCheck, BookOpen, CheckCheck, Dumbbell, Flower2, Footprints, Medal, RefreshCw, Swords, Timer } from "lucide-react";
import { useStore } from "@/lib/store";
import { COLORI_MEDAGLIA, LIVELLI_MEDAGLIA, valutaTraguardi, type Gruppo, type Valutato } from "@/lib/traguardi";

const ICONE: Record<string, typeof Medal> = {
  "alle-settimane": Dumbbell, "corse-mese": Footprints, "giornate-piene": CheckCheck, boss: Swords, ritorni: RefreshCw,
  "med-serie": Flower2, "med-ore": Timer, "let-serie": BookOpen, "let-ore": BadgeCheck,
};
const GRUPPI: Gruppo[] = ["Allenamento", "Costanza", "Calma e mente"];

// I traguardi: tre livelli ciascuno. Quelli non ancora sbloccati si vedono in grigio, con quanto manca.
export default function Medaglie() {
  const { stato, oggi } = useStore();
  const valutati = valutaTraguardi(stato, oggi);
  const sbloccati = valutati.reduce((t, v) => t + v.livello, 0);
  const totale = valutati.length * 3;

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted"><Medal size={15} /> Traguardi</h2>
        <span className="text-xs text-muted">{sbloccati}/{totale} medaglie</span>
      </div>
      {GRUPPI.map((g) => (
        <div key={g} className="space-y-2">
          <div className="text-xs font-semibold text-muted">{g}</div>
          {valutati.filter((v) => v.gruppo === g).map((v) => <Scheda key={v.id} v={v} />)}
        </div>
      ))}
    </div>
  );
}

function Scheda({ v }: { v: Valutato }) {
  const Icona = ICONE[v.id] ?? Medal;
  const colore = v.livello > 0 ? COLORI_MEDAGLIA[v.livello - 1] : undefined;
  return (
    <div className={`rounded-2xl bg-card p-3 ${v.livello === 0 ? "opacity-80" : ""}`}>
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full" style={{ background: colore ? `${colore}26` : "rgba(128,128,128,0.12)", color: colore ?? "var(--muted)" }}>
          <Icona size={22} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="truncate font-semibold">{v.titolo}</div>
            <div className="flex shrink-0 gap-1">
              {COLORI_MEDAGLIA.map((c, i) => (
                <span key={i} title={LIVELLI_MEDAGLIA[i]} className="h-3.5 w-3.5 rounded-full" style={i < v.livello ? { background: c, boxShadow: `0 0 8px ${c}88` } : { background: "rgba(128,128,128,0.2)" }} />
              ))}
            </div>
          </div>
          <div className="truncate text-xs text-muted">{v.prossima ? v.descrizione : "Tutti i livelli sbloccati"}</div>
        </div>
      </div>
      {v.prossima !== null && (
        <div className="mt-2.5">
          <div className="h-2 overflow-hidden rounded-full bg-ov/10">
            <div className="barra-cresce h-full rounded-full" style={{ width: `${Math.max(v.valore > 0 ? 4 : 0, Math.round(v.progresso * 100))}%`, background: colore ?? "var(--accent)" }} />
          </div>
          <div className="mt-1 text-[11px] text-muted">{v.etichetta} · prossimo livello: {LIVELLI_MEDAGLIA[v.livello]}</div>
        </div>
      )}
    </div>
  );
}
