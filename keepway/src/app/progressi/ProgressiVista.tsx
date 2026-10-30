"use client";

import { Flame } from "lucide-react";
import { dataPiù, GIORNI_LUNGHI, giornoSettimana } from "@/lib/date";
import { serie } from "@/lib/regole";
import { useStore } from "@/lib/store";
import Livello from "../components/Livello";

export default function ProgressiVista() {
  const { pronto, stato, oggi } = useStore();

  if (!pronto) return null;

  // Punti degli ultimi 7 giorni
  const giorni = Array.from({ length: 7 }, (_, i) => dataPiù(oggi, i - 6));
  const punti = giorni.map((d) => stato.completamenti.filter((c) => c.data === d).reduce((t, c) => t + c.punti + c.bonus, 0) + stato.bonus.filter((b) => b.data === d).reduce((t, b) => t + b.xp, 0));
  const max = Math.max(10, ...punti);

  // Archivio delle prove: ogni task fatta è una prova.
  const prove = stato.task
    .map((t) => {
      const fatte = stato.completamenti.filter((c) => c.taskId === t.id);
      return { t, n: fatte.length, min: fatte.reduce((x, c) => x + c.minuti, 0), serie: serie(t, stato.completamenti, oggi, { vacanza: stato.vacanza }, stato.ignorati) };
    })
    .filter((x) => x.n > 0 || x.t.attiva)
    .sort((a, b) => b.n - a.n);
  const totale = stato.completamenti.length;

  return (
    <section className="space-y-5">
      <h1 className="text-2xl font-bold">Progressi</h1>
      <Livello />

      <div className="rounded-2xl bg-card p-4">
        <div className="text-sm text-muted">Punti negli ultimi 7 giorni</div>
        <div className="mt-3 flex h-28 items-end gap-2">
          {punti.map((p, i) => (
            <div key={giorni[i]} className="flex h-full flex-1 flex-col items-center gap-1">
              <div className="flex w-full flex-1 items-end">
                <div className="w-full rounded-md bg-accent" style={{ height: `${(p / max) * 100}%`, minHeight: p ? 4 : 0 }} />
              </div>
              <div className="text-[10px] text-muted">{GIORNI_LUNGHI[giornoSettimana(giorni[i])].slice(0, 1).toUpperCase()}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Archivio delle prove · {totale}</h2>
        <p className="text-sm text-muted">Prima le prove, poi l&apos;identità. Ogni volta che lo fai, è una prova.</p>
        {prove.map(({ t, n, min, serie: s }) => (
          <div key={t.id} className="flex items-center justify-between rounded-2xl bg-card p-3">
            <div>
              <div className="font-medium">{t.titolo}</div>
              <div className="text-xs text-muted">{n} {n === 1 ? "volta" : "volte"}{min ? ` · ${min} min` : ""}</div>
            </div>
            {s > 0 && <div className="flex items-center gap-1 font-semibold text-accent"><Flame size={18} /> {s}</div>}
          </div>
        ))}
      </div>
    </section>
  );
}
