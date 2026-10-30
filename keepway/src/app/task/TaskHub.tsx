"use client";

import { BellRing, CalendarPlus, Dumbbell, ListPlus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { GIORNI_LUNGHI } from "@/lib/date";
import { giorniTra } from "@/lib/eventi";
import { useStore } from "@/lib/store";
import type { Evento, Task } from "@/lib/tipi";
import { RigaEvento } from "../components/AgendaBox";
import AreaIcona from "../components/AreaIcona";
import FormAllenamento from "./FormAllenamento";
import FormEvento from "./FormEvento";
import FormTask from "./FormTask";

type Modo =
  | { tipo: "task"; task: Task | null }
  | { tipo: "allenamento" }
  | { tipo: "promemoria" | "appuntamento"; evento: Evento | null };

const quando = (t: Task) =>
  t.ricorrenza.tipo === "giornaliera"
    ? "ogni giorno"
    : t.ricorrenza.tipo === "settimana"
      ? t.ricorrenza.giorni.map((g) => GIORNI_LUNGHI[g].slice(0, 3)).join(", ")
      : t.ricorrenza.data;

// I quattro riquadri grandi, con la loro icona.
const RIQUADRI = [
  { id: "task", nome: "Nuova task", sotto: "abitudine o cosa da fare", Icona: ListPlus, classe: "from-amber-500/30 text-amber-300" },
  { id: "allenamento", nome: "Allenamento", sotto: "corsa, palestra, freddo…", Icona: Dumbbell, classe: "from-red-500/30 text-red-300" },
  { id: "promemoria", nome: "Promemoria", sotto: "una cosa da ricordare", Icona: BellRing, classe: "from-sky-500/30 text-sky-300" },
  { id: "appuntamento", nome: "Appuntamento", sotto: "dottore, dentista, psicologa…", Icona: CalendarPlus, classe: "from-violet-500/30 text-violet-300" },
] as const;

export default function TaskHub() {
  const { pronto, stato, oggi, salvaTask } = useStore();
  const [modo, setModo] = useState<Modo | null>(null);
  if (!pronto) return null;

  const apri = (id: (typeof RIQUADRI)[number]["id"]) =>
    setModo(id === "task" ? { tipo: "task", task: null } : id === "allenamento" ? { tipo: "allenamento" } : { tipo: id, evento: null });
  const chiudi = () => setModo(null);

  // Appuntamenti e promemoria che devono ancora succedere (o promemoria scaduti non fatti)
  const prossimi = stato.eventi
    .filter((e) => !e.fatto && (e.data >= oggi || e.tipo === "promemoria"))
    .sort((a, b) => a.data.localeCompare(b.data) || (a.ora ?? "").localeCompare(b.ora ?? ""));

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-bold">Task</h1>

      <div className="grid grid-cols-2 gap-3">
        {RIQUADRI.map(({ id, nome, sotto, Icona, classe }) => (
          <button
            key={id}
            data-suono="via"
            onClick={() => apri(id)}
            className={`flex flex-col items-start gap-3 rounded-3xl bg-gradient-to-br ${classe.split(" ")[0]} to-card p-4 text-left ring-1 ring-white/10`}
          >
            <span className={`rounded-2xl bg-black/25 p-2.5 ${classe.split(" ")[1]}`}><Icona size={26} strokeWidth={1.8} /></span>
            <span>
              <span className="block text-lg font-bold leading-tight">{nome}</span>
              <span className="block text-xs text-muted">{sotto}</span>
            </span>
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Appuntamenti e promemoria</h2>
          <Link href="/turni/" className="text-sm text-accent">Calendario</Link>
        </div>
        {prossimi.length === 0 && <p className="text-sm text-muted">Niente in programma.</p>}
        {prossimi.map((e) => (
          <RigaEvento key={e.id} e={e} oggi={oggi} conData={giorniTra(oggi, e.data) > 0} alTocco={() => setModo({ tipo: e.tipo, evento: e })} />
        ))}
      </div>

      {stato.aree.map((a) => {
        const lista = stato.task.filter((t) => t.areaId === a.id);
        return (
          <div key={a.id} className="space-y-2">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide" style={{ color: a.colore }}>
              <AreaIcona nome={a.icona} colore={a.colore} size={15} badge={false} /> {a.nome}
            </h2>
            {lista.length === 0 && <p className="text-sm text-muted">Nessuna task.</p>}
            {lista.map((t) => (
              <div key={t.id} className={`flex items-center gap-3 rounded-2xl bg-card p-3 ${t.attiva ? "" : "opacity-50"}`}>
                <AreaIcona nome={t.icona ?? a.icona} colore={a.colore} size={16} />
                <button onClick={() => setModo({ tipo: "task", task: t })} className="flex-1 text-left">
                  <div className="font-medium">{t.tipo === "stanza" ? "Sistema una stanza (a rotazione)" : t.titolo}</div>
                  <div className="text-xs text-muted">
                    {quando(t)}
                    {t.durataMin ? ` · ${t.durataMin} min` : ""}
                    {t.essenziale ? " · essenziale" : ""}
                  </div>
                </button>
                <span className="text-sm font-bold text-accent">+{t.punti}</span>
                <button
                  onClick={() => salvaTask({ ...t, attiva: !t.attiva })}
                  className={`rounded-full px-3 py-1 text-xs ${t.attiva ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-muted"}`}
                >
                  {t.attiva ? "Attiva" : "Spenta"}
                </button>
              </div>
            ))}
          </div>
        );
      })}

      {modo?.tipo === "task" && <FormTask key={modo.task?.id ?? "nuova"} iniziale={modo.task} onClose={chiudi} />}
      {modo?.tipo === "allenamento" && <FormAllenamento onClose={chiudi} />}
      {(modo?.tipo === "appuntamento" || modo?.tipo === "promemoria") && (
        <FormEvento key={modo.evento?.id ?? modo.tipo} tipo={modo.tipo} iniziale={modo.evento} onClose={chiudi} />
      )}
    </section>
  );
}
