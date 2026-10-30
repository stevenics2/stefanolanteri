"use client";

import { CalendarPlus, BellRing, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { turnoDelGiorno } from "@/lib/carico";
import { dataLunga, MESI_LUNGHI } from "@/lib/date";
import { eventiDelGiorno, prioritaDi } from "@/lib/eventi";
import { finestreLibere, hhmm } from "@/lib/sonno";
import { useStore } from "@/lib/store";
import type { Evento } from "@/lib/tipi";
import { RigaEvento } from "../components/AgendaBox";
import FormEvento from "../task/FormEvento";

const SETTIMANA = ["L", "M", "M", "G", "V", "S", "D"];
const p2 = (n: number) => String(n).padStart(2, "0");

// Colore del turno nella casella: blu = lavoro, viola = doppio, verde = riposo.
function stileTurno(t: string | undefined) {
  if (t === undefined) return "bg-white/5 text-muted";
  if (t === "RD" || t === "R") return "bg-emerald-500/20 text-emerald-200";
  if (t.includes("+")) return "bg-violet-600 text-white";
  return "bg-blue-600 text-white";
}

// Il mese con i turni e i puntini degli appuntamenti. Toccando un giorno vedi i dettagli e puoi aggiungere appuntamenti.
export default function CalendarioMese() {
  const { pronto, stato, oggi } = useStore();
  const [mese, setMese] = useState<{ a: number; m: number } | null>(null);
  const [scelto, setScelto] = useState<string | null>(null);
  const [modulo, setModulo] = useState<{ tipo: "appuntamento" | "promemoria"; evento: Evento | null; data: string } | null>(null);
  if (!pronto) return null;

  const { a, m } = mese ?? { a: Number(oggi.slice(0, 4)), m: Number(oggi.slice(5, 7)) - 1 };
  const vai = (d: number) => {
    const nuovo = new Date(a, m + d, 1);
    setMese({ a: nuovo.getFullYear(), m: nuovo.getMonth() });
    setScelto(null);
  };

  const spazi = (new Date(a, m, 1).getDay() + 6) % 7; // il calendario parte dal lunedì
  const giorni = new Date(a, m + 1, 0).getDate();
  const celle = [...Array<null>(spazi).fill(null), ...Array.from({ length: giorni }, (_, i) => `${a}-${p2(m + 1)}-${p2(i + 1)}`)];

  const sel = scelto ?? (oggi.startsWith(`${a}-${p2(m + 1)}`) ? oggi : null);
  const turnoSel = sel ? turnoDelGiorno(sel) : undefined;
  const eventiSel = sel ? eventiDelGiorno(stato.eventi, sel, "0000-00-00") : [];
  const liberi = sel ? finestreLibere(sel, 8 * 60, 22 * 60 + 30, 30) : [];

  return (
    <div className="space-y-4 px-4 pb-4 pt-4">
      <div className="flex items-center justify-between">
        <button data-suono="indietro" onClick={() => vai(-1)} aria-label="Mese precedente" className="rounded-xl bg-white/10 p-2"><ChevronLeft size={20} /></button>
        <div className="text-lg font-bold capitalize">{MESI_LUNGHI[m]} {a}</div>
        <button data-suono="via" onClick={() => vai(1)} aria-label="Mese successivo" className="rounded-xl bg-white/10 p-2"><ChevronRight size={20} /></button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted">
        {SETTIMANA.map((g, i) => <div key={i}>{g}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {celle.map((d, i) => {
          if (!d) return <div key={i} />;
          const t = turnoDelGiorno(d)?.t;
          const eventi = stato.eventi.filter((e) => e.data === d && !e.fatto);
          return (
            <button
              key={d}
              onClick={() => setScelto(d)}
              className={`flex aspect-[3/4] flex-col items-center justify-between rounded-xl py-1.5 ${stileTurno(t)} ${
                d === sel ? "ring-2 ring-white" : d === oggi ? "ring-2 ring-accent" : ""
              }`}
            >
              <span className="text-[11px] opacity-80">{Number(d.slice(8))}</span>
              <span className="text-sm font-extrabold leading-none">{t === undefined ? "" : t === "1 + 4" ? "1+4" : t}</span>
              <span className="flex h-2 items-center gap-0.5">
                {eventi.slice(0, 3).map((e) => (
                  <span key={e.id} className="h-1.5 w-1.5 rounded-full" style={{ background: prioritaDi(e.priorita).colore }} />
                ))}
              </span>
            </button>
          );
        })}
      </div>

      {sel && (
        <div className="space-y-3 rounded-3xl bg-card p-4">
          <div>
            <div className="text-lg font-bold first-letter:uppercase">{dataLunga(sel)}</div>
            <div className="text-sm text-muted">
              {turnoSel === undefined
                ? "Turni non disponibili per questo giorno"
                : turnoSel.t === "RD" || turnoSel.t === "R"
                  ? `Riposo (${turnoSel.t})`
                  : `Turno ${turnoSel.t}${turnoSel.o ? ` · ${turnoSel.o}` : ""}`}
            </div>
          </div>
          {eventiSel.length === 0 && <p className="text-sm text-muted">Nessun appuntamento.</p>}
          {eventiSel.map((e) => (
            <RigaEvento key={e.id} e={e} oggi={sel} alTocco={() => setModulo({ tipo: e.tipo, evento: e, data: sel })} />
          ))}
          {liberi.length > 0 && <p className="text-xs text-muted">Momenti liberi: {liberi.map((f) => `${hhmm(f.da)}–${hhmm(f.a)}`).join(", ")}</p>}
          <div className="grid grid-cols-2 gap-2">
            <button data-suono="via" onClick={() => setModulo({ tipo: "appuntamento", evento: null, data: sel })} className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-500/20 py-2.5 text-sm font-semibold text-violet-200">
              <CalendarPlus size={16} /> Appuntamento
            </button>
            <button data-suono="via" onClick={() => setModulo({ tipo: "promemoria", evento: null, data: sel })} className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-500/20 py-2.5 text-sm font-semibold text-sky-200">
              <BellRing size={16} /> Promemoria
            </button>
          </div>
        </div>
      )}

      {modulo && (
        <FormEvento key={modulo.evento?.id ?? modulo.tipo + modulo.data} tipo={modulo.tipo} iniziale={modulo.evento} dataIniziale={modulo.data} onClose={() => setModulo(null)} />
      )}
    </div>
  );
}
