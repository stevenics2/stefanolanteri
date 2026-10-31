"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import type { Task } from "@/lib/tipi";
import PopupPianificazione from "../components/PopupPianificazione";

// Il popup «Pianificazione automatica» dei moduli: apri() lo mostra con la task com'è nel modulo in quel momento (una copia, così non cambia
// mentre guardi le proposte). Con «Pianifica» la task si salva e, se hai scelto una proposta diversa dalla prima, quei giorni restano fissati.
export function usePianifica({
  costruisci, modifica, onClose, onManuale,
}: { costruisci: () => Task; modifica: boolean; onClose: () => void; onManuale: () => void }) {
  const { salvaTask, fissaGiorniAuto, ricalcolaPiano } = useStore();
  const [bozza, setBozza] = useState<Task | null>(null);
  const popup = (
    <PopupPianificazione
      bozza={bozza}
      onChiudi={() => setBozza(null)}
      onManuale={() => {
        setBozza(null);
        onManuale();
      }}
      onConferma={(e) => {
        if (!bozza) return;
        salvaTask(bozza);
        if (modifica) ricalcolaPiano(bozza.id); // una nuova pianificazione dimentica i giorni fissati e tolti prima
        if (e.indice > 0) fissaGiorniAuto(bozza.id, e.voci.map((v) => v.data));
        setBozza(null);
        onClose();
      }}
    />
  );
  return { apri: () => setBozza(costruisci()), popup };
}
