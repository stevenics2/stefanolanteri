"use client";

import { Check, Siren } from "lucide-react";
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import AreaIcona from "./AreaIcona";

export const MIN_GIALLA = 60;
export const MIN_ROSSA = 90;

const fase = (min: number) => (min >= MIN_ROSSA ? "rossa" : min >= MIN_GIALLA ? "gialla" : "verde");
const COLORI = { verde: "#22c55e", gialla: "#facc15", rossa: "#ef4444" } as const;
const FRASI = {
  verde: "Il ciclo è finito: stendi entro un'ora.",
  gialla: "È passata più di un'ora: stendi adesso.",
  rossa: "PRIORITÀ: il bucato è bagnato da troppo tempo.",
} as const;

const tempo = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return `${h > 0 ? `${h}:` : ""}${String(m).padStart(h > 0 ? 2 : 1, "0")}:${String(ss).padStart(2, "0")}`;
};

// Le task che arrivano dopo un'altra (es. «Stendi il bucato» dopo la lavatrice): una spia che lampeggia, con il tempo da quando
// il ciclo è finito. Verde nella prima ora, gialla dopo un'ora, rossa dopo un'ora e mezza (con l'icona di priorità).
export default function SpiaSeguito() {
  const { stato, adesso, completa } = useStore();
  const [ora, setOra] = useState(adesso);
  useEffect(() => {
    const id = setInterval(() => setOra(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const adessoVero = Math.max(ora, adesso);
  if (adesso === 0) return null;

  const attive = stato.task.filter((t) => t.attiva && t.seguitoDi && (t.ripetiMin ?? 30) < 60 && t.visibileDa && t.visibileDa <= adessoVero && !stato.completamenti.some((c) => c.taskId === t.id));
  if (attive.length === 0) return null;

  return (
    <div className="space-y-2">
      {attive.map((t) => {
        const trascorso = adessoVero - t.visibileDa!;
        const f = fase(trascorso / 60_000);
        const colore = COLORI[f];
        return (
          <div key={t.id} data-fase={f} className="spia-scheda rounded-2xl border-2 p-3" style={{ "--spia": `${colore}99`, borderColor: colore, background: `${colore}1f` } as React.CSSProperties}>
            <div className="flex items-center gap-3">
              <span className="spia-punto h-4 w-4 shrink-0 rounded-full" style={{ background: colore, boxShadow: `0 0 12px ${colore}` }} />
              <AreaIcona nome={t.icona ?? "bucato"} colore={colore} size={18} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 font-bold leading-tight">
                  {f === "rossa" && <Siren size={16} className="shrink-0" style={{ color: colore }} />}
                  <span className="truncate">{t.titolo}</span>
                </div>
                <div className="text-xs" style={{ color: colore }}>{FRASI[f]}</div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-xl font-black tabular-nums leading-none" style={{ color: colore }}>{tempo(trascorso)}</div>
              </div>
            </div>
            <button data-suono="ok" onClick={() => completa(t.id, { minima: false })} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold text-black" style={{ background: colore }}>
              <Check size={16} strokeWidth={3} /> Steso! +{t.punti} XP
            </button>
          </div>
        );
      })}
    </div>
  );
}
