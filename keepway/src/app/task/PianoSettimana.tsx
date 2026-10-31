"use client";

import { Check, RotateCcw } from "lucide-react";
import { analizzaGiorno, pianifica } from "@/lib/allenamento";
import { dataPiù, GIORNI_BREVI, giornoSettimana, inizioSettimana } from "@/lib/date";
import { hhmm } from "@/lib/sonno";
import { useStore } from "@/lib/store";
import type { Task } from "@/lib/tipi";

// I giorni scelti dall'app per una task "N volte a settimana": questa settimana e la prossima, con il momento proposto e, dove non
// si può, il perché. Se la task è già salvata (`modifica`) ogni giorno si accende o si spegne con un tocco; altrimenti è un'anteprima.
export default function PianoSettimana({ task, modifica }: { task: Task; modifica: boolean }) {
  const { stato, oggi, sistemaGiornoAuto, ricalcolaPiano } = useStore();

  // Per un'anteprima (task non ancora salvata) si calcola il piano con la task provvisoria
  const voci = modifica
    ? stato.pianoAuto.filter((v) => v.taskId === task.id)
    : pianifica({ ...stato, task: [...stato.task, task], pianoAuto: [] }, oggi).filter((v) => v.taskId === task.id);
  const lunedi = inizioSettimana(oggi);
  const settimane = [0, 1].map((s) => Array.from({ length: 7 }, (_, i) => dataPiù(lunedi, s * 7 + i)));
  const fatti = new Set(stato.completamenti.filter((c) => c.taskId === task.id).map((c) => c.data));

  return (
    <div className="space-y-3">
      {settimane.map((giorni, s) => (
        <div key={s} className="space-y-1.5">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted">{s === 0 ? "Questa settimana" : "Prossima settimana"}</div>
          {giorni.map((d) => {
            const voce = voci.find((v) => v.data === d && v.tipo !== "escluso");
            const passato = d < oggi;
            const fatto = fatti.has(d);
            const analisi = analizzaGiorno(task, d, stato.eventi);
            const inPiano = !!voce;
            const dt = new Date(`${d}T12:00:00`);
            const orario = voce?.da !== undefined && voce.a !== undefined ? `${hhmm(voce.da)}–${hhmm(voce.a)}` : voce ? "quando vuoi" : "";
            const motivo = analisi.motivo ?? (analisi.slot ? `si può · ${analisi.nota}` : "");
            return (
              <button
                key={d}
                type="button"
                disabled={!modifica || passato}
                data-suono={inPiano ? "indietro" : "via"}
                onClick={() => sistemaGiornoAuto(task.id, d, !inPiano)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm ${inPiano ? "bg-accent/20 ring-1 ring-accent/40" : "bg-white/5"} ${passato ? "opacity-45" : ""}`}
              >
                <span className="w-14 shrink-0 font-semibold">
                  {GIORNI_BREVI[giornoSettimana(d)]} {dt.getDate()}
                </span>
                <span className="min-w-0 flex-1">
                  {fatto ? (
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-300"><Check size={14} /> fatto</span>
                  ) : inPiano ? (
                    <span className="font-semibold text-accent">{orario}</span>
                  ) : (
                    <span className="text-xs text-muted">{motivo}</span>
                  )}
                </span>
                {modifica && !passato && (
                  <span className={`h-5 w-9 shrink-0 rounded-full p-0.5 ${inPiano ? "bg-accent" : "bg-white/15"}`}>
                    <span className={`block h-4 w-4 rounded-full bg-black transition-transform ${inPiano ? "translate-x-4" : ""}`} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ))}
      {modifica && (
        <button type="button" data-suono="via" onClick={() => ricalcolaPiano(task.id)} className="inline-flex items-center gap-1.5 text-sm text-muted underline">
          <RotateCcw size={14} /> Rifai la proposta da zero
        </button>
      )}
    </div>
  );
}
