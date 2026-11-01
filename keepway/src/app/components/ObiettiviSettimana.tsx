"use client";

import { Check, Target } from "lucide-react";
import { progressoObiettivi } from "@/lib/settimana";
import { useStore } from "@/lib/store";
import { inizioSettimana } from "@/lib/date";
import { useDatiSalute } from "@/lib/useSalute";

// Gli obiettivi della settimana, con a che punto sei: barre piccole, verdi quando sono raggiunti.
export default function ObiettiviSettimana({ lunedi, titolo = "Obiettivi della settimana" }: { lunedi?: string; titolo?: string }) {
  const { stato, oggi, impostaSettimana } = useStore();
  const dati = useDatiSalute(21);
  const lun = lunedi ?? inizioSettimana(oggi);
  const prog = progressoObiettivi(stato, lun, dati?.giorni ?? [], oggi);
  if (prog.length === 0) return null;
  return (
    <div className="rounded-2xl bg-card p-3">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted"><Target size={13} /> {titolo}</div>
      <div className="space-y-2">
        {prog.map((o) => (
          <div key={o.id} onClick={o.id === "libero" ? () => impostaSettimana({ liberoFatto: o.fatto ? null : lun }) : undefined} className={o.id === "libero" ? "cursor-pointer" : ""}>
            <div className="flex items-baseline justify-between text-sm">
              <span className="flex items-center gap-1.5 font-medium">{o.fatto && <Check size={14} strokeWidth={3} className="text-green-400" />}{o.titolo}</span>
              <span className="font-bold tabular-nums" style={{ color: o.fatto ? "#4ade80" : undefined }}>{o.valore}/{o.target}</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ov/10">
              <div className="barra-cresce h-full rounded-full" style={{ width: `${Math.min(100, (o.valore / o.target) * 100)}%`, background: o.fatto ? "#4ade80" : "var(--accent)" }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
