"use client";

import { Moon, Plane, Undo2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { caricoGiorno } from "@/lib/carico";
import { dataLunga } from "@/lib/date";
import { èIgnorata, èPrevista, inVacanza } from "@/lib/regole";
import { titoloTask } from "@/lib/stanze";
import { useStore } from "@/lib/store";
import type { Fascia } from "@/lib/tipi";
import Livello from "../components/Livello";
import SonnoCard from "../components/SonnoCard";
import TaskCard from "../components/TaskCard";

const FASCE: { id: Fascia; etichetta: string }[] = [
  { id: "mattina", etichetta: "Mattina" },
  { id: "pomeriggio", etichetta: "Pomeriggio" },
  { id: "sera", etichetta: "Sera" },
  { id: "qualsiasi", etichetta: "Quando vuoi" },
];

export default function OggiVista() {
  const { pronto, stato, oggi, setVacanza, ripristina } = useStore();
  const [mostraTutte, setMostraTutte] = useState(false);
  if (!pronto) return null;

  const carico = caricoGiorno(oggi);
  const fuoriCasa = inVacanza(stato.vacanza, oggi);
  const previste = stato.task.filter((t) => èPrevista(t, oggi, { vacanza: stato.vacanza, ignoraCarico: mostraTutte }));
  const ignorate = previste.filter((t) => èIgnorata(stato.ignorati, t.id, oggi));
  const daFare = previste.filter((t) => !èIgnorata(stato.ignorati, t.id, oggi));
  const fatte = daFare.filter((t) => stato.completamenti.some((c) => c.taskId === t.id && c.data === oggi)).length;

  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Oggi</h1>
          <p className="text-muted first-letter:uppercase">{dataLunga(oggi)}</p>
        </div>
        {!fuoriCasa && (
          <button
            onClick={() => setVacanza({ dal: oggi, al: null })}
            className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-sm text-muted"
          >
            <Plane size={15} /> Fuori casa
          </button>
        )}
      </div>

      {fuoriCasa && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-violet-500/40 bg-violet-500/10 p-4 text-sm">
          <span className="inline-flex items-center gap-2">
            <Plane size={18} className="shrink-0" /> Sei fuori casa: niente task di casa. Il resto continua.
          </span>
          <button onClick={() => setVacanza(null)} className="shrink-0 rounded-lg bg-white/10 px-3 py-1.5">
            Sono a casa
          </button>
        </div>
      )}

      <Livello />
      <SonnoCard />

      {carico === "essenziale" && !mostraTutte && (
        <div className="flex items-start gap-2 rounded-2xl border border-sky-500/40 bg-sky-500/10 p-4 text-sm">
          <Moon size={18} className="mt-0.5 shrink-0" /> Giorno dopo la notte: solo l&apos;essenziale, in versione minima. Il resto può aspettare.
        </div>
      )}
      {carico === "nessuna" && !mostraTutte && (
        <div className="flex items-start gap-2 rounded-2xl border border-sky-500/40 bg-sky-500/10 p-4 text-sm">
          <Moon size={18} className="mt-0.5 shrink-0" /> Notte + sera: oggi nessuna task. Mangia, dormi, recupera. Le serie non si rompono.
        </div>
      )}
      {carico !== "normale" && (
        <button onClick={() => setMostraTutte((v) => !v)} className="text-sm text-muted underline">
          {mostraTutte ? "Mostra solo l'essenziale" : "Mostra comunque le task di oggi"}
        </button>
      )}

      {daFare.length > 0 && (
        <div className="text-sm text-muted">
          {fatte}/{daFare.length} fatte oggi
        </div>
      )}

      {FASCE.map((f) => {
        const lista = daFare.filter((t) => t.fascia === f.id);
        if (lista.length === 0) return null;
        return (
          <div key={f.id} className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{f.etichetta}</h2>
            {lista.map((t) => (
              <TaskCard key={t.id} task={t} soloMinima={carico === "essenziale" && !mostraTutte} />
            ))}
          </div>
        );
      })}

      {ignorate.length > 0 && (
        <div className="space-y-1 rounded-2xl bg-card p-4 text-sm">
          <div className="text-muted">Saltate oggi (domani si ripropongono)</div>
          {ignorate.map((t) => (
            <div key={t.id} className="flex items-center justify-between">
              <span>{titoloTask(t, stato, oggi)}</span>
              <button onClick={() => ripristina(t.id)} className="inline-flex items-center gap-1 text-muted">
                <Undo2 size={14} /> Rimetti
              </button>
            </div>
          ))}
        </div>
      )}

      {previste.length === 0 && carico === "normale" && (
        <p className="text-muted">
          Nessuna task per oggi. <Link href="/task" className="text-accent underline">Aggiungine una</Link>.
        </p>
      )}
    </section>
  );
}
