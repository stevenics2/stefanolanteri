"use client";

import { AlarmClock, Check, Flame, Play, SkipForward, Undo2 } from "lucide-react";
import { useState } from "react";
import { serie } from "@/lib/regole";
import { stanzaDelGiorno, titoloTask } from "@/lib/stanze";
import { useStore } from "@/lib/store";
import type { Task } from "@/lib/tipi";
import AreaIcona from "./AreaIcona";

const ora = (ms: number) => new Date(ms).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });

// Una task nella schermata Oggi: avvia il timer, segna come fatta, fa la versione minima,
// la rimanda a più tardi oppure la salta per oggi.
export default function TaskCard({ task, soloMinima }: { task: Task; soloMinima: boolean }) {
  const { stato, oggi, completa, annulla, avviaTimer, ignoraOggi, rimanda, annullaRinvio } = useStore();
  const [piuTardi, setPiuTardi] = useState(false);
  const area = stato.aree.find((a) => a.id === task.areaId);
  const fatto = stato.completamenti.find((c) => c.taskId === task.id && c.data === oggi);
  const rinvio = stato.rinvii.find((r) => r.taskId === task.id && r.data === oggi);
  const giorni = serie(task, stato.completamenti, oggi, { vacanza: stato.vacanza }, stato.ignorati);
  const colore = area?.colore ?? "#888";
  const minima = task.minimaMin;
  const stanza = task.tipo === "stanza" ? stanzaDelGiorno(stato.stanze, stato.completamenti, task.id, oggi) : null;

  const rimandaDi = (minuti: number) => {
    rimanda(task.id, Date.now() + minuti * 60_000);
    setPiuTardi(false);
  };
  const stasera = () => {
    const d = new Date();
    d.setHours(20, 30, 0, 0);
    rimanda(task.id, Math.max(d.getTime(), Date.now() + 30 * 60_000));
    setPiuTardi(false);
  };

  return (
    <div className={`rounded-2xl bg-card p-4 ${fatto ? "opacity-60" : ""}`} style={{ borderLeft: `4px solid ${colore}` }}>
      <div className="flex items-start gap-3">
        <AreaIcona nome={area?.icona ?? ""} colore={colore} />
        <div className="flex-1">
          <div className={`font-semibold ${fatto ? "line-through" : ""}`}>{titoloTask(task, stato, oggi)}</div>
          <div className="mt-0.5 text-xs text-muted">
            {area?.nome}
            {task.durataMin ? ` · ${task.durataMin} min` : ""}
            {minima ? ` (minima ${minima})` : ""}
          </div>
          {stanza && stanza.totale > 0 && (
            <div className="mt-0.5 text-xs text-muted">
              {stanza.giroCompletato ? "Giro completato: ricominci da capo" : `Stanze del giro: ${stanza.fatteNelGiro}/${stanza.totale}`}
            </div>
          )}
        </div>
        {giorni > 0 && (
          <div className="flex shrink-0 items-center gap-1 text-sm font-semibold text-accent">
            <Flame size={18} /> {giorni}
          </div>
        )}
      </div>

      {fatto ? (
        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="inline-flex items-center gap-1.5 text-emerald-400">
            <Check size={16} /> Fatta{fatto.minima ? " (versione minima)" : ""} · +{fatto.punti + fatto.bonus} XP
          </span>
          <button data-suono="indietro" onClick={() => annulla(fatto.id)} className="inline-flex items-center gap-1 text-muted">
            <Undo2 size={14} /> Annulla
          </button>
        </div>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap gap-2">
            {task.durataMin && !soloMinima && (
              <button data-suono="via" onClick={() => avviaTimer(task.id, false, task.durataMin!)} className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-sm font-bold text-black">
                <Play size={16} fill="currentColor" /> Avvia
              </button>
            )}
            {soloMinima && minima && (
              <button data-suono="via" onClick={() => avviaTimer(task.id, true, minima)} className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-sm font-bold text-black">
                <Play size={16} fill="currentColor" /> Avvia ({minima} min)
              </button>
            )}
            <button data-suono="nessuno" onClick={() => completa(task.id, { minima: soloMinima && !!minima })} className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-4 py-2 text-sm">
              <Check size={16} /> Fatta
            </button>
            {minima && !soloMinima && (
              <button data-suono="nessuno" onClick={() => completa(task.id, { minima: true })} className="rounded-xl bg-white/10 px-4 py-2 text-sm">
                Minima ({minima}′)
              </button>
            )}
          </div>

          <div className="mt-2 flex items-center gap-4 text-sm text-muted">
            {rinvio ? (
              <span className="inline-flex items-center gap-1.5 text-sky-300">
                <AlarmClock size={15} /> Te lo ricordo alle {ora(rinvio.alle)}
                <button data-suono="indietro" onClick={() => annullaRinvio(task.id)} className="ml-1 underline">togli</button>
              </span>
            ) : (
              <button onClick={() => setPiuTardi((v) => !v)} className="inline-flex items-center gap-1.5">
                <AlarmClock size={15} /> Più tardi
              </button>
            )}
            <button data-suono="pausa" onClick={() => ignoraOggi(task.id)} className="inline-flex items-center gap-1.5">
              <SkipForward size={15} /> Salta oggi
            </button>
          </div>

          {piuTardi && (
            <div className="mt-2 flex flex-wrap gap-2">
              {[["Tra 1 ora", () => rimandaDi(60)], ["Tra 3 ore", () => rimandaDi(180)], ["Stasera 20:30", stasera]].map(([etichetta, azione]) => (
                <button key={etichetta as string} data-suono="via" onClick={azione as () => void} className="rounded-full bg-sky-500/15 px-3 py-1 text-sm text-sky-200">
                  {etichetta as string}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
