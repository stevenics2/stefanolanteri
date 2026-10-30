"use client";

import { MESI_LUNGHI } from "@/lib/date";
import { recapMese } from "@/lib/calendario";
import { useStore } from "@/lib/store";

// Un riassunto del mese: straordinari, cambi turno, assenze.
export default function RecapMese({ anno, mese0 }: { anno: number; mese0: number }) {
  const { stato } = useStore();
  const r = recapMese(stato.modifiche, anno, mese0);
  const voci = [
    r.straordinari > 0 && { n: `${r.straordinari}`, etichetta: `straordinari · ${r.oreStraordinario} ore`, classe: "bg-violet-600" },
    r.doppi > 0 && { n: `${r.doppi}`, etichetta: "doppi turni", classe: "bg-blue-600" },
    r.cambiPagati > 0 && { n: `${r.cambiPagati}`, etichetta: "cambi pagati da azienda", classe: "bg-emerald-600" },
    r.cambiPersonali > 0 && { n: `${r.cambiPersonali}`, etichetta: "cambi personali", classe: "bg-slate-600" },
    r.assenze.ferie > 0 && { n: `${r.assenze.ferie}`, etichetta: "giorni di ferie", classe: "bg-amber-600" },
    r.assenze.malattia > 0 && { n: `${r.assenze.malattia}`, etichetta: "giorni di malattia", classe: "bg-amber-600" },
    r.assenze.permesso > 0 && { n: `${r.assenze.permesso}`, etichetta: "permessi", classe: "bg-amber-600" },
    r.assenze.altro > 0 && { n: `${r.assenze.altro}`, etichetta: "altre assenze", classe: "bg-amber-600" },
  ].filter(Boolean) as { n: string; etichetta: string; classe: string }[];

  return (
    <div className="rounded-2xl bg-card p-4">
      <div className="text-sm font-semibold uppercase tracking-wide text-muted">Recap di {MESI_LUNGHI[mese0]}</div>
      {voci.length === 0 ? (
        <p className="mt-1 text-sm text-muted">Nessuna modifica ai turni questo mese.</p>
      ) : (
        <div className="mt-2 flex flex-wrap gap-2">
          {voci.map((v) => (
            <span key={v.etichetta} className="inline-flex items-center gap-2 rounded-full bg-white/5 py-1 pl-1 pr-3 text-sm">
              <span className={`${v.classe} min-w-7 rounded-full px-2 py-0.5 text-center font-extrabold text-white`}>{v.n}</span>
              {v.etichetta}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
