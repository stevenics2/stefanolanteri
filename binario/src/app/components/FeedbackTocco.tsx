"use client";

import { useEffect, useRef } from "react";
import { tic } from "@/lib/effetti";
import { useStore } from "@/lib/store";
import { vibra } from "@/lib/vibrazione";

// Vibrazione e "tic" a ogni tocco su pulsanti, link e interruttori (si spengono dalle Impostazioni).
export default function FeedbackTocco() {
  const { stato } = useStore();
  const opzioni = useRef(stato.impostazioni);
  useEffect(() => {
    opzioni.current = stato.impostazioni;
  }, [stato.impostazioni]);

  useEffect(() => {
    const alTocco = (e: Event) => {
      if (!(e.target instanceof Element) || !e.target.closest("button, a, label, summary, select")) return;
      if (opzioni.current.vibrazione) vibra();
      if (opzioni.current.suonoTocco) tic();
    };
    document.addEventListener("click", alTocco, true);
    return () => document.removeEventListener("click", alTocco, true);
  }, []);

  return null;
}
