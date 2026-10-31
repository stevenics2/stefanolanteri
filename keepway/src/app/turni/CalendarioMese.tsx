"use client";

import Presenza from "../components/Presenza";
import { BellRing, CalendarPlus, ChevronLeft, ChevronRight, Pencil } from "lucide-react";
import { useState } from "react";
import { giornoEffettivo, violazioniDa, type GiornoEffettivo } from "@/lib/calendario";
import { dataLunga, MESI_LUNGHI } from "@/lib/date";
import { eventiDelGiorno, prioritaDi } from "@/lib/eventi";
import { finestreLibere, hhmm } from "@/lib/sonno";
import { useStore } from "@/lib/store";
import type { Evento } from "@/lib/tipi";
import { RigaEvento } from "../components/AgendaBox";
import FormEvento from "../task/FormEvento";
import { Banda, bandaDi } from "./banda";
import MenuTurno from "./MenuTurno";

const SETTIMANA = ["L", "M", "M", "G", "V", "S", "D"];
const p2 = (n: number) => String(n).padStart(2, "0");

// Colore della casella: blu = lavoro, viola = notte + sera, verde = riposo, ambra = assenza, grigio = non ho i turni.
function stileTurno(g: GiornoEffettivo | undefined) {
  if (!g) return "bg-ov/5 text-muted";
  if (g.modifica?.tipo === "assenza") return "bg-amber-500/25 text-amber-100";
  if (g.riposo) return "bg-emerald-500/20 text-emerald-200";
  if (g.codici.includes("1") && g.codici.includes("4")) return "bg-violet-600 text-white";
  return "bg-blue-600 text-white";
}

// Cosa scrivere nella casella (poco spazio): 3, 2+3, R, FER...
function testoCasella(g: GiornoEffettivo | undefined) {
  if (!g) return "";
  if (g.modifica?.tipo === "assenza") return (g.modifica.assenza ?? "altro").slice(0, 3).toUpperCase();
  if (g.riposo) return g.codiceBase === "RD" && !g.modifica ? "RD" : "R";
  return g.codici.join("+");
}

// Il mese con i turni e i puntini degli appuntamenti. Toccando un giorno vedi i dettagli, modifichi il turno e aggiungi appuntamenti.
export default function CalendarioMese() {
  const { pronto, stato, oggi } = useStore();
  const [mese, setMese] = useState<{ a: number; m: number } | null>(null);
  const [scelto, setScelto] = useState<string | null>(null);
  const [modulo, setModulo] = useState<{ tipo: "appuntamento" | "promemoria"; evento: Evento | null; data: string } | null>(null);
  const [menu, setMenu] = useState<string | null>(null);
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
  const geSel = sel ? giornoEffettivo(sel) : undefined;
  const eventiSel = sel ? eventiDelGiorno(stato.eventi, sel, "0000-00-00") : [];
  const liberi = sel ? finestreLibere(sel, 8 * 60, 22 * 60 + 30, 30) : [];
  const problemi = violazioniDa(oggi);
  const giorniProblema = new Set(problemi.flatMap((v) => [v.primo.data, v.secondo.data]));
  const problemiSel = sel ? problemi.filter((v) => v.primo.data === sel || v.secondo.data === sel) : [];

  return (
    <div className="space-y-4 px-4 pb-4 pt-4">
      <div className="flex items-center justify-between">
        <button data-suono="indietro" onClick={() => vai(-1)} aria-label="Mese precedente" className="rounded-xl bg-ov/10 p-2"><ChevronLeft size={20} /></button>
        <div className="text-lg font-bold capitalize">{MESI_LUNGHI[m]} {a}</div>
        <button data-suono="via" onClick={() => vai(1)} aria-label="Mese successivo" className="rounded-xl bg-ov/10 p-2"><ChevronRight size={20} /></button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted">
        {SETTIMANA.map((g, i) => <div key={i}>{g}</div>)}
      </div>
      <div key={`${a}-${m}`} className="dissolve grid grid-cols-7 gap-1">
        {celle.map((d, i) => {
          if (!d) return <div key={i} />;
          const g = giornoEffettivo(d);
          const eventi = stato.eventi.filter((e) => e.data === d && !e.fatto);
          const banda = bandaDi(g?.modifica);
          return (
            <button
              key={d}
              onClick={() => setScelto(d)}
              className={`relative flex aspect-[3/4] flex-col items-center justify-between overflow-hidden rounded-xl pt-1.5 ${stileTurno(g)} ${
                d === sel ? "ring-2 ring-white" : d === oggi ? "ring-2 ring-accent" : ""
              }`}
            >
              <span className="text-[11px] opacity-80">{Number(d.slice(8))}</span>
              <span className="text-sm font-extrabold leading-none">{testoCasella(g)}</span>
              <span className="flex h-2.5 items-center gap-0.5">
                {eventi.slice(0, 3).map((e) => (
                  <span key={e.id} className="h-1.5 w-1.5 rounded-full" style={{ background: prioritaDi(e.priorita).colore }} />
                ))}
              </span>
              {banda && <span className={`absolute inset-x-0 bottom-0 h-1 ${banda.classe}`} />}
              {giorniProblema.has(d) && <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-black text-white">!</span>}
            </button>
          );
        })}
      </div>

      {sel && (
        <div key={sel} className="entra space-y-3 rounded-3xl bg-card p-4">
          <div>
            <div className="text-lg font-bold first-letter:uppercase">{dataLunga(sel)}</div>
            {geSel ? (
              <div className="mt-1 overflow-hidden rounded-xl">
                <div className={`px-3 py-2 ${stileTurno(geSel)}`}>
                  <div>
                    <span className="font-bold">{geSel.etichetta}</span>
                    {!geSel.straordinario && geSel.orario && <span className="ml-2 text-sm opacity-90">{geSel.orario}</span>}
                  </div>
                  {geSel.straordinario?.orari.map((o) => <div key={o} className="text-sm opacity-90">{o}</div>)}
                </div>
                <Banda m={geSel.modifica} />
              </div>
            ) : (
              <div className="text-sm text-muted">Turni non disponibili per questo giorno</div>
            )}
          </div>

          {problemiSel.map((v, i) => (
            <p key={i} className="rounded-xl border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-100"><b>⚠ Attenzione: Conflitto turni.</b> {v.testo}</p>
          ))}

          {geSel && (
            <button data-suono="via" onClick={() => setMenu(sel)} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-ov/10 py-2.5 text-sm font-semibold">
              <Pencil size={16} /> Modifica turno (cambio, straordinario, assenza)
            </button>
          )}

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

      <Presenza dato={modulo} ms={340}>
        {(m) => <FormEvento key={m.evento?.id ?? m.tipo + m.data} tipo={m.tipo} iniziale={m.evento} dataIniziale={m.data} onClose={() => setModulo(null)} />}
      </Presenza>
      <Presenza dato={menu} ms={340}>
        {(d) => <MenuTurno key={d} data={d} onClose={() => setMenu(null)} />}
      </Presenza>
    </div>
  );
}
