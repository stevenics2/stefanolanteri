"use client";

import { confermaAnnulla } from "@/lib/annulla";
import { Undo2 } from "lucide-react";
import { useEffect } from "react";
import { useStore } from "@/lib/store";

// "Fatto. Annulla": compare dopo una modifica ai turni e sparisce da sola.
export default function AvvisoAnnulla() {
  const { avviso, annullaAvviso, chiudiAvviso, stato } = useStore();
  const id = avviso?.id;
  useEffect(() => {
    if (!id) return;
    const t = setTimeout(chiudiAvviso, 9000);
    return () => clearTimeout(t);
  }, [id, chiudiAvviso]);
  if (!avviso) return null;
  return (
    <div className="pop fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+5rem)] z-50 flex justify-center px-4">
      <div className="flex w-full max-w-sm items-center gap-3 rounded-2xl bg-card p-3 shadow-xl ring-1 ring-white/10">
        <span className="flex-1 text-sm">{avviso.testo}</span>
        <button data-suono="nessuno" onClick={() => confermaAnnulla("Annullare questa modifica?", stato.impostazioni.suoni) && annullaAvviso()} className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold">
          <Undo2 size={14} /> Annulla
        </button>
      </div>
    </div>
  );
}
