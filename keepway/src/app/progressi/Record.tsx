"use client";

import { CalendarDays, Flame, Star, Trophy } from "lucide-react";
import { inizioSettimana } from "@/lib/date";
import { dataBreve } from "@/lib/eventi";
import { useStore } from "@/lib/store";
import { serieMigliore } from "@/lib/traguardi";

// I record personali: il tuo massimo di sempre. Batterli è il modo migliore per sentirsi in crescita.
export default function Record() {
  const { stato, oggi } = useStore();
  const perGiorno = new Map<string, { n: number; xp: number }>();
  const perSett = new Map<string, number>();
  for (const c of stato.completamenti) {
    const g = perGiorno.get(c.data) ?? { n: 0, xp: 0 };
    perGiorno.set(c.data, { n: g.n + 1, xp: g.xp + c.punti + c.bonus });
    perSett.set(inizioSettimana(c.data), (perSett.get(inizioSettimana(c.data)) ?? 0) + 1);
  }
  const migliorGiorno = [...perGiorno.entries()].sort((a, b) => b[1].n - a[1].n || b[1].xp - a[1].xp)[0];
  const migliorSett = [...perSett.entries()].sort((a, b) => b[1] - a[1])[0];
  const migliorXp = [...perGiorno.entries()].sort((a, b) => b[1].xp - a[1].xp)[0];
  let serieTop: { titolo: string; giorni: number } | null = null;
  for (const t of stato.task) {
    const g = serieMigliore(t, stato, oggi);
    if (g > (serieTop?.giorni ?? 0)) serieTop = { titolo: t.titolo, giorni: g };
  }
  if (!migliorGiorno) return null;

  return (
    <div className="space-y-2">
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted"><Trophy size={15} /> I tuoi record</h2>
      <div className="grid grid-cols-2 gap-2">
        <Scheda icona={<Star size={16} />} colore="#fcd34d" titolo="Giorno migliore" valore={`${migliorGiorno[1].n} task`} sotto={dataBreve(migliorGiorno[0])} />
        <Scheda icona={<CalendarDays size={16} />} colore="#7dd3fc" titolo="Settimana migliore" valore={`${migliorSett[1]} task`} sotto={`dal ${dataBreve(migliorSett[0])}`} />
        <Scheda icona={<Flame size={16} />} colore="#ffb340" titolo="Serie più lunga" valore={serieTop ? `${serieTop.giorni} giorni` : "—"} sotto={serieTop?.titolo ?? ""} />
        <Scheda icona={<Trophy size={16} />} colore="#bf8cff" titolo="Più XP in un giorno" valore={`${migliorXp[1].xp} XP`} sotto={dataBreve(migliorXp[0])} />
      </div>
    </div>
  );
}

function Scheda({ icona, colore, titolo, valore, sotto }: { icona: React.ReactNode; colore: string; titolo: string; valore: string; sotto: string }) {
  return (
    <div className="rounded-2xl bg-card p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted"><span style={{ color: colore }}>{icona}</span> {titolo}</div>
      <div className="mt-1 text-xl font-black">{valore}</div>
      <div className="truncate text-xs text-muted first-letter:uppercase">{sotto}</div>
    </div>
  );
}
