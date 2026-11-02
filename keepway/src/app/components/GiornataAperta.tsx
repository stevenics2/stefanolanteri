"use client";

import { Moon } from "lucide-react";
import { chiudiGiornata } from "@/lib/giornoLogico";
import { oggiLocale } from "@/lib/date";
import { useStore } from "@/lib/store";

// Dopo la mezzanotte la giornata resta aperta fino al sonno: qui si dice chiaramente e si può chiudere a mano.
export default function GiornataAperta() {
  const { oggi, adesso } = useStore();
  if (!oggi || adesso === 0 || oggi === oggiLocale(new Date(adesso))) return null;
  return (
    <div className="entra mb-3 flex items-center gap-3 rounded-2xl bg-card px-4 py-3">
      <Moon size={18} className="shrink-0 text-sky-300" />
      <p className="min-w-0 flex-1 text-[13px] leading-snug text-muted">La giornata di ieri resta aperta fino al sonno: puoi ancora segnare le task.</p>
      <button onClick={() => chiudiGiornata(adesso)} className="shrink-0 rounded-full bg-ov/10 px-3 py-1.5 text-xs font-bold text-foreground">Chiudi</button>
    </div>
  );
}
