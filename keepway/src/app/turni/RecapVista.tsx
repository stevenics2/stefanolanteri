"use client";

import { ChevronLeft, ChevronRight, Undo2 } from "lucide-react";
import { useState } from "react";
import { giornoEffettivo, recapMese } from "@/lib/calendario";
import { MESI_LUNGHI } from "@/lib/date";
import { dataBreve } from "@/lib/eventi";
import { useStore } from "@/lib/store";
import { bandaDi } from "./banda";

const p2 = (n: number) => String(n).padStart(2, "0");

// La scheda "Recap": il mese in numeri e l'elenco di tutte le modifiche, ognuna annullabile.
export default function RecapVista() {
  const { pronto, stato, oggi, annullaModifiche } = useStore();
  const [mese, setMese] = useState<{ a: number; m: number } | null>(null);
  if (!pronto) return null;

  const { a, m } = mese ?? { a: Number(oggi.slice(0, 4)), m: Number(oggi.slice(5, 7)) - 1 };
  const vai = (d: number) => {
    const n = new Date(a, m + d, 1);
    setMese({ a: n.getFullYear(), m: n.getMonth() });
  };

  const r = recapMese(stato.modifiche, a, m);
  const modifiche = stato.modifiche.filter((x) => x.data.startsWith(`${a}-${p2(m + 1)}`)).sort((x, y) => x.data.localeCompare(y.data));
  const assenze = r.assenze.ferie + r.assenze.malattia + r.assenze.permesso + r.assenze.altro;

  // Le voci del recap, in elenco. Dei cambi turno contano solo quelli pagati dall'azienda.
  const voci: { n: number; nome: string; sotto: string; classe: string }[] = [
    { n: r.straordinari, nome: "Turni straordinario", sotto: `${r.oreStraordinario} ore di straordinario`, classe: "bg-violet-600" },
    { n: r.cambiPagati, nome: "Cambi turno pagati da azienda", sotto: "i cambi richiesti dall'azienda", classe: "bg-emerald-600" },
    { n: r.doppi, nome: "Doppi turni", sotto: "da straordinario o da cambio pagato", classe: "bg-blue-600" },
    { n: assenze, nome: "Assenze", sotto: assenze ? `${r.assenze.ferie} ferie · ${r.assenze.malattia} malattia · ${r.assenze.permesso} permessi` : "nessuna", classe: "bg-amber-600" },
  ];

  return (
    <div className="space-y-4 px-4 pb-4 pt-4">
      <div className="flex items-center justify-between">
        <button data-suono="indietro" onClick={() => vai(-1)} aria-label="Mese precedente" className="rounded-xl bg-white/10 p-2"><ChevronLeft size={20} /></button>
        <div className="text-lg font-bold capitalize">{MESI_LUNGHI[m]} {a}</div>
        <button data-suono="via" onClick={() => vai(1)} aria-label="Mese successivo" className="rounded-xl bg-white/10 p-2"><ChevronRight size={20} /></button>
      </div>

      <div className="space-y-2">
        {voci.map((x) => (
          <div key={x.nome} className="flex items-center gap-4 rounded-2xl bg-card p-3">
            <span className={`${x.classe} flex h-12 min-w-12 items-center justify-center rounded-xl px-2 text-2xl font-black leading-none text-white`}>{x.n}</span>
            <div className="min-w-0">
              <div className="font-semibold leading-tight">{x.nome}</div>
              <div className="text-xs text-muted">{x.sotto}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Modifiche del mese</h2>
        {modifiche.length === 0 && <p className="text-sm text-muted">Nessuna modifica ai turni in questo mese.</p>}
        {modifiche.map((x) => {
          const ge = giornoEffettivo(x.data);
          const banda = bandaDi(x);
          return (
            <div key={x.id} className="flex items-center gap-3 rounded-2xl bg-card p-3">
              <div className="w-14 shrink-0 text-center text-sm font-semibold capitalize text-sky-300">{dataBreve(x.data)}</div>
              <div className="min-w-0 flex-1">
                <div className="font-bold">{ge?.etichetta ?? x.codici.join("+")}</div>
                {banda ? (
                  <div className={`${banda.classe} mt-1 inline-block rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white`}>{banda.testo}</div>
                ) : (
                  <div className="text-xs text-muted">Assenza</div>
                )}
              </div>
              <button
                data-suono="indietro"
                onClick={() => confirm(x.gruppo ? "Annullare questa modifica e quella collegata?" : "Annullare questa modifica?") && annullaModifiche([x.id])}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1.5 text-xs"
              >
                <Undo2 size={13} /> Annulla
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
