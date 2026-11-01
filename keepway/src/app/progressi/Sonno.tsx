"use client";

import { Minus, Moon, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { dataPiù } from "@/lib/date";
import { dataBreve } from "@/lib/eventi";
import { useStore } from "@/lib/store";
import { useSalute } from "@/lib/useSalute";
import { debitoDiSonno, giudizioRegolarita, notti, oreEMinuti, regolarita } from "@/lib/sonnoProgressi";
import { useContaSu } from "@/lib/useContaSu";

const NOTTI = 14;
const SOGLIA_CORTA_MIN = 6 * 60;

// Il sonno degli ultimi 14 giorni: le notti a barre, il debito di sonno, la regolarità. Si basa sui dati dell'iPhone (vedi Impostazioni → Salute).
export default function Sonno() {
  const { stato, oggi, impostazioni } = useStore();
  const dati = useSalute(NOTTI + 14);
  const [scelta, setScelta] = useState<string | null>(null);
  const obiettivo = stato.impostazioni.obiettivoSonnoMin;
  const anim = stato.impostazioni.animazioni;
  const tutte = notti(dati ?? []);
  const debito = debitoDiSonno(tutte, obiettivo);
  const debitoMostrato = useContaSu(debito.debito, anim, 900);

  if (dati === null) return null;
  const giorni = Array.from({ length: NOTTI }, (_, i) => dataPiù(oggi, i - (NOTTI - 1)));
  const perGiorno = new Map(tutte.map((n) => [n.giorno, n]));
  const serie = giorni.map((g) => ({ giorno: g, n: perGiorno.get(g) ?? null }));
  const conDato = serie.filter((s) => s.n);

  if (tutte.length === 0) {
    return (
      <div className="rounded-2xl bg-card p-4">
        <div className="flex items-center gap-2 text-sm text-muted"><Moon size={16} /> Sonno</div>
        <p className="mt-1 text-sm">Qui vedrai le notti, il debito di sonno e quanto sei regolare. I dati arrivano con la sincronizzazione dell&apos;iPhone: <Link href="/impostazioni/#salute" className="text-accent underline">Impostazioni → Salute</Link>.</p>
      </div>
    );
  }

  const media = conDato.length ? Math.round(conDato.reduce((t, s) => t + s.n!.minuti, 0) / conDato.length) : 0;
  const migliore = conDato.reduce((m, s) => (!m || s.n!.minuti > m.n!.minuti ? s : m), null as (typeof conDato)[number] | null);
  const peggiore = conDato.reduce((m, s) => (!m || s.n!.minuti < m.n!.minuti ? s : m), null as (typeof conDato)[number] | null);
  const buone = conDato.filter((s) => s.n!.minuti >= obiettivo).length;
  const max = Math.max(obiettivo + 90, ...conDato.map((s) => s.n!.minuti));
  const reg = regolarita(tutte);
  const colDebito = debito.debito < 60 ? "#4ade80" : debito.debito < 240 ? "#fbbf24" : "#f87171";
  const stato_ = debito.debito < 60 ? "Sei in pari: continua così." : debito.debito < 240 ? "Un debito piccolo: una o due notti più lunghe lo riducono." : "Debito alto: stai accumulando stanchezza. Conta la costanza, non una notte sola.";
  const dettaglio = scelta ? perGiorno.get(scelta) ?? null : null;

  return (
    <div className="space-y-2">
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted"><Moon size={15} /> Sonno</h2>

      <div className="rounded-2xl bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-muted">Debito di sonno</div>
            <div className="text-4xl font-black tabular-nums" style={{ color: colDebito }}>{oreEMinuti(debitoMostrato)}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted">Obiettivo a notte</div>
            <div className="mt-1 flex items-center justify-end gap-2">
              <button aria-label="Meno" data-suono="nessuno" disabled={obiettivo <= 360} onClick={() => impostazioni({ obiettivoSonnoMin: obiettivo - 30 })} className="rounded-full bg-ov/10 p-1.5 disabled:opacity-30"><Minus size={14} /></button>
              <span className="w-14 text-center text-lg font-bold">{oreEMinuti(obiettivo)}</span>
              <button aria-label="Più" data-suono="nessuno" disabled={obiettivo >= 540} onClick={() => impostazioni({ obiettivoSonnoMin: obiettivo + 30 })} className="rounded-full bg-ov/10 p-1.5 disabled:opacity-30"><Plus size={14} /></button>
            </div>
          </div>
        </div>
        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-ov/10">
          <div className="barra-cresce h-full rounded-full" style={{ width: `${Math.min(100, Math.round((debito.debito / 480) * 100))}%`, minWidth: debito.debito ? 6 : 0, background: colDebito }} />
        </div>
        <p className="mt-2 text-sm text-muted">{stato_}</p>
        <p className="mt-1 text-[11px] text-muted">Ogni notte sotto l&apos;obiettivo aumenta il debito. Ogni notte sopra lo riduce, ma solo della metà: il sonno perso non si recupera tutto in una notte. Le notti senza dato non contano.</p>
      </div>

      <div className="rounded-2xl bg-card p-4">
        <div className="flex items-baseline justify-between">
          <div className="text-sm text-muted">Ultime {NOTTI} notti</div>
          <div className="text-sm text-muted"><b className="text-foreground">{buone}</b>/{conDato.length} sopra l&apos;obiettivo</div>
        </div>
        <div className="relative mt-4 flex h-32 items-end gap-1">
          <div className="pointer-events-none absolute inset-x-0 border-t border-dashed border-indigo-300/70" style={{ bottom: `${(obiettivo / max) * 100}%` }} />
          {serie.map((s) => {
            const m = s.n?.minuti ?? 0;
            const colore = m >= obiettivo ? "#a5b4fc" : m >= SOGLIA_CORTA_MIN ? "#fbbf24" : "#f87171";
            return (
              <button key={s.giorno} disabled={!s.n} onClick={() => setScelta(scelta === s.giorno ? null : s.giorno)} className="flex h-full flex-1 flex-col items-center gap-1">
                <div className="flex w-full flex-1 items-end">
                  <div className="barra-sale w-full rounded-md" style={{ height: `${(m / max) * 100}%`, minHeight: m ? 4 : 0, background: colore, opacity: s.giorno === scelta ? 1 : 0.9, outline: s.giorno === scelta ? "2px solid currentColor" : undefined }} />
                </div>
                <div className={`text-[9px] tabular-nums ${s.giorno === oggi ? "font-bold text-accent" : "text-muted"}`}>{Number(s.giorno.slice(8))}</div>
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted">
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-indigo-300" /> sopra l&apos;obiettivo</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-amber-400" /> 6 h o più</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-red-400" /> sotto le 6 h</span>
        </div>
        {dettaglio && (
          <div className="entra mt-3 rounded-xl bg-ov/5 p-3 text-sm">
            <b className="first-letter:uppercase">{dataBreve(dettaglio.giorno)}</b>: {oreEMinuti(dettaglio.minuti)}
            {dettaglio.letto && dettaglio.sveglia ? ` · dalle ${dettaglio.letto} alle ${dettaglio.sveglia}` : ""}
          </div>
        )}
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <Dato titolo="Media" valore={oreEMinuti(media)} />
          <Dato titolo="Migliore" valore={migliore?.n ? oreEMinuti(migliore.n.minuti) : "—"} />
          <Dato titolo="Più corta" valore={peggiore?.n ? oreEMinuti(peggiore.n.minuti) : "—"} />
        </div>
      </div>

      <div className="rounded-2xl bg-card p-4">
        <div className="text-sm text-muted">Regolarità (ultime 7 notti)</div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Regola titolo="Ora del letto" sd={reg.letto} />
          <Regola titolo="Sveglia" sd={reg.sveglia} />
        </div>
        <p className="mt-2 text-[11px] text-muted">Con i turni gli orari cambiano per forza: conta soprattutto non lasciare mai che la notte diventi troppo corta.</p>
      </div>
    </div>
  );
}

function Dato({ titolo, valore }: { titolo: string; valore: string }) {
  return (
    <div className="rounded-xl bg-ov/5 p-2">
      <div className="text-lg font-black">{valore}</div>
      <div className="text-[10px] text-muted">{titolo}</div>
    </div>
  );
}

function Regola({ titolo, sd }: { titolo: string; sd: number | null }) {
  const g = giudizioRegolarita(sd);
  const colore = g === "ottima" ? "#4ade80" : g === "buona" ? "#a3e635" : g === "variabile" ? "#fbbf24" : "#f87171";
  return (
    <div className="rounded-xl bg-ov/5 p-3">
      <div className="text-xs text-muted">{titolo}</div>
      {sd === null ? <div className="mt-1 text-sm text-muted">servono 3 notti</div> : (
        <>
          <div className="mt-0.5 text-lg font-black" style={{ color: colore }}>{g}</div>
          <div className="text-[11px] text-muted">± {sd} minuti</div>
        </>
      )}
    </div>
  );
}
