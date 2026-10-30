"use client";

import { Flame, Skull, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { feedbackApertura, type Feedback } from "@/lib/feedback";
import { nuovoId } from "@/lib/seed";
import { useStore } from "@/lib/store";

const RITARDO_MS = 1600; // dopo il ricalcolo degli anelli
const DURATA_MS = 2900;

const STILE = {
  bene: { Icona: Flame, bordo: "rgba(251,191,36,0.6)", colore: "#fcd34d", ombra: "rgba(251,191,36,0.45)" },
  medio: { Icona: Zap, bordo: "rgba(205,214,224,0.5)", colore: "#e2e8f0", ombra: "rgba(205,214,224,0.35)" },
  male: { Icona: Skull, bordo: "rgba(248,113,113,0.65)", colore: "#fca5a5", ombra: "rgba(248,113,113,0.45)" },
} as const;

// Il commento all'apertura della scheda Oggi ("Si parte! Hai tutta la giornata davanti"): compare dentro il box di avanzamento,
// subito dopo il ricalcolo degli anelli, per 2-3 secondi. Si monta una volta per apertura.
export default function FeedbackBox() {
  const { pronto, oggi, stato } = useStore();
  const [mostra, setMostra] = useState<{ id: string; fb: Feedback } | null>(null);
  const ref = useRef(stato);
  useEffect(() => {
    ref.current = stato;
  }, [stato]);

  useEffect(() => {
    if (!pronto || !oggi) return;
    const a = setTimeout(() => setMostra({ id: nuovoId(), fb: feedbackApertura(ref.current, oggi, new Date()) }), RITARDO_MS);
    const b = setTimeout(() => setMostra(null), RITARDO_MS + DURATA_MS);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, [pronto, oggi]);

  if (!mostra || stato.timer) return null;
  const st = STILE[mostra.fb.tono];
  const Icona = st.Icona;
  return (
    <div className="pointer-events-none absolute inset-0 z-[4] flex items-center justify-center px-3">
      <button
        key={mostra.id}
        onClick={() => setMostra(null)}
        className="feedback pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl border bg-black/90 p-3.5 text-left backdrop-blur"
        style={{ borderColor: st.bordo, boxShadow: `0 0 36px -6px ${st.ombra}` }}
      >
        <Icona size={28} style={{ color: st.colore }} className="shrink-0" />
        <span className="font-sans text-[17px] font-extrabold leading-snug" style={{ color: st.colore }}>{mostra.fb.testo}</span>
      </button>
    </div>
  );
}
