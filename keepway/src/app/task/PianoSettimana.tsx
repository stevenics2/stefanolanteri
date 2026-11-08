"use client";

import { Check, Clock, Pencil, RotateCcw } from "lucide-react";
import { useState } from "react";
import { durataTotaleMin } from "@/lib/durata";
import { analizzaGiorno, pianifica } from "@/lib/allenamento";
import { dataPiù, GIORNI_BREVI, giornoSettimana, inizioSettimana } from "@/lib/date";
import { hhmm } from "@/lib/sonno";
import { useStore } from "@/lib/store";
import type { Task } from "@/lib/tipi";

// I giorni scelti dall'app per una task "N volte a settimana": questa settimana e la prossima, con il momento proposto e, dove non
// si può, il perché. Se la task è già salvata (`modifica`) ogni giorno si accende o si spegne con un tocco; altrimenti è un'anteprima.
export default function PianoSettimana({ task, modifica }: { task: Task; modifica: boolean }) {
  const { stato, oggi, sistemaGiornoAuto, fissaOrarioGiornoAuto, ricalcolaPiano } = useStore();
  const [modificaOrario, setModificaOrario] = useState<string | null>(null); // il giorno di cui stai scegliendo l'orario
  const [orarioScelto, setOrarioScelto] = useState("18:00");

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
            const inModifica = modificaOrario === d;
            const salva = () => {
              const [h, m] = orarioScelto.split(":").map(Number);
              if (Number.isNaN(h) || Number.isNaN(m)) return setModificaOrario(null);
              const da = h * 60 + m;
              const durata = voce?.da !== undefined && voce.a !== undefined && voce.a > voce.da ? voce.a - voce.da : durataTotaleMin(task) || 30; // la durata resta quella
              fissaOrarioGiornoAuto(task.id, d, da, Math.min(23 * 60 + 59, da + durata));
              setModificaOrario(null);
            };
            return (
              <div key={d} className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm ${inPiano ? "bg-accent/20 ring-1 ring-accent/40" : "bg-ov/5"} ${passato ? "opacity-45" : ""}`}>
                <button
                  type="button"
                  disabled={!modifica || passato}
                  data-suono={inPiano ? "indietro" : "via"}
                  onClick={() => sistemaGiornoAuto(task.id, d, !inPiano)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <span className="w-14 shrink-0 font-semibold">
                    {GIORNI_BREVI[giornoSettimana(d)]} {dt.getDate()}
                  </span>
                  <span className="min-w-0 flex-1">
                    {fatto ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-300"><Check size={14} /> fatto</span>
                    ) : inPiano ? (
                      !modifica || passato ? <span className="font-semibold text-accent">{orario}</span> : null
                    ) : (
                      <span className="text-xs text-muted">{motivo}</span>
                    )}
                  </span>
                </button>
                {inPiano && modifica && !passato && !fatto && (inModifica ? (
                  <span className="flex shrink-0 items-center gap-1.5">
                    <input type="time" value={orarioScelto} onChange={(e) => setOrarioScelto(e.target.value)} className="w-[5.4rem] rounded-lg bg-ov/10 px-1.5 py-1 text-foreground" aria-label="Orario di inizio" />
                    <button type="button" data-suono="ok" onClick={salva} className="rounded-lg bg-accent px-2.5 py-1 text-xs font-bold text-black">Ok</button>
                    <button type="button" data-suono="indietro" onClick={() => setModificaOrario(null)} className="px-1 text-xs text-muted">×</button>
                  </span>
                ) : (
                  <button
                    type="button"
                    data-suono="via"
                    onClick={() => { setOrarioScelto(voce?.da !== undefined ? hhmm(voce.da) : "18:00"); setModificaOrario(d); }}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-ov/10 px-2.5 py-1 font-semibold text-accent"
                    aria-label="Scegli l'orario"
                  >
                    <Clock size={13} /> {orario || "orario"} <Pencil size={11} />
                  </button>
                ))}
                {modifica && !passato && !inModifica && (
                  <button type="button" disabled={!modifica || passato} onClick={() => sistemaGiornoAuto(task.id, d, !inPiano)} aria-label={inPiano ? "Togli il giorno" : "Aggiungi il giorno"} className={`h-5 w-9 shrink-0 rounded-full p-0.5 ${inPiano ? "bg-accent" : "bg-ov/15"}`}>
                    <span className={`block h-4 w-4 rounded-full bg-black transition-transform ${inPiano ? "translate-x-4" : ""}`} />
                  </button>
                )}
              </div>
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
