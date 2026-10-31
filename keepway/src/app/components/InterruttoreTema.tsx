"use client";

import { Moon, Sun } from "lucide-react";
import { useStore } from "@/lib/store";

// La luna (tema scuro) o il sole (tema chiaro): toccandolo si passa all'altro.
export default function InterruttoreTema() {
  const { stato, impostazioni } = useStore();
  const chiaro = stato.impostazioni.tema === "chiaro";
  return (
    <button
      data-suono="via"
      onClick={() => impostazioni({ tema: chiaro ? "scuro" : "chiaro" })}
      aria-label={chiaro ? "Tema chiaro: passa allo scuro" : "Tema scuro: passa al chiaro"}
      title={chiaro ? "Tema chiaro" : "Tema scuro"}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-ov/10"
    >
      {chiaro ? <Sun size={18} className="text-amber-300" /> : <Moon size={18} className="text-sky-300" />}
    </button>
  );
}
