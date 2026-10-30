"use client";

import Link from "next/link";
import { useState } from "react";
import { caricoGiorno } from "@/lib/carico";
import { dataLunga } from "@/lib/date";
import { èPrevista } from "@/lib/regole";
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
  const { pronto, stato, oggi } = useStore();
  const [mostraTutte, setMostraTutte] = useState(false);
  if (!pronto) return null;

  const carico = caricoGiorno(oggi);
  const ignora = mostraTutte;
  const previste = stato.task.filter((t) => èPrevista(t, oggi, ignora));
  const fatte = previste.filter((t) => stato.completamenti.some((c) => c.taskId === t.id && c.data === oggi)).length;

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Oggi</h1>
        <p className="text-muted first-letter:uppercase">{dataLunga(oggi)}</p>
      </div>

      <Livello />
      <SonnoCard />

      {carico === "essenziale" && !mostraTutte && (
        <div className="rounded-2xl border border-sky-500/40 bg-sky-500/10 p-4 text-sm">
          🌙 Giorno dopo la notte: solo l&apos;essenziale, in versione minima. Il resto può aspettare.
        </div>
      )}
      {carico === "nessuna" && !mostraTutte && (
        <div className="rounded-2xl border border-sky-500/40 bg-sky-500/10 p-4 text-sm">
          🌙 Notte + sera: oggi nessuna task. Mangia, dormi, recupera. Le serie non si rompono.
        </div>
      )}
      {carico !== "normale" && (
        <button onClick={() => setMostraTutte((v) => !v)} className="text-sm text-muted underline">
          {mostraTutte ? "Mostra solo l'essenziale" : "Mostra comunque le task di oggi"}
        </button>
      )}

      {previste.length > 0 && (
        <div className="text-sm text-muted">
          {fatte}/{previste.length} fatte oggi
        </div>
      )}

      {FASCE.map((f) => {
        const lista = previste.filter((t) => t.fascia === f.id);
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

      {previste.length === 0 && carico === "normale" && (
        <p className="text-muted">
          Nessuna task per oggi. <Link href="/task" className="text-accent underline">Aggiungine una</Link>.
        </p>
      )}
    </section>
  );
}
