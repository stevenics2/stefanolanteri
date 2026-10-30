"use client";

import { Flame, Skull, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { aperturaCorrente, iscriviApertura } from "@/lib/apertura";
import { feedbackApertura, type Feedback } from "@/lib/feedback";
import { nuovoId } from "@/lib/seed";
import { useStore } from "@/lib/store";

const RITARDO_MS = 1600; // dopo il ricalcolo del recap
const DURATA_MS = 2900;

const STILE = {
  bene: { Icona: Flame, bordo: "rgba(251,191,36,0.6)", colore: "#fcd34d", ombra: "rgba(251,191,36,0.45)" },
  medio: { Icona: Zap, bordo: "rgba(205,214,224,0.5)", colore: "#e2e8f0", ombra: "rgba(205,214,224,0.35)" },
  male: { Icona: Skull, bordo: "rgba(248,113,113,0.65)", colore: "#fca5a5", ombra: "rgba(248,113,113,0.45)" },
} as const;

// A ogni apertura dell'app, subito dopo il ricalcolo: un popup di 2-3 secondi con un commento sulla tua giornata.
export default function FeedbackApertura() {
  const { pronto, oggi, stato } = useStore();
  const [apertura, setApertura] = useState(() => aperturaCorrente());
  useEffect(() => iscriviApertura(() => setApertura(aperturaCorrente())), []);

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
  }, [pronto, oggi, apertura]);

  // Non si sovrappone al timer a schermo intero, né alle feste (forziere, record...)
  if (!mostra || stato.timer || !stato.impostazioni.animazioni) return null;
  const st = STILE[mostra.fb.tono];
  const Icona = st.Icona;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[38%] z-50 flex justify-center px-4">
      <button
        key={mostra.id}
        onClick={() => setMostra(null)}
        className="feedback pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl border bg-black/90 p-4 text-left backdrop-blur"
        style={{ borderColor: st.bordo, boxShadow: `0 0 36px -6px ${st.ombra}` }}
      >
        <Icona size={30} style={{ color: st.colore }} className="shrink-0" />
        <span className="text-lg font-extrabold leading-snug" style={{ color: st.colore }}>{mostra.fb.testo}</span>
      </button>
    </div>
  );
}
