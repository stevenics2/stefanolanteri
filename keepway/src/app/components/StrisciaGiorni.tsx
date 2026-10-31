"use client";

import { dataPiù } from "@/lib/date";
import { coloreGiorno, riepilogoGiorno } from "@/lib/giornata";

const GIORNI = 7;

// I prossimi giorni in una riga: tocchi un giorno e lo vedi. Il puntino dice che turno hai.
export default function StrisciaGiorni({ oggi, selezionato, onScegli }: { oggi: string; selezionato: string; onScegli: (d: string) => void }) {
  const giorni = Array.from({ length: GIORNI }, (_, i) => dataPiù(oggi, i));
  return (
    <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
      {giorni.map((d, i) => {
        const dt = new Date(`${d}T12:00:00`);
        const sel = d === selezionato;
        return (
          <button
            key={d}
            data-suono="via"
            onClick={() => onScegli(d)}
            aria-pressed={sel}
            className={`flex min-w-[3.1rem] flex-col items-center rounded-2xl px-2 py-1.5 ${sel ? "bg-foreground text-background" : "bg-ov/10"}`}
          >
            <span className={`text-[10px] font-semibold uppercase ${sel ? "text-background/60" : "text-muted"}`}>{i === 0 ? "Oggi" : dt.toLocaleDateString("it-IT", { weekday: "short" }).replace(".", "")}</span>
            <span className="text-base font-extrabold leading-tight">{dt.getDate()}</span>
            <span className="mt-0.5 h-1.5 w-1.5 rounded-full" style={{ background: coloreGiorno(riepilogoGiorno(d)) }} />
          </button>
        );
      })}
    </div>
  );
}
