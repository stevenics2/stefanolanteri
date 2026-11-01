"use client";

import { Dumbbell, Flame, Footprints, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { dataPiù, giornoSettimana, GIORNI_LUNGHI, inizioSettimana, MESI_BREVI } from "@/lib/date";
import { tipoDellaTask } from "@/lib/saluteAuto";
import { useStore } from "@/lib/store";
import { ALLENAMENTI_A_SETTIMANA as OBIETTIVO, èAllenamento, settimaneDiAllenamento } from "@/lib/traguardi";
import { useContaSu } from "@/lib/useContaSu";
import GraficoLinea, { TessereKpi } from "./GraficoLinea";

const R = 46;
const CIRC = 2 * Math.PI * R;
const SETTIMANE = 8;
const breve = (d: string) => `${Number(d.slice(8))} ${MESI_BREVI[Number(d.slice(5, 7)) - 1]}`;

// Gli allenamenti: l'obiettivo è almeno 3 a settimana. Più ti alleni, più sei in salute: oltre il 3 l'anello diventa oro.
export default function Allenamenti() {
  const { stato, oggi } = useStore();
  const anim = stato.impostazioni.animazioni;
  const ids = new Map(stato.task.filter(èAllenamento).map((t) => [t.id, t]));
  const fatti = stato.completamenti.filter((c) => ids.has(c.taskId));
  const lunedi = inizioSettimana(oggi);
  const dettaglio = settimaneDiAllenamento(stato, oggi);

  const settimane = Array.from({ length: SETTIMANE }, (_, i) => {
    const inizio = dataPiù(lunedi, (i - SETTIMANE) * 7); // solo settimane concluse: quella in corso è nell'anello
    const fine = dataPiù(inizio, 6);
    const n = fatti.filter((c) => c.data >= inizio && c.data <= fine).length;
    return { inizio, n };
  });
  const questa = fatti.filter((c) => c.data >= lunedi && c.data <= dataPiù(lunedi, 6)).length;
  const yMax = Math.max(4, Math.ceil(Math.max(...settimane.map((s) => s.n)) / (Math.max(...settimane.map((s) => s.n)) > 6 ? 2 : 1)) * (Math.max(...settimane.map((s) => s.n)) > 6 ? 2 : 1));
  const media = (v: number[]) => v.reduce((t, n) => t + n, 0) / v.length;
  const ultime4 = media(settimane.slice(4).map((s) => s.n));
  const prime4 = media(settimane.slice(0, 4).map((s) => s.n));
  const variazione = prime4 > 0 ? Math.round(((ultime4 - prime4) / prime4) * 100) : null; // ultime 4 settimane contro le 4 prima
  const mancano = Math.max(0, OBIETTIVO - questa);
  const giorniRimasti = 7 - ((giornoSettimana(oggi) + 6) % 7); // oggi compreso, fino a domenica
  const raggiunto = questa >= OBIETTIVO;

  const contaTipo = (tipo: "corsa" | "palestra" | "altro") => fatti.filter((c) => (tipoDellaTask(ids.get(c.taskId)!) ?? "altro") === tipo).length;
  const corse = contaTipo("corsa");
  const palestra = contaTipo("palestra");
  const altro = contaTipo("altro");

  const [montato, setMontato] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMontato(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const mostrato = useContaSu(questa, anim, 700);
  const riempi = Math.min(1, questa / OBIETTIVO);
  const colore = raggiunto ? "#fcd34d" : "#ef4444";
  const giorniSett = Array.from({ length: 7 }, (_, i) => {
    const d = dataPiù(lunedi, i);
    return { d, fatto: fatti.filter((c) => c.data === d).length, oggi: d === oggi, futuro: d > oggi };
  });

  const messaggio = raggiunto
    ? questa > OBIETTIVO ? `Obiettivo superato di ${questa - OBIETTIVO}: sei in forma.` : "Obiettivo raggiunto! Ogni allenamento in più è un regalo al tuo corpo."
    : mancano <= giorniRimasti
      ? `Ti ${mancano === 1 ? "serve ancora 1 allenamento" : `servono ancora ${mancano} allenamenti`} entro domenica${giorniRimasti > 1 ? ` (${giorniRimasti} giorni)` : " (ultimo giorno)"}.`
      : "Arrivare a 3 questa settimana è difficile: ogni allenamento conta lo stesso. Lunedì si riparte.";

  if (!ids.size) return null;
  return (
    <div className="space-y-2">
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted"><Dumbbell size={15} /> Allenamenti</h2>
      <div className="rounded-2xl bg-card p-4">
        <div className="flex items-center gap-4">
          <div className="relative h-24 w-24 shrink-0">
            <svg viewBox="0 0 110 110" className="h-full w-full -rotate-90">
              <circle cx="55" cy="55" r={R} fill="none" strokeWidth="10" className="stroke-ov/10" />
              <circle cx="55" cy="55" r={R} fill="none" strokeWidth="10" strokeLinecap="round" stroke={colore} strokeDasharray={CIRC}
                strokeDashoffset={CIRC * (1 - (anim ? (montato ? riempi : 0) : riempi))} style={{ transition: anim ? "stroke-dashoffset 1.1s cubic-bezier(.2,.8,.2,1)" : "none", filter: raggiunto ? "drop-shadow(0 0 6px #fcd34d88)" : undefined }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-3xl font-black leading-none tabular-nums" style={{ color: raggiunto ? colore : undefined }}>{mostrato}<span className="text-base text-muted">/{OBIETTIVO}</span></div>
              <div className="text-[10px] text-muted">questa settimana</div>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 font-semibold">{raggiunto ? <Trophy size={16} className="text-yellow-300" /> : <Dumbbell size={16} className="text-red-400" />} {raggiunto ? "Fatto!" : "In corso"}</div>
            <div className="mt-1 text-sm text-muted">{messaggio}</div>
          </div>
        </div>

        <div className="mt-3 flex justify-between gap-1">
          {giorniSett.map((g) => (
            <div key={g.d} className="flex flex-1 flex-col items-center gap-1">
              <div className={`flex h-8 w-full items-center justify-center rounded-lg ${g.oggi ? "ring-2 ring-accent" : ""}`} style={g.fatto ? { background: "#ef4444", color: "#fff" } : { background: "rgba(128,128,128,0.14)", opacity: g.futuro ? 0.5 : 1 }}>
                {g.fatto ? <Dumbbell size={14} /> : null}
              </div>
              <div className="text-[10px] text-muted">{GIORNI_LUNGHI[giornoSettimana(g.d)].slice(0, 1).toUpperCase()}</div>
            </div>
          ))}
        </div>
      </div>

      <GraficoLinea
        titolo="Allenamenti a settimana"
        sotto={`ultime ${SETTIMANE} settimane concluse`}
        grande={variazione === null ? undefined : `${variazione > 0 ? "+" : ""}${variazione}%`}
        grandeColore={variazione === null ? undefined : variazione >= 0 ? "#4ade80" : "#f87171"}
        colore="#ef4444"
        punti={settimane.map((s) => ({ etichetta: breve(s.inizio), v: s.n }))}
        yMin={0}
        yMax={yMax}
        passo={yMax > 6 ? 2 : 1}
        riferimento={{ v: OBIETTIVO, etichetta: `obiettivo ${OBIETTIVO}` }}
      />
      <TessereKpi
        voci={[
          { icona: <Dumbbell size={14} />, titolo: "Questa settimana", valore: `${questa}`, unita: `/${OBIETTIVO}`, colore: "#ef4444" },
          { icona: <Flame size={14} />, titolo: "Serie", valore: `${dettaglio.inCorso}`, unita: dettaglio.inCorso === 1 ? " sett." : " sett.", colore: "#ffb340" },
          { icona: <Footprints size={14} />, titolo: "Corse", valore: `${corse}`, colore: "#38bdf8" },
          { icona: <Dumbbell size={14} />, titolo: "Palestra e altro", valore: `${palestra + altro}`, colore: "#ef4444" },
        ]}
      />
    </div>
  );
}

