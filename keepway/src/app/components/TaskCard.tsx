"use client";

import { AlarmClock, Check, Clock, Flame, Play, SkipForward, Undo2 } from "lucide-react";
import { useState } from "react";
import { puntiMinima, serie } from "@/lib/regole";
import { durataMin, durataTotaleMin } from "@/lib/durata";
import { finestraMigliore, hhmm } from "@/lib/sonno";
import { stanzaDelGiorno, titoloTask } from "@/lib/stanze";
import { useStore } from "@/lib/store";
import type { Task } from "@/lib/tipi";
import AreaIcona from "./AreaIcona";

const ora = (ms: number) => new Date(ms).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });

// Una task nella schermata Oggi: avvia il timer, segna come fatta, fa la versione minima,
// la rimanda a più tardi oppure la salta per oggi.
export default function TaskCard({ task, soloMinima }: { task: Task; soloMinima: boolean }) {
  const { stato, oggi, completa, annulla, apriTimer, ignoraOggi, rimanda, annullaRinvio } = useStore();
  const [piuTardi, setPiuTardi] = useState(false);
  const area = stato.aree.find((a) => a.id === task.areaId);
  const fatto = stato.completamenti.find((c) => c.taskId === task.id && c.data === oggi);
  const rinvio = stato.rinvii.find((r) => r.taskId === task.id && r.data === oggi);
  const giorni = serie(task, stato.completamenti, oggi, { vacanza: stato.vacanza }, stato.ignorati);
  const colore = area?.colore ?? "#888";
  const minima = task.minimaMin;
  // Task che si adatta ai turni: il momento libero più lungo di oggi (né in turno, né a dormire)
  const finestra = task.adattaATurni && !fatto ? finestraMigliore(oggi, durataTotaleMin(task)) : null;
  const senzaTempo = task.adattaATurni && !fatto && !finestra;
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
        <AreaIcona nome={task.icona ?? area?.icona ?? ""} colore={colore} />
        <div className="flex-1">
          <div className={`font-semibold ${fatto ? "line-through" : ""}`}>{titoloTask(task, stato, oggi)}</div>
          <div className="mt-0.5 text-xs text-muted">
            {area?.nome}
            {task.km ? ` · ${task.km} km (~${durataMin(task)} min)` : task.durataMin ? ` · ${task.durataMin} min` : ""}
            {task.spostamentoMin ? ` · +${task.spostamentoMin * 2} min di spostamento` : ""}
            {minima ? ` (minima ${minima})` : ""}
          </div>
          {finestra && (
            <div className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-300">
              <Clock size={12} /> Momento giusto: {hhmm(finestra.da)}–{hhmm(finestra.a)}
            </div>
          )}
          {senzaTempo && <div className="mt-1 text-xs text-amber-300">Oggi sei molto impegnato: se riesci, solo la versione minima.</div>}
          {stanza && stanza.totale > 0 && (
            <div className="mt-0.5 text-xs text-muted">
              {stanza.giroCompletato ? "Giro completato: ricominci da capo" : `Stanze del giro: ${stanza.fatteNelGiro}/${stanza.totale}`}
            </div>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-sm font-extrabold text-accent">
            +{soloMinima && minima ? puntiMinima(task.punti) : task.punti} XP
          </span>
          {giorni > 0 && (
            <span className="flex items-center gap-1 text-sm font-semibold text-accent">
              <Flame size={16} /> {giorni}
            </span>
          )}
        </div>
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
              <button onClick={() => apriTimer(task.id, false, task.durataMin!)} className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-sm font-bold text-black">
                <Play size={16} fill="currentColor" /> Inizia!
              </button>
            )}
            {soloMinima && minima && (
              <button onClick={() => apriTimer(task.id, true, minima)} className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-sm font-bold text-black">
                <Play size={16} fill="currentColor" /> Inizia! ({minima} min)
              </button>
            )}
            <button data-suono="nessuno" onClick={() => completa(task.id, { minima: soloMinima && !!minima })} className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-4 py-2 text-sm">
              <Check size={16} /> Fatta
            </button>
            {minima && !soloMinima && (
              <button data-suono="nessuno" onClick={() => completa(task.id, { minima: true })} className="rounded-xl bg-white/10 px-4 py-2 text-sm">
                Minima ({minima}′) · +{puntiMinima(task.punti)}
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
