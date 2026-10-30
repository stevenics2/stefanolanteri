"use client";

import { CalendarClock, Check, CalendarRange, Undo2 } from "lucide-react";
import { dataBreve, domani, eventiDelGiorno, giorniTra, inArrivo, prioritaDi, traQuanto } from "@/lib/eventi";
import { useStore } from "@/lib/store";
import type { Evento } from "@/lib/tipi";
import AreaIcona from "./AreaIcona";

// Una riga: icona, titolo, ora e luogo, priorità. I promemoria si spuntano.
export function RigaEvento({ e, oggi, conData = false, alTocco, senzaOra = false }: { e: Evento; oggi: string; conData?: boolean; alTocco?: () => void; senzaOra?: boolean }) {
  const { segnaEvento } = useStore();
  const pr = prioritaDi(e.priorita);
  const inRitardo = e.tipo === "promemoria" && !e.fatto && giorniTra(e.data, oggi) > 0;
  // L'ora sta già accanto al titolo quando non si mostra la data; con la data va nella riga sotto.
  const orario = e.ora ? (conData ? e.ora : "") : e.tipo === "promemoria" ? "" : "Tutto il giorno";
  const quando = [
    conData ? `${traQuanto(oggi, e.data)} · ${dataBreve(e.data)}` : inRitardo ? `In ritardo dal ${dataBreve(e.data)}` : "",
    orario,
    e.luogo,
  ].filter(Boolean);

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-card p-3" style={{ borderLeft: `4px solid ${pr.colore}` }}>
      <button onClick={alTocco} disabled={!alTocco} className="flex flex-1 items-center gap-3 text-left">
        <AreaIcona nome={e.icona} colore={pr.colore} size={16} />
        <span className="min-w-0 flex-1">
          <span className={`block font-semibold ${e.fatto ? "line-through opacity-60" : ""}`}>
            {e.ora && !conData && !senzaOra && <span className="mr-2 font-extrabold text-accent">{e.ora}</span>}
            {e.titolo}
          </span>
          {quando.length > 0 && <span className={`block text-xs ${inRitardo ? "text-red-300" : "text-muted"}`}>{quando.join(" · ")}</span>}
        </span>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${pr.classe}`}>{pr.nome}</span>
      </button>
      {e.tipo === "promemoria" && (
        <button
          data-suono={e.fatto ? "indietro" : "ok"}
          onClick={() => segnaEvento(e.id, !e.fatto)}
          aria-label={e.fatto ? "Rimetti da fare" : "Fatto"}
          className={`shrink-0 rounded-xl p-2 ${e.fatto ? "bg-white/10 text-muted" : "bg-emerald-500/20 text-emerald-300"}`}
        >
          {e.fatto ? <Undo2 size={18} /> : <Check size={18} />}
        </button>
      )}
    </div>
  );
}

function Titolo({ icona: Icona, testo }: { icona: typeof CalendarClock; testo: string }) {
  return (
    <h2 className="flex items-center gap-2 text-lg font-bold">
      <Icona size={20} className="text-accent" /> {testo}
    </h2>
  );
}

// Appuntamenti e promemoria di oggi.
export function AgendaOggi({ onModifica }: { onModifica?: (e: Evento) => void }) {
  const { stato, oggi } = useStore();
  const lista = eventiDelGiorno(stato.eventi, oggi, oggi).filter((e) => !(e.tipo === "promemoria" && e.fatto && e.data < oggi));
  if (lista.length === 0) return null;
  return (
    <div className="space-y-2">
      <Titolo icona={CalendarClock} testo="Oggi hai:" />
      {lista.map((e) => (
        <RigaEvento key={e.id} e={e} oggi={oggi} alTocco={onModifica && (() => onModifica(e))} />
      ))}
    </div>
  );
}

// Appuntamenti e promemoria di domani.
export function AgendaDomani({ onModifica }: { onModifica?: (e: Evento) => void }) {
  const { stato, oggi } = useStore();
  const lista = eventiDelGiorno(stato.eventi, domani(oggi), oggi);
  if (lista.length === 0) return null;
  return (
    <div className="space-y-2">
      <Titolo icona={CalendarClock} testo="Domani hai:" />
      {lista.map((e) => (
        <RigaEvento key={e.id} e={e} oggi={oggi} alTocco={onModifica && (() => onModifica(e))} />
      ))}
    </div>
  );
}

// Casella informativa: gli appuntamenti più in là, nel periodo di anticipo scelto (es. "Tra una settimana hai il dentista").
export function InArrivo({ onModifica }: { onModifica?: (e: Evento) => void }) {
  const { stato, oggi } = useStore();
  const lista = inArrivo(stato.eventi, oggi);
  if (lista.length === 0) return null;
  return (
    <div className="space-y-2">
      <Titolo icona={CalendarRange} testo="In arrivo:" />
      {lista.map((e) => (
        <RigaEvento key={e.id} e={e} oggi={oggi} conData alTocco={onModifica && (() => onModifica(e))} />
      ))}
    </div>
  );
}
