"use client";

import { BedDouble, Minus, Moon, Plus, TrendingDown, TrendingUp } from "lucide-react";
import Link from "next/link";
import { dataPiù } from "@/lib/date";
import { useStore } from "@/lib/store";
import { useSalute } from "@/lib/useSalute";
import { debitoDiSonno, giudizioRegolarita, notti, oreEMinuti, regolarita } from "@/lib/sonnoProgressi";
import { useContaSu } from "@/lib/useContaSu";
import Approfondisci from "./Approfondisci";
import GraficoLinea, { TessereKpi } from "./GraficoLinea";

const NOTTI = 14;

// Il sonno degli ultimi 14 giorni: le notti a barre, il debito di sonno, la regolarità. Si basa sui dati dell'iPhone (vedi Impostazioni → Salute).
export default function Sonno() {
  const { stato, oggi, impostazioni } = useStore();
  const dati = useSalute(NOTTI + 14);
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
  const reg = regolarita(tutte);
  const colDebito = debito.debito < 60 ? "#4ade80" : debito.debito < 240 ? "#fbbf24" : "#f87171";
  const stato_ = debito.debito < 60 ? "Sei in pari: continua così." : debito.debito < 240 ? "Un debito piccolo: una o due notti più lunghe lo riducono." : "Debito alto: stai accumulando stanchezza. Conta la costanza, non una notte sola.";
  const ultima = tutte[tutte.length - 1] ?? null;

  return (
    <div className="space-y-2">
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted"><Moon size={15} /> Sonno</h2>

      <GraficoLinea
        titolo="Ore di sonno"
        sotto={`${buone}/${conDato.length} notti sopra l'obiettivo`}
        grande={media ? oreEMinuti(media).replace(" h ", "h") : undefined}
        colore="#a5b4fc"
        punti={serie.map((s) => ({ etichetta: `${Number(s.giorno.slice(8))}/${Number(s.giorno.slice(5, 7))}`, v: s.n ? Math.round((s.n.minuti / 60) * 10) / 10 : null }))}
        yMin={3}
        yMax={10}
        passo={1}
        formatoY={(n) => `${n}h`}
        riferimento={{ v: obiettivo / 60, etichetta: `obiettivo ${oreEMinuti(obiettivo).replace(" h 00", " h")}` }}
      />
      <TessereKpi
        voci={[
          { icona: <Moon size={14} />, titolo: "Media", valore: oreEMinuti(media).replace(" h ", "h"), colore: "#a5b4fc" },
          { icona: <TrendingUp size={14} />, titolo: "Migliore", valore: migliore?.n ? oreEMinuti(migliore.n.minuti).replace(" h ", "h") : "—", colore: "#4ade80" },
          { icona: <TrendingDown size={14} />, titolo: "Più corta", valore: peggiore?.n ? oreEMinuti(peggiore.n.minuti).replace(" h ", "h") : "—", colore: "#f87171" },
          { icona: <BedDouble size={14} />, titolo: "Ultima notte", valore: ultima ? oreEMinuti(ultima.minuti).replace(" h ", "h") : "—", colore: "#fbbf24" },
        ]}
        />

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
        <Approfondisci>
          <p>Ogni notte sotto l&apos;obiettivo aumenta il debito. Ogni notte sopra lo riduce, ma solo della metà: il sonno perso non si recupera tutto in una notte.</p>
          <p>Le notti senza dato non contano: non ti penalizzo se non hai sincronizzato.</p>
        </Approfondisci>
      </div>

      <div className="rounded-2xl bg-card p-4">
        <div className="text-sm text-muted">Regolarità (ultime 7 notti)</div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Regola titolo="Ora del letto" sd={reg.letto} />
          <Regola titolo="Sveglia" sd={reg.sveglia} />
        </div>
        <Approfondisci><p>Misura quanto variano l&apos;ora del letto e della sveglia nelle ultime 7 notti (± minuti). Con i turni gli orari cambiano per forza: conta soprattutto non lasciare che la notte diventi troppo corta.</p></Approfondisci>
      </div>
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
