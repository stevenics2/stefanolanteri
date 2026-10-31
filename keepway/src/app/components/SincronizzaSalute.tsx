"use client";

import { useEffect } from "react";
import { abbinaAllenamenti } from "@/lib/saluteAuto";
import { useStore } from "@/lib/store";
import { useDatiSalute } from "@/lib/useSalute";

const CHIAVE = "keepway.salute.fatti";

const letti = (): Set<string> => {
  try {
    return new Set(JSON.parse(localStorage.getItem(CHIAVE) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
};

// Quando dall'iPhone arriva un allenamento di oggi (corsa, palestra), la task corrispondente si segna da sola.
// Si ricorda quali allenamenti sono già stati usati, così se poi annulli non si rifà.
export default function SincronizzaSalute() {
  const { pronto, stato, oggi, completa } = useStore();
  const dati = useDatiSalute(7);

  useEffect(() => {
    if (!pronto || !oggi || !dati?.allenamenti.length) return;
    const fatti = letti();
    const daFare = abbinaAllenamenti(stato, oggi, dati.allenamenti, fatti);
    if (!daFare.length) return;
    for (const a of daFare) fatti.add(a.chiave);
    try {
      localStorage.setItem(CHIAVE, JSON.stringify([...fatti].slice(-60)));
    } catch {
      // pazienza
    }
    // una alla volta, in sequenza breve, così la festa di una non copre l'altra
    daFare.forEach((a, i) => setTimeout(() => completa(a.taskId, { minima: false, minuti: a.minuti ?? undefined, punti: a.punti }), i * 4500));
  }, [pronto, stato, oggi, dati, completa]);

  return null;
}
