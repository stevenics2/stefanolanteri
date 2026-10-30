"use client";

import { useEffect, useRef } from "react";
import { suono, tic, type Suono } from "@/lib/effetti";
import { useStore } from "@/lib/store";
import { vibra } from "@/lib/vibrazione";

// Vibrazione e suono a ogni tocco su pulsanti, link e interruttori (si spengono dalle Impostazioni).
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
      // Se il pulsante dichiara un suono (data-suono) si usa quello, altrimenti il "tic" generico.
      // "nessuno" = niente: ci pensa già l'effetto di completamento.
      const scelto = e.target.closest("[data-suono]")?.getAttribute("data-suono");
      if (scelto === "nessuno") return;
      if (scelto) {
        if (opzioni.current.suoni) suono(scelto as Suono);
      } else if (opzioni.current.suonoTocco) tic();
    };
    document.addEventListener("click", alTocco, true);
    return () => document.removeEventListener("click", alTocco, true);
  }, []);

  return null;
}
