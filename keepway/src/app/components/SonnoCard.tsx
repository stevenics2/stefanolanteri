"use client";

import { AlarmClock, BedDouble } from "lucide-react";
import { useMemo } from "react";
import { oreMinuti } from "@/lib/salute";
import { useSalute } from "@/lib/useSalute";
import { consiglioSonno } from "@/lib/sonno";
import { useStore } from "@/lib/store";

// Il comando rapido di iOS che crea la sveglia: chiede lui l'orario (si crea una volta sola: vedi Impostazioni).
const NOME_COMANDO = "Keepway Sveglia";
const LINK_SVEGLIA = `shortcuts://run-shortcut?name=${encodeURIComponent(NOME_COMANDO)}`;

// Il prossimo sonno consigliato, in base ai turni (dopo la notte, riposino prima della notte, notte normale).
export default function SonnoCard() {
  const { pronto, oggi, stato } = useStore();
  const salute = useSalute(3);
  const stanotte = salute?.find((d) => d.giorno === oggi && d.sonnoMin); // quanto hai dormito stanotte, se l'iPhone ce l'ha mandato
  const riga = stanotte ? (
    <p className="mt-1 text-sm text-muted">
      Stanotte hai dormito <b className="text-foreground">{oreMinuti(stanotte.sonnoMin!)}</b>
      {stanotte.letto && stanotte.sveglia ? ` (${stanotte.letto} → ${stanotte.sveglia})` : ""}.
    </p>
  ) : null;
  // Si ricalcola quando cambia il giorno o i dati sono pronti (serve l'ora locale del telefono).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const c = useMemo(() => (pronto ? consiglioSonno(new Date()) : undefined), [pronto, oggi, stato.modifiche]);

  if (c === undefined) return null;

  if (c === null) {
    return (
      <div className="rounded-2xl bg-card p-4">
        <div className="flex items-center gap-2 text-sm text-muted"><BedDouble size={16} /> Sonno</div>
        <p className="mt-1">Nelle prossime 24 ore nessun turno ti vincola: dormi regolare.</p>
        {riga}
      </div>
    );
  }

  // Riposino e dopo-notte sono corti per forza: non sono un allarme, quindi tono normale.
  const allarme = c.sonno.corto && c.sonno.tipo === "notte";
  return (
    <div className={`rounded-2xl p-4 ${allarme ? "border border-amber-500/50 bg-amber-500/15" : "bg-card"}`}>
      <div className="flex items-center gap-2 text-sm text-muted"><BedDouble size={16} /> Sonno</div>
      {riga}
      {c.riga1 && <p className="mt-2 text-lg font-bold">{c.riga1}</p>}
      <p className="mt-0.5">
        {c.riga2.split(/(\d{2}:\d{2})/).map((pezzo, n) =>
          /^\d{2}:\d{2}$/.test(pezzo) ? (
            <span key={n} className="text-3xl font-extrabold text-accent">{pezzo}</span>
          ) : (
            pezzo
          ),
        )}
      </p>
      <p className="mt-2 text-sm text-muted">{c.dettaglio}</p>
      <a
        href={LINK_SVEGLIA}
        data-suono="via"
        className="mt-3 inline-flex items-center gap-2 rounded-xl bg-ov/10 px-4 py-2.5 text-sm font-semibold"
      >
        <AlarmClock size={16} /> Imposta sveglia
      </a>
    </div>
  );
}
