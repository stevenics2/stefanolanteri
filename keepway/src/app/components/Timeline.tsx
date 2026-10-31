"use client";

import { ChevronDown } from "lucide-react";
import { Fragment, useState } from "react";
import { eventiDelGiorno } from "@/lib/eventi";
import { momentoGiusto } from "@/lib/momento";
import { hhmm } from "@/lib/sonno";
import { useStore } from "@/lib/store";
import type { Evento, Task } from "@/lib/tipi";
import { RigaEvento } from "./AgendaBox";
import TaskCard from "./TaskCard";

type Voce =
  | { t: number; ordine: number; tipo: "evento"; evento: Evento }
  | { t: number; ordine: number; tipo: "task"; task: Task; fine: number }
  | { t: number; ordine: number; tipo: "adesso" };

// La giornata sulla linea del tempo: appuntamenti e task in ordine di orario, a tutta larghezza. L'orario sta sopra ogni scheda,
// a cavallo del bordo. «Adesso» scorre in mezzo. Le task senza un momento consigliato stanno sotto, in «Quando vuoi».
export default function Timeline({
  task, soloMinima, onModificaEvento,
}: { task: Task[]; soloMinima: boolean; onModificaEvento: (e: Evento) => void }) {
  const { stato, oggi, adesso } = useStore();
  const [mostraPassato, setMostraPassato] = useState(false);
  const d = adesso > 0 ? new Date(adesso) : null;
  const adessoMin = d ? d.getHours() * 60 + d.getMinutes() : null;

  const voci: Voce[] = [];
  for (const e of eventiDelGiorno(stato.eventi, oggi, oggi)) {
    voci.push({ t: e.ora ? Number(e.ora.slice(0, 2)) * 60 + Number(e.ora.slice(3)) : -1, ordine: 0, tipo: "evento", evento: e }); // senza ora: in cima
  }
  const senzaOrario: Task[] = [];
  for (const t of task) {
    const m = momentoGiusto(t, oggi, stato.momenti.find((x) => x.taskId === t.id && x.data === oggi));
    if (m) voci.push({ t: m.da, ordine: 1, tipo: "task", task: t, fine: m.a });
    else senzaOrario.push(t);
  }
  if (adessoMin !== null) voci.push({ t: adessoMin, ordine: 2, tipo: "adesso" });
  voci.sort((a, b) => a.t - b.t || a.ordine - b.ordine);

  // Il passato si raccoglie in una riga: appuntamenti passati e task già fatte
  const èPassata = (v: Voce) =>
    adessoMin === null
      ? false
      : v.tipo === "evento"
        ? v.t >= 0 && v.t < adessoMin - 30
        : v.tipo === "task"
          ? stato.completamenti.some((c) => c.taskId === v.task.id && c.data === oggi)
          : false;
  const nPassate = voci.filter(èPassata).length;
  const visibili = mostraPassato ? voci : voci.filter((v) => !èPassata(v));

  return (
    <div className="space-y-4">
      <div className="space-y-5">
        {nPassate > 0 && (
          <button onClick={() => setMostraPassato((x) => !x)} className="inline-flex items-center gap-1 text-xs font-semibold text-muted">
            {mostraPassato ? "Nascondi il passato" : `Già passato (${nPassate})`} <ChevronDown size={13} className={mostraPassato ? "rotate-180" : ""} />
          </button>
        )}
        {visibili.map((v, i) => {
          if (v.tipo === "adesso") {
            return (
              <div key="adesso" className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-red-500 shadow-[0_0_8px_2px_rgba(239,68,68,0.7)]" />
                <span className="h-px flex-1 bg-red-500/70" />
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-red-400">adesso {hhmm(v.t)}</span>
              </div>
            );
          }
          const etichetta = v.tipo === "task" ? `${hhmm(v.t)}–${hhmm(v.fine)}` : v.t < 0 ? "oggi" : hhmm(v.t);
          return (
            <div key={i} className="relative">
              <span className="absolute -top-2.5 left-4 z-10 rounded-full bg-background px-2.5 py-0.5 text-[11px] font-extrabold tabular-nums text-emerald-300 ring-1 ring-emerald-400/40">
                {etichetta}
              </span>
              {v.tipo === "evento" ? (
                <RigaEvento e={v.evento} oggi={oggi} senzaOra alTocco={() => onModificaEvento(v.evento)} />
              ) : (
                <TaskCard task={v.task} soloMinima={soloMinima} senzaOrario />
              )}
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
