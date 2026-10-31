"use client";

import { ChevronsUpDown } from "lucide-react";
import type { ReactNode } from "react";
import Interr from "../components/Interruttore";
import { useInUscita } from "../components/Presenza";

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
      className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${attivo ? "chip-on bg-accent text-black" : "bg-ov/10"} ${disabilitato ? "opacity-30" : ""}`}
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
        attivo ? "chip-on border-accent bg-accent/15 text-accent" : "border-transparent bg-ov/10"
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
      <Interr valore={valore} onChange={onChange} />
    </label>
  );
}

export function Schermo({ titolo, onClose, children }: { titolo: string; onClose: () => void; children: ReactNode }) {
  const uscendo = useInUscita(); // dentro un <Presenza>: quando si chiude scende invece di sparire di colpo
  return (
    <div className={`fixed inset-0 z-30 overflow-y-auto bg-background px-4 pb-10 pt-[var(--pt-pagina)] ${uscendo ? "foglio-fuori" : "foglio-dentro"}`}>
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

// Un gruppo di righe ordinate dentro una scheda (etichetta a sinistra, scelta a destra).
export function Gruppo({ children }: { children: ReactNode }) {
  return <div className="divide-y divide-ov/10 overflow-hidden rounded-2xl bg-ov/5">{children}</div>;
}

// Una riga con l'etichetta a sinistra e un menu a tendina a destra (su iPhone si apre la rotellina di iOS).
export function RigaSelect<T extends string | number | null>({
  etichetta, sotto, valore, opzioni, onCambia,
}: { etichetta: string; sotto?: string; valore: T; opzioni: [T, string][]; onCambia: (v: T) => void }) {
  const chiave = (v: T) => (v === null ? "__nessuno" : String(v));
  return (
    <label className="flex items-center justify-between gap-3 px-4 py-3">
      <span className="min-w-0">
        <span className="block text-sm">{etichetta}</span>
        {sotto && <span className="block text-xs text-muted">{sotto}</span>}
      </span>
      <span className="relative inline-flex shrink-0 items-center">
        <select
          value={chiave(valore)}
          onChange={(e) => onCambia((opzioni.find(([v]) => chiave(v) === e.target.value) ?? opzioni[0])[0])}
          className="cursor-pointer appearance-none rounded-lg bg-ov/10 py-1.5 pl-3 pr-8 text-right text-sm font-semibold text-accent outline-none"
        >
          {opzioni.map(([v, nome]) => (
            <option key={chiave(v)} value={chiave(v)} className="bg-card text-foreground">{nome}</option>
          ))}
        </select>
        <ChevronsUpDown size={14} className="pointer-events-none absolute right-2 text-muted" />
      </span>
    </label>
  );
}
