"use client";

import { BookOpen, Flame, Flower2 } from "lucide-react";
import { dataPiù, GIORNI_LUNGHI, giornoSettimana } from "@/lib/date";
import { èPrevista, serie } from "@/lib/regole";
import { useStore } from "@/lib/store";
import { serieMigliore, valutaTraguardi } from "@/lib/traguardi";
import { useContaSu } from "@/lib/useContaSu";

const CONFIG = {
  meditazione: { Icona: Flower2, colore: "#bf8cff", titolo: "Meditazione", serieId: "med-serie", tempoId: "med-ore", frase: "Un po' di calma ogni giorno" },
  lettura: { Icona: BookOpen, colore: "#38bdf8", titolo: "Lettura", serieId: "let-serie", tempoId: "let-ore", frase: "Pagina dopo pagina" },
} as const;

const oreTesto = (min: number) => (min >= 60 ? `${Math.floor(min / 60)} h ${min % 60 ? `${String(min % 60).padStart(2, "0")} min` : ""}`.trim() : `${min} min`);

// Una carta per un'abitudine di calma: serie in corso, ultimi 7 giorni, tempo totale e prossimo traguardo.
export default function Abitudine({ id }: { id: keyof typeof CONFIG }) {
  const { stato, oggi } = useStore();
  const c = CONFIG[id];
  const t = stato.task.find((x) => x.id === id);
  const anim = stato.impostazioni.animazioni;
  const fatte = stato.completamenti.filter((x) => x.taskId === id);
  const minuti = fatte.reduce((tot, x) => tot + x.minuti, 0);
  const corrente = t ? serie(t, stato.completamenti, oggi, { vacanza: stato.vacanza }, stato.ignorati) : 0;
  const migliore = t ? serieMigliore(t, stato, oggi) : 0;
  const valutati = valutaTraguardi(stato, oggi);
  const vs = valutati.find((v) => v.id === c.serieId);
  const vt = valutati.find((v) => v.id === c.tempoId);
  const serieMostrata = useContaSu(corrente, anim, 800);

  if (!t) return null;
  const ultimi = Array.from({ length: 7 }, (_, i) => {
    const d = dataPiù(oggi, i - 6);
    const fatto = fatte.some((x) => x.data === d);
    return { d, fatto, prevista: èPrevista(t, d, { vacanza: stato.vacanza }), oggi: d === oggi };
  });
  const sulla7 = ultimi.filter((x) => x.fatto).length;

  return (
    <div className="rounded-2xl bg-card p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-full" style={{ background: `${c.colore}26`, color: c.colore }}><c.Icona size={22} /></div>
        <div className="flex-1">
          <div className="font-semibold">{c.titolo}</div>
          <div className="text-xs text-muted">{c.frase}</div>
        </div>
        <div className="flex items-center gap-1 text-2xl font-black" style={{ color: corrente > 0 ? "#ffb340" : undefined }}>
          <Flame size={22} /> <span className="tabular-nums">{serieMostrata}</span>
        </div>
      </div>

      <div className="mt-3 flex justify-between gap-1">
        {ultimi.map((u) => (
          <div key={u.d} className="flex flex-1 flex-col items-center gap-1">
            <div className={`flex h-8 w-full items-center justify-center rounded-lg text-[10px] font-bold ${u.oggi ? "ring-2 ring-accent" : ""}`} style={u.fatto ? { background: c.colore, color: "#111" } : { background: "rgba(128,128,128,0.14)" }}>
              {u.fatto ? "✓" : ""}
            </div>
            <div className="text-[10px] text-muted">{GIORNI_LUNGHI[giornoSettimana(u.d)].slice(0, 1).toUpperCase()}</div>
          </div>
        ))}
      </div>
      <div className="mt-1 text-xs text-muted">{sulla7}/7 giorni questa settimana · serie più lunga: {migliore} {migliore === 1 ? "giorno" : "giorni"}</div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-center">
        <div className="rounded-xl bg-ov/5 p-2"><div className="text-lg font-black">{fatte.length}</div><div className="text-[10px] text-muted">volte in tutto</div></div>
        <div className="rounded-xl bg-ov/5 p-2"><div className="text-lg font-black">{oreTesto(minuti)}</div><div className="text-[10px] text-muted">di tempo per te</div></div>
      </div>

      {vs && vs.prossima !== null && (
        <Prossimo etichetta={`Serie migliore: ${vs.valore}/${vs.prossima} giorni`} progresso={vs.progresso} colore={c.colore} />
      )}
      {vt && vt.prossima !== null && (
        <Prossimo etichetta={`Tempo: ${oreTesto(vt.valore)} su ${oreTesto(vt.prossima)}`} progresso={vt.progresso} colore={c.colore} />
      )}
    </div>
  );
}

function Prossimo({ etichetta, progresso, colore }: { etichetta: string; progresso: number; colore: string }) {
  return (
    <div className="mt-3">
      <div className="mb-1 text-[11px] text-muted">{etichetta}</div>
      <div className="h-2 overflow-hidden rounded-full bg-ov/10"><div className="barra-cresce h-full rounded-full" style={{ width: `${Math.round(progresso * 100)}%`, background: colore }} /></div>
    </div>
  );
}
