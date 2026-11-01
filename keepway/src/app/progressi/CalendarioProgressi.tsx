"use client";

import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { dataPiù, giornoSettimana, MESI_LUNGHI } from "@/lib/date";
import { dataBreve } from "@/lib/eventi";
import { giornata } from "@/lib/regole";
import { useStore } from "@/lib/store";
import { èAllenamento } from "@/lib/traguardi";

const SETTIMANA = ["L", "M", "M", "G", "V", "S", "D"];

const spostaMese = (anno: number, mese: number, delta: number) => {
  const d = new Date(anno, mese + delta, 1);
  return { anno: d.getFullYear(), mese: d.getMonth() };
};

// Il mese a colpo d'occhio: ogni giorno è un quadratino; oro = tutte le task fatte. Un puntino se ti sei allenato. Toccando si vede il giorno.
export default function CalendarioProgressi() {
  const { stato, oggi } = useStore();
  const [a0, m0] = oggi.split("-").map(Number);
  const [vista, setVista] = useState({ anno: a0, mese: m0 - 1 });
  const [scelto, setScelto] = useState<string | null>(null);

  const primo = `${vista.anno}-${String(vista.mese + 1).padStart(2, "0")}-01`;
  const giorniNelMese = new Date(vista.anno, vista.mese + 1, 0).getDate();
  const vuotiPrima = (giornoSettimana(primo) + 6) % 7;
  const inizioDati = stato.completamenti.reduce((m, c) => (c.data < m ? c.data : m), oggi);
  const idAllenamento = new Set(stato.task.filter(èAllenamento).map((t) => t.id));

  const celle = Array.from({ length: giorniNelMese }, (_, i) => {
    const data = dataPiù(primo, i);
    const g = giornata(stato, data);
    const fatteTutte = g.previste.length > 0 && g.fatte.length === g.previste.length;
    const fatte = stato.completamenti.filter((c) => c.data === data);
    return {
      data,
      n: i + 1,
      futuro: data > oggi,
      senzaDati: data < inizioDati,
      previste: g.previste.length,
      fatte: g.fatte.length,
      fatteTotali: fatte.length, // anche task non previste quel giorno: contano lo stesso
      piena: fatteTutte,
      allenato: fatte.some((c) => idAllenamento.has(c.taskId)),
    };
  });
  const faiTotale = celle.filter((c) => c.piena).length;
  const mostrato = scelto ? celle.find((c) => c.data === scelto) ?? null : null;
  const dettaglio = mostrato
    ? {
        fatte: stato.completamenti.filter((c) => c.data === mostrato.data).map((c) => ({ id: c.id, titolo: stato.task.find((t) => t.id === c.taskId)?.titolo ?? "Task eliminata", minuti: c.minuti })),
        mancate: giornata(stato, mostrato.data).previste.filter((t) => !stato.completamenti.some((c) => c.taskId === t.id && c.data === mostrato.data)).map((t) => t.titolo),
      }
    : null;

  const colore = (c: (typeof celle)[number]) => {
    if (c.futuro || c.senzaDati) return "rgba(128,128,128,0.08)";
    if (c.piena) return "#fcd34d";
    if (c.previste === 0) return c.fatteTotali > 0 ? "rgba(34,197,94,0.6)" : "rgba(128,128,128,0.14)";
    const r = Math.max(c.fatte, c.fatteTotali > c.previste ? c.previste : 0) / c.previste;
    if (r === 0) return "rgba(128,128,128,0.18)";
    if (r < 0.5) return "rgba(245,165,36,0.45)";
    return "rgba(34,197,94,0.6)";
  };

  return (
    <div className="rounded-2xl bg-card p-4">
      <div className="flex items-center justify-between">
        <button aria-label="Mese precedente" data-suono="nessuno" onClick={() => { setVista((v) => spostaMese(v.anno, v.mese, -1)); setScelto(null); }} className="rounded-full bg-ov/10 p-2"><ChevronLeft size={16} /></button>
        <div className="text-center">
          <div className="text-lg font-bold first-letter:uppercase">{MESI_LUNGHI[vista.mese]} {vista.anno}</div>
          <div className="text-xs text-muted">{faiTotale} {faiTotale === 1 ? "giornata piena" : "giornate piene"}</div>
        </div>
        <button aria-label="Mese successivo" data-suono="nessuno" disabled={vista.anno === a0 && vista.mese === m0 - 1} onClick={() => { setVista((v) => spostaMese(v.anno, v.mese, 1)); setScelto(null); }} className="rounded-full bg-ov/10 p-2 disabled:opacity-30"><ChevronRight size={16} /></button>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1.5 text-center text-[10px] text-muted">{SETTIMANA.map((x, i) => <div key={i}>{x}</div>)}</div>
      <div key={`${vista.anno}-${vista.mese}`} className="stagger mt-1 grid grid-cols-7 gap-1.5">
        {Array.from({ length: vuotiPrima }, (_, i) => <div key={`v${i}`} />)}
        {celle.map((c) => (
          <button
            key={c.data}
            disabled={c.futuro}
            onClick={() => setScelto(scelto === c.data ? null : c.data)}
            className={`relative flex aspect-square items-center justify-center rounded-lg text-xs font-semibold transition-transform active:scale-90 ${c.data === oggi ? "ring-2 ring-accent" : ""} ${scelto === c.data ? "outline outline-2 outline-foreground" : ""}`}
            style={{ background: colore(c), color: c.piena ? "#1a1a1a" : undefined }}
          >
            {c.piena ? <Check size={15} strokeWidth={3} /> : c.n}
            {c.allenato && <span className="absolute bottom-0.5 h-1.5 w-1.5 rounded-full bg-red-500" />}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted">
        <Legenda colore="#fcd34d" testo="tutte fatte" />
        <Legenda colore="rgba(34,197,94,0.6)" testo="quasi" />
        <Legenda colore="rgba(245,165,36,0.45)" testo="qualcosa" />
        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-red-500" /> allenamento</span>
      </div>

      {mostrato && dettaglio && (
        <div className="entra mt-3 rounded-xl bg-ov/5 p-3 text-sm">
          <div className="font-semibold first-letter:uppercase">{dataBreve(mostrato.data)} · {mostrato.previste > 0 ? `${mostrato.fatte}/${mostrato.previste}` : `${mostrato.fatteTotali} fatte`}</div>
          {dettaglio.fatte.length === 0 && dettaglio.mancate.length === 0 && <div className="mt-1 text-muted">Niente in programma.</div>}
          {dettaglio.fatte.map((f) => <div key={f.id} className="mt-1 flex items-center gap-2"><Check size={14} className="text-green-400" /> {f.titolo}{f.minuti ? <span className="text-xs text-muted">· {f.minuti} min</span> : null}</div>)}
          {dettaglio.mancate.map((m) => <div key={m} className="mt-1 flex items-center gap-2 text-muted"><span className="h-3.5 w-3.5 rounded-full border border-ov/30" /> {m}</div>)}
        </div>
      )}
    </div>
  );
}

function Legenda({ colore, testo }: { colore: string; testo: string }) {
  return <span className="flex items-center gap-1"><span className="h-3 w-3 rounded" style={{ background: colore }} /> {testo}</span>;
}
