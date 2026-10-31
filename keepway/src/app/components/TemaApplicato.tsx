"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";

export const CHIAVE_TEMA = "keepway-tema";

// Applica il tema scelto: l'attributo sulla pagina (i colori), il colore della barra del browser e una copia per il primo disegno.
export default function TemaApplicato() {
  const { stato } = useStore();
  const tema = stato.impostazioni.tema === "chiaro" ? "chiaro" : "scuro";
  useEffect(() => {
    document.documentElement.dataset.tema = tema;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", tema === "chiaro" ? "#eef1f5" : "#0b0f14");
    try {
      localStorage.setItem(CHIAVE_TEMA, tema);
    } catch {
      // pazienza
    }
  }, [tema]);
  return null;
}
