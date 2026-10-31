"use client";

import type { ReactNode } from "react";

// Pezzi di interfaccia condivisi dai moduli: chip, riquadri con icona, schermo a tutta pagina.
export const campo = "mt-1 w-full rounded-xl bg-ov/10 px-3 py-2.5 outline-none";

export function Etichetta({ children }: { children: ReactNode }) {
  return <div className="mb-1.5 text-sm font-medium text-muted">{children}</div>;
}

export function Chip({ attivo, onClick, children, disabilitato = false }: { attivo: boolean; onClick: () => void; children: ReactNode; disabilitato?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabilitato}
      className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${attivo ? "bg-accent text-black" : "bg-ov/10"} ${disabilitato ? "opacity-30" : ""}`}
    >
      {children}
    </button>
  );
}

// Riquadro grande con icona (per scegliere un tipo, un'area, un'attività...).
export function Riquadro({ icona, nome, attivo, onClick }: { icona: ReactNode; nome: string; attivo: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 rounded-2xl border px-2 py-3 text-xs font-medium ${
        attivo ? "border-accent bg-accent/15 text-accent" : "border-transparent bg-ov/10"
      }`}
    >
      {icona}
      {nome}
    </button>
  );
}

export function Interruttore({ valore, onChange, children }: { valore: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-2xl bg-ov/5 px-4 py-3 text-sm">
      <span>{children}</span>
      <input type="checkbox" checked={valore} onChange={(e) => onChange(e.target.checked)} className="h-5 w-5 shrink-0" />
    </label>
  );
}

export function Schermo({ titolo, onClose, children }: { titolo: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-30 overflow-y-auto bg-background px-4 pb-10 pt-[var(--pt-pagina)]">
      <div className="mx-auto max-w-md space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">{titolo}</h1>
          <button data-suono="indietro" onClick={onClose} className="text-muted">Chiudi</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export const aMinuti = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
