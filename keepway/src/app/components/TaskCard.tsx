"use client";

import { AlarmClock, Check, ChevronDown, Clock, Pencil, Flame, Play, SkipForward, Undo2 } from "lucide-react";
import { useState } from "react";
import { puntiMinima, serie } from "@/lib/regole";
import { durataMin } from "@/lib/durata";
import { momentoGiusto } from "@/lib/momento";
import { hhmm } from "@/lib/sonno";
import { stanzaDelGiorno, titoloTask } from "@/lib/stanze";
import { useStore } from "@/lib/store";
import type { Task } from "@/lib/tipi";
import AreaIcona, { iconaTask } from "./AreaIcona";

const ora = (ms: number) => new Date(ms).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });

// Una task nella schermata Oggi: avvia il timer, segna come fatta, fa la versione minima,
// la rimanda a più tardi oppure la salta per oggi.
export default function TaskCard({ task, soloMinima, senzaOrario = false }: { task: Task; soloMinima: boolean; senzaOrario?: boolean }) {
  const { stato, oggi, completa, annulla, apriTimer, ignoraOggi, rimanda, annullaRinvio, impostaMomento } = useStore();
  const [piuTardi, setPiuTardi] = useState(false);
  const [modMomento, setModMomento] = useState(false);
  const [aperta, setAperta] = useState(false); // il planner mostra la riga compatta; toccandola si apre la scheda intera
  const area = stato.aree.find((a) => a.id === task.areaId);
  const fatto = stato.completamenti.find((c) => c.taskId === task.id && c.data === oggi);
  const rinvio = stato.rinvii.find((r) => r.taskId === task.id && r.data === oggi);
  const giorni = serie(task, stato.completamenti, oggi, { vacanza: stato.vacanza }, stato.ignorati);
  const colore = area?.colore ?? "#888";
  const minima = task.minimaMin;
  // Task che si adatta ai turni: il momento libero più lungo di oggi (né in turno, né a dormire)
  const scelto = stato.momenti.find((m) => m.taskId === task.id && m.data === oggi);
  const finestra = !fatto ? momentoGiusto(task, oggi, scelto) : null;
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

  if (!aperta) {
    const fascia = task.fascia === "mattina" ? "Mattina" : task.fascia === "sera" ? "Sera" : "";
    const dettaglio = [task.km ? `${task.km} km` : task.durataMin ? `${task.durataMin} min` : "", fascia].filter(Boolean).join(" · ");
    return (
      <button
        data-suono="via"
        onClick={() => setAperta(true)}
        className={`flex w-full items-center gap-3 rounded-2xl bg-card px-3 py-2.5 text-left ${fatto ? "opacity-60" : ""}`}
        style={{ borderLeft: `4px solid ${colore}` }}
      >
        <AreaIcona nome={iconaTask(task, area?.icona ?? "")} colore={colore} />
        <span className="min-w-0 flex-1">
          <span className={`block font-semibold leading-tight ${fatto ? "line-through" : ""}`}>{titoloTask(task, stato, oggi)}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
            {finestra && !senzaOrario ? (
              <span className="inline-flex items-center gap-1 whitespace-nowrap font-semibold text-emerald-300">
                <Clock size={11} /> {hhmm(finestra.da)}–{hhmm(finestra.a)}
              </span>
            ) : null}
            {dettaglio && <span>{dettaglio}</span>}
            {rinvio && !fatto && (
              <span className="inline-flex items-center gap-1 whitespace-nowrap text-sky-300">
                <AlarmClock size={11} /> {ora(rinvio.alle)}
              </span>
            )}
          </span>
        </span>
        {fatto ? (
          <span className="inline-flex items-center gap-1 whitespace-nowrap text-sm font-bold text-emerald-400">
            <Check size={16} /> +{fatto.punti + fatto.bonus}
          </span>
        ) : (
          <span className="flex shrink-0 items-center gap-2">
            {giorni > 0 && (
              <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-accent">
                <Flame size={13} /> {giorni}
              </span>
            )}
            <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs font-extrabold text-accent">+{soloMinima && minima ? puntiMinima(task.punti) : task.punti}</span>
          </span>
        )}
        <ChevronDown size={16} className="shrink-0 text-muted" />
      </button>
    );
  }

  return (
    <div className={`rounded-2xl bg-card p-4 ${fatto ? "opacity-60" : ""}`} style={{ borderLeft: `4px solid ${colore}` }}>
      <div className="flex items-start gap-3">
        <AreaIcona nome={iconaTask(task, area?.icona ?? "")} colore={colore} />
        <div className="flex-1">
          <div className={`flex items-start justify-between gap-2 font-semibold ${fatto ? "line-through" : ""}`}>
            <span>{titoloTask(task, stato, oggi)}</span>
            <button data-suono="indietro" onClick={() => setAperta(false)} aria-label="Chiudi" className="-mt-1 shrink-0 p-1 text-muted">
              <ChevronDown size={18} className="rotate-180" />
            </button>
          </div>
          <div className="mt-0.5 text-xs text-muted">
            {area?.nome}
            {task.km ? ` · ${task.km} km (~${durataMin(task)} min)` : task.durataMin ? ` · ${task.durataMin} min` : ""}
            {task.spostamentoMin ? ` · +${task.spostamentoMin * 2} min di spostamento` : ""}
            {minima ? ` (minima ${minima})` : ""}
          </div>
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

      {(finestra) && <div className="mt-2">
          {finestra && !modMomento && (
            <button data-suono="via" onClick={() => setModMomento(true)} className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-300">
              <Clock size={12} /> Momento giusto: {hhmm(finestra.da)}–{hhmm(finestra.a)} <Pencil size={11} />
            </button>
          )}
          {finestra && modMomento && (
            <div className="flex flex-nowrap items-center gap-1.5 whitespace-nowrap text-xs text-emerald-300">
              <Clock size={12} />
              <input id={`da-${task.id}`} type="time" defaultValue={hhmm(finestra.da)} className="w-[5.2rem] rounded-lg bg-white/10 px-1.5 py-1 text-white" />
              –
              <input id={`a-${task.id}`} type="time" defaultValue={hhmm(finestra.a)} className="w-[5.2rem] rounded-lg bg-white/10 px-1.5 py-1 text-white" />
              <button
                data-suono="ok"
                className="rounded-full bg-emerald-500/25 px-2.5 py-1 font-bold"
                onClick={() => {
                  const min = (id: string) => {
                    const [h, m] = ((document.getElementById(id) as HTMLInputElement).value || "0:0").split(":").map(Number);
                    return h * 60 + m;
                  };
                  const da = min(`da-${task.id}`);
                  const a = min(`a-${task.id}`);
                  if (a > da) impostaMomento(task.id, { da, a });
                  setModMomento(false);
                }}
              >
                Ok
              </button>
              {scelto && (
                <button data-suono="indietro" className="text-muted underline" onClick={() => { impostaMomento(task.id, null); setModMomento(false); }}>
                  auto
                </button>
              )}
            </div>
          )}
      </div>}

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
            <button data-suono="nessuno" onClick={() => { completa(task.id, { minima: soloMinima && !!minima }); setAperta(false); }} className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-4 py-2 text-sm">
              <Check size={16} /> Fatta
            </button>
            {minima && !soloMinima && (
              <button data-suono="nessuno" onClick={() => { completa(task.id, { minima: true }); setAperta(false); }} className="rounded-xl bg-white/10 px-4 py-2 text-sm">
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
