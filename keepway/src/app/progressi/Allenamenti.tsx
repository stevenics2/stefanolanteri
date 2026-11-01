"use client";

import { Dumbbell, Flame, Footprints, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { dataPiù, giornoSettimana, GIORNI_LUNGHI, inizioSettimana } from "@/lib/date";
import { dataBreve } from "@/lib/eventi";
import { tipoDellaTask } from "@/lib/saluteAuto";
import { useStore } from "@/lib/store";
import { ALLENAMENTI_A_SETTIMANA as OBIETTIVO, èAllenamento, settimaneDiAllenamento } from "@/lib/traguardi";
import { useContaSu } from "@/lib/useContaSu";

const R = 46;
const CIRC = 2 * Math.PI * R;
const SETTIMANE = 8;

// Gli allenamenti: l'obiettivo è almeno 3 a settimana. Più ti alleni, più sei in salute: oltre il 3 l'anello diventa oro.
export default function Allenamenti() {
  const { stato, oggi } = useStore();
  const anim = stato.impostazioni.animazioni;
  const ids = new Map(stato.task.filter(èAllenamento).map((t) => [t.id, t]));
  const fatti = stato.completamenti.filter((c) => ids.has(c.taskId));
  const lunedi = inizioSettimana(oggi);
  const dettaglio = settimaneDiAllenamento(stato, oggi);

  const settimane = Array.from({ length: SETTIMANE }, (_, i) => {
    const inizio = dataPiù(lunedi, (i - (SETTIMANE - 1)) * 7);
    const fine = dataPiù(inizio, 6);
    const n = fatti.filter((c) => c.data >= inizio && c.data <= fine).length;
    return { inizio, n, corrente: inizio === lunedi };
  });
  const questa = settimane[SETTIMANE - 1].n;
  const max = Math.max(OBIETTIVO + 1, ...settimane.map((s) => s.n));
  const mancano = Math.max(0, OBIETTIVO - questa);
  const giorniRimasti = 7 - ((giornoSettimana(oggi) + 6) % 7); // oggi compreso, fino a domenica
  const raggiunto = questa >= OBIETTIVO;

  const contaTipo = (tipo: "corsa" | "palestra" | "altro") => fatti.filter((c) => (tipoDellaTask(ids.get(c.taskId)!) ?? "altro") === tipo).length;
  const corse = contaTipo("corsa");
  const palestra = contaTipo("palestra");
  const altro = contaTipo("altro");
  const minuti = fatti.reduce((t, c) => t + c.minuti, 0);

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

      <div className="rounded-2xl bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted">Ultime {SETTIMANE} settimane</div>
          <div className="flex items-center gap-1 text-sm font-semibold" style={{ color: dettaglio.inCorso > 0 ? "#ffb340" : undefined }}><Flame size={15} /> {dettaglio.inCorso} {dettaglio.inCorso === 1 ? "settimana" : "settimane"} di fila</div>
        </div>
        <div className="relative mt-3 flex h-28 items-end gap-2">
          <div className="pointer-events-none absolute inset-x-0 border-t border-dashed border-green-400/60" style={{ bottom: `${(OBIETTIVO / max) * 100}%` }}>
            <span className="absolute -top-2 right-0 z-10 rounded bg-card px-1 text-[10px] text-green-400">obiettivo {OBIETTIVO}</span>
          </div>
          {settimane.map((s) => (
            <div key={s.inizio} className="flex h-full flex-1 flex-col items-center gap-1">
              <div className="flex w-full flex-1 items-end">
                <div className="barra-sale w-full rounded-md" style={{ height: `${(s.n / max) * 100}%`, minHeight: s.n ? 4 : 0, background: s.n >= OBIETTIVO ? "#22c55e" : s.corrente ? "#ef4444" : "#f5a524", opacity: s.corrente ? 1 : 0.85 }} />
              </div>
              <div className="text-[10px] tabular-nums text-muted">{s.n}</div>
            </div>
          ))}
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-muted"><span>dal {dataBreve(settimane[0].inizio)}</span><span>questa settimana →</span></div>
        {dettaglio.migliore > 0 && <div className="mt-2 text-xs text-muted">La tua serie migliore: {dettaglio.migliore} {dettaglio.migliore === 1 ? "settimana" : "settimane"} di fila con almeno {OBIETTIVO} allenamenti.</div>}
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <Numero icona={<Footprints size={16} />} valore={corse} etichetta="corse" colore="#38bdf8" />
        <Numero icona={<Dumbbell size={16} />} valore={palestra + altro} etichetta="palestra e altro" colore="#ef4444" />
        <Numero icona={<Flame size={16} />} valore={minuti} etichetta="minuti in tutto" colore="#ffb340" />
      </div>
    </div>
  );
}

function Numero({ icona, valore, etichetta, colore }: { icona: React.ReactNode; valore: number; etichetta: string; colore: string }) {
  return (
    <div className="rounded-2xl bg-card p-3">
      <div className="mx-auto flex w-fit items-center gap-1.5" style={{ color: colore }}>{icona}<span className="text-xl font-black tabular-nums">{valore}</span></div>
      <div className="mt-0.5 text-[10px] text-muted">{etichetta}</div>
    </div>
  );
}
