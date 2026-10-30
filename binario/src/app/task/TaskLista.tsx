"use client";

import { useState } from "react";
import { GIORNI_LUNGHI } from "@/lib/date";
import { useStore } from "@/lib/store";
import type { Task } from "@/lib/tipi";
import TaskForm from "./TaskForm";

const quando = (t: Task) =>
  t.ricorrenza.tipo === "giornaliera"
    ? "ogni giorno"
    : t.ricorrenza.tipo === "settimana"
      ? t.ricorrenza.giorni.map((g) => GIORNI_LUNGHI[g].slice(0, 3)).join(", ")
      : t.ricorrenza.data;

export default function TaskLista() {
  const { pronto, stato, salvaTask } = useStore();
  const [modifica, setModifica] = useState<Task | null>(null);
  const [nuova, setNuova] = useState(false);
  if (!pronto) return null;

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Task</h1>
        <button onClick={() => setNuova(true)} className="rounded-full bg-accent px-4 py-2 font-bold text-black">
          + Nuova
        </button>
      </div>

      {stato.aree.map((a) => {
        const lista = stato.task.filter((t) => t.areaId === a.id);
        return (
          <div key={a.id} className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: a.colore }}>
              {a.icona} {a.nome}
            </h2>
            {lista.length === 0 && <p className="text-sm text-muted">Nessuna task.</p>}
            {lista.map((t) => (
              <div key={t.id} className={`flex items-center gap-3 rounded-2xl bg-card p-3 ${t.attiva ? "" : "opacity-50"}`}>
                <button onClick={() => setModifica(t)} className="flex-1 text-left">
                  <div className="font-medium">{t.titolo}</div>
                  <div className="text-xs text-muted">
                    {quando(t)}
                    {t.durataMin ? ` · ${t.durataMin} min` : ""}
                    {t.essenziale ? " · essenziale" : ""} · {t.punti} XP
                  </div>
                </button>
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

      {(nuova || modifica) && (
        <TaskForm
          key={modifica?.id ?? "nuova"}
          iniziale={modifica}
          onClose={() => {
            setNuova(false);
            setModifica(null);
          }}
        />
      )}
    </section>
  );
}
