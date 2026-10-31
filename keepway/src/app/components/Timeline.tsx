"use client";

import { BedDouble, Briefcase, ChevronDown } from "lucide-react";
import { Fragment, useState } from "react";
import { eventiDelGiorno } from "@/lib/eventi";
import { momentoGiusto } from "@/lib/momento";
import { hhmm, impegniGiorno } from "@/lib/sonno";
import { useStore } from "@/lib/store";
import type { Evento, Task } from "@/lib/tipi";
import { RigaEvento } from "./AgendaBox";
import TaskCard from "./TaskCard";

type Voce =
  | { t: number; ordine: number; tipo: "turno" | "sonno"; etichetta: string; da: number; a: number; daIeri: boolean; fineDopo: boolean }
  | { t: number; ordine: number; tipo: "evento"; evento: Evento }
  | { t: number; ordine: number; tipo: "task"; task: Task }
  | { t: number; ordine: number; tipo: "adesso" };

const minutiTxt = (m: number) => (m >= 1440 ? "24:00" : hhmm(m));

// La giornata in una sola linea del tempo: turni, sonno, appuntamenti e task negli orari consigliati, con "adesso" che scorre.
// Le task senza un momento consigliato (e quelle da fare prima di dormire) restano sotto, in "Quando vuoi".
export default function Timeline({
  task, soloMinima, onModificaEvento,
}: { task: Task[]; soloMinima: boolean; onModificaEvento: (e: Evento) => void }) {
  const { stato, oggi, adesso } = useStore();
  const [mostraPassato, setMostraPassato] = useState(false);
  const d = adesso > 0 ? new Date(adesso) : null;
  const adessoMin = d ? d.getHours() * 60 + d.getMinutes() : null;

  const voci: Voce[] = [];
  for (const i of impegniGiorno(oggi)) voci.push({ t: i.da, ordine: 0, tipo: i.tipo, etichetta: i.etichetta, da: i.da, a: i.a, daIeri: i.daIeri, fineDopo: i.fineDopo });
  for (const e of eventiDelGiorno(stato.eventi, oggi, oggi)) {
    if (e.ora) voci.push({ t: Number(e.ora.slice(0, 2)) * 60 + Number(e.ora.slice(3)), ordine: 1, tipo: "evento", evento: e });
    else voci.push({ t: -1, ordine: 1, tipo: "evento", evento: e }); // tutto il giorno / promemoria senza ora: in cima
  }
  const senzaOrario: Task[] = [];
  for (const t of task) {
    const m = momentoGiusto(t, oggi, stato.momenti.find((x) => x.taskId === t.id && x.data === oggi));
    if (m) voci.push({ t: m.da, ordine: 2, tipo: "task", task: t });
    else senzaOrario.push(t);
  }
  if (adessoMin !== null) voci.push({ t: adessoMin, ordine: 3, tipo: "adesso" });
  voci.sort((a, b) => a.t - b.t || a.ordine - b.ordine);

  // Il passato si raccoglie in una riga: turni e sonno finiti, appuntamenti passati, task già fatte
  const èPassata = (v: Voce) =>
    adessoMin === null
      ? false
      : v.tipo === "turno" || v.tipo === "sonno"
        ? v.a <= adessoMin
        : v.tipo === "evento"
          ? v.t >= 0 && v.t < adessoMin - 30
          : v.tipo === "task"
            ? stato.completamenti.some((c) => c.taskId === v.task.id && c.data === oggi)
            : false;
  const nPassate = voci.filter(èPassata).length;
  const visibili = mostraPassato ? voci : voci.filter((v) => !èPassata(v));

  return (
    <div className="space-y-4">
      <div className="relative">
        {nPassate > 0 && (
          <button onClick={() => setMostraPassato((x) => !x)} className="mb-2 ml-14 inline-flex items-center gap-1 text-xs font-semibold text-muted">
            {mostraPassato ? "Nascondi il passato" : `Già passato (${nPassate})`} <ChevronDown size={13} className={mostraPassato ? "rotate-180" : ""} />
          </button>
        )}
        {visibili.map((v, i) => {
          if (v.tipo === "adesso") {
            return (
              <div key="adesso" className="flex items-center gap-3 py-1">
                <span className="w-11 shrink-0 text-right text-[11px] font-extrabold tabular-nums text-red-400">{hhmm(v.t)}</span>
                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-red-500 shadow-[0_0_8px_2px_rgba(239,68,68,0.7)]" />
                <span className="h-px flex-1 bg-red-500/70" />
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-red-400">adesso</span>
              </div>
            );
          }
          const orario = v.t < 0 ? "tutto il giorno" : hhmm(v.t);
          return (
            <div key={i} className="flex gap-3">
              <span className="w-11 shrink-0 pt-3 text-right text-[11px] font-semibold tabular-nums text-muted">{v.t < 0 ? "oggi" : orario}</span>
              <div className="relative min-w-0 flex-1 border-l border-white/10 pb-2 pl-3">
                <span className="absolute -left-[4.5px] top-[1.05rem] h-2 w-2 rounded-full bg-white/30" />
                {v.tipo === "task" ? (
                  <TaskCard task={v.task} soloMinima={soloMinima} />
                ) : v.tipo === "evento" ? (
                  <RigaEvento e={v.evento} oggi={oggi} senzaOra alTocco={() => onModificaEvento(v.evento)} />
                ) : (
                  <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${v.tipo === "turno" ? "bg-slate-500/15 text-slate-200" : "bg-indigo-500/15 text-indigo-200"}`}>
                    {v.tipo === "turno" ? <Briefcase size={15} /> : <BedDouble size={15} />}
                    <span className="font-semibold">{v.etichetta}</span>
                    <span className="text-xs opacity-75">
                      {v.daIeri ? `fino alle ${minutiTxt(v.a)}` : `${minutiTxt(v.da)}–${v.fineDopo ? "domani" : minutiTxt(v.a)}`}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {senzaOrario.length > 0 && (
        <Fragment>
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted">Quando vuoi</h2>
          <div className="space-y-2">
            {senzaOrario.map((t) => (
              <TaskCard key={t.id} task={t} soloMinima={soloMinima} />
            ))}
          </div>
        </Fragment>
      )}
    </div>
  );
}
