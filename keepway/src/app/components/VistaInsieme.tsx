"use client";

import { AlertTriangle, CalendarDays, Check, ChevronLeft, ChevronRight, Circle, Clock } from "lucide-react";
import { dataPiù, GIORNI_LUNGHI, giornoSettimana, MESI_BREVI } from "@/lib/date";
import { coloreGiorno, riepilogoGiorno } from "@/lib/giornata";
import { caricoDelGiorno, righeGiorno, type LivelloCarico } from "@/lib/settimana";
import { useStore } from "@/lib/store";
import type { Evento } from "@/lib/tipi";
import AreaIcona from "./AreaIcona";
import { minutiNelGiorno } from "@/lib/giornoLogico";

const ETICHETTE: Record<LivelloCarico, { testo: string; colore: string }> = {
  recupero: { testo: "Recupero", colore: "#38bdf8" },
  essenziale: { testo: "Essenziale", colore: "#a78bfa" },
  leggero: { testo: "Leggero", colore: "#4ade80" },
  normale: { testo: "Normale", colore: "#fbbf24" },
  pesante: { testo: "Pesante", colore: "#f87171" },
};
const nomeGiorno = (d: string) => `${GIORNI_LUNGHI[giornoSettimana(d)]} ${Number(d.slice(8))}`;

// La settimana in una sola vista: un blocco per giorno con il turno, il carico (leggero, normale, pesante) e tutto quello che c'è:
// task di ogni tipo (ogni giorno, giorni fissi, automatiche) e appuntamenti. In alto, gli avvisi sui giorni troppo carichi.
export default function VistaInsieme({ lunedi, onApriGiorno, onModificaEvento, onSposta }: { lunedi: string; onApriGiorno: (d: string) => void; onModificaEvento?: (e: Evento) => void; onSposta?: (delta: number) => void }) {
  const { stato, oggi, adesso } = useStore();
  const adessoMin = adesso > 0 ? minutiNelGiorno(adesso, oggi) : 0;
  const giorni = Array.from({ length: 7 }, (_, i) => dataPiù(lunedi, i));
  const dati = giorni.map((d) => ({ d, carico: caricoDelGiorno(stato, d, oggi, adessoMin), righe: righeGiorno(stato, d, oggi, adessoMin), r: riepilogoGiorno(d) }));
  const futuri = dati.filter((x) => x.d >= oggi);
  const pesanti = futuri.filter((x) => x.carico.livello === "pesante");
  const leggeri = futuri.filter((x) => x.carico.livello === "leggero" && x.r.noto);
  const fine = dataPiù(lunedi, 6);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        {onSposta ? <button aria-label="Settimana precedente" data-suono="nessuno" onClick={() => onSposta(-1)} className="rounded-full bg-ov/10 p-2"><ChevronLeft size={16} /></button> : <span />}
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5 text-base font-bold"><CalendarDays size={16} /> {Number(lunedi.slice(8))} {MESI_BREVI[Number(lunedi.slice(5, 7)) - 1]} – {Number(fine.slice(8))} {MESI_BREVI[Number(fine.slice(5, 7)) - 1]}</div>
          <div className="text-xs text-muted">Vista d&apos;insieme della settimana</div>
        </div>
        {onSposta ? <button aria-label="Settimana successiva" data-suono="nessuno" onClick={() => onSposta(1)} className="rounded-full bg-ov/10 p-2"><ChevronRight size={16} /></button> : <span />}
      </div>

      {pesanti.length > 0 && (
        <div className="flex items-start gap-2 rounded-2xl border border-red-500/40 bg-red-500/10 p-3 text-sm">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-red-300" />
          <div>
            <b>Carico alto: {pesanti.map((x) => nomeGiorno(x.d)).join(", ")}.</b>{" "}
            {leggeri.length > 0 ? <>Più leggero: {leggeri.slice(0, 2).map((x) => nomeGiorno(x.d)).join(", ")}. Puoi spostare lì qualcosa.</> : "Considera di togliere o rimandare qualcosa."}
          </div>
        </div>
      )}

      {dati.map(({ d, carico, righe, r }) => {
        const passato = d < oggi;
        const e = ETICHETTE[carico.livello];
        const fatte = righe.filter((x) => x.task && x.fatto).length;
        const nTask = righe.filter((x) => x.task).length;
        return (
          <div key={d} className={`rounded-2xl bg-card ${passato ? "opacity-55" : ""} ${d === oggi ? "ring-2 ring-accent" : ""}`} style={{ borderLeft: `4px solid ${coloreGiorno(r)}` }}>
            <button data-suono="via" onClick={() => onApriGiorno(d)} className="flex w-full items-center gap-2 px-3 py-2.5 text-left">
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="font-bold capitalize">{nomeGiorno(d)}</span>
                  {d === oggi && <span className="rounded-full bg-accent px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-black">oggi</span>}
                </div>
                <div className="text-xs text-muted">{r.etichetta}{r.orario ? ` · ${r.orario}` : ""}</div>
              </div>
              {passato && nTask > 0 && <span className="text-xs text-muted">{fatte}/{nTask} fatte</span>}
              <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide" style={{ background: `${e.colore}26`, color: e.colore }}>{e.testo}</span>
              <ChevronRight size={16} className="shrink-0 text-muted" />
            </button>
            {righe.length > 0 && (
              <div className="space-y-1 px-3 pb-3">
                {righe.map((x) => {
                  const area = x.task ? stato.aree.find((a) => a.id === x.task!.areaId) : null;
                  return (
                    <button key={x.id} disabled={!x.evento || !onModificaEvento} onClick={() => x.evento && onModificaEvento?.(x.evento)} className="flex w-full items-center gap-2 rounded-xl bg-ov/5 px-2.5 py-1.5 text-left text-sm">
                      {x.fatto ? <Check size={14} strokeWidth={3} className="shrink-0 text-green-400" /> : <Circle size={14} className="shrink-0 text-muted" />}
                      <span className={`min-w-0 flex-1 truncate ${x.fatto ? "text-muted line-through" : "font-medium"}`}>{x.titolo}</span>
                      {x.orario && <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-emerald-300"><Clock size={10} /> {x.orario}</span>}
                      {x.evento && <AreaIcona nome={x.evento.icona} colore="#38bdf8" size={12} badge={false} />}
                      {area && !x.fatto && <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: area.colore }} />}
                    </button>
                  );
                })}
              </div>
            )}
            {righe.length === 0 && <div className="px-3 pb-3 text-xs text-muted">Niente di previsto.</div>}
          </div>
        );
      })}
    </div>
  );
}
