"use client";

import { useEffect, useState } from "react";
import { inviaPiano, registraSW, riallineaIscrizione, statoPush } from "@/lib/notifiche";
import { pianoNotifiche } from "@/lib/piano";
import { useStore } from "@/lib/store";

const CHIAVE_ALLINEA = "keepway.allineato";

// Registra il service worker e tiene il server aggiornato con le notifiche dei prossimi giorni.
// Quando fai una task, la salti o la rimandi, il piano si ricalcola e i promemoria inutili spariscono.
export default function SincronizzaNotifiche() {
  const { pronto, stato, oggi } = useStore();
  const [giro, setGiro] = useState(0);

  useEffect(() => {
    void registraSW();
  }, []);

  // Ogni 10 minuti si ricalcola comunque: l'orizzonte dei giorni avanza e "più tardi" scade.
  useEffect(() => {
    const id = setInterval(() => setGiro((g) => g + 1), 10 * 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!pronto || !oggi) return;
    let annullato = false;
    const id = setTimeout(async () => {
      try {
        if ((await statoPush()) !== "attive" || annullato) return;
        const ultimo = Number(localStorage.getItem(CHIAVE_ALLINEA) ?? 0);
        if (Date.now() - ultimo > 86_400_000) {
          await riallineaIscrizione();
          localStorage.setItem(CHIAVE_ALLINEA, String(Date.now()));
        }
        await inviaPiano(pianoNotifiche(stato, Date.now(), oggi));
      } catch {
        // offline o server non raggiungibile: si riprova al prossimo cambiamento
      }
    }, 1500); // aspetta che finisca una raffica di tocchi
    return () => {
      annullato = true;
      clearTimeout(id);
    };
  }, [pronto, stato, oggi, giro]);

  return null;
}
