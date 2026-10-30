"use client";

import { recapMese } from "@/lib/calendario";
import { MESI_LUNGHI } from "@/lib/date";
import { useStore } from "@/lib/store";

// Dopo una modifica ai turni: un piccolo recap del mese, in basso a sinistra. Sparisce insieme all'avviso "Annulla".
export default function RecapFlash() {
  const { avviso, stato } = useStore();
  if (!avviso) return null;
  const [a, m] = avviso.data.split("-").map(Number);
  const r = recapMese(stato.modifiche, a, m - 1);
  const riga = (etichetta: string, n: number) => (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-muted">{etichetta}</span>
      <span className="font-extrabold tabular-nums text-accent">{n}</span>
    </div>
  );
  return (
    <div className="pop pointer-events-none fixed bottom-[calc(env(safe-area-inset-bottom)+8.75rem)] left-3 z-40 w-40 rounded-xl bg-card/90 p-2.5 text-[11px] shadow-xl ring-1 ring-white/10 backdrop-blur">
      <div className="mb-1 font-bold uppercase tracking-wide">{MESI_LUNGHI[m - 1]}</div>
      {riga("Turni straordinario", r.straordinari)}
      {riga("Cambi turno", r.cambiPagati + r.cambiPersonali)}
      {riga("Doppi turni", r.doppi)}
    </div>
  );
}
