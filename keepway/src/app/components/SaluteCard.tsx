"use client";

import { Footprints, HeartPulse, Moon } from "lucide-react";
import { dataPiù, GIORNI_LUNGHI, giornoSettimana } from "@/lib/date";
import { OBIETTIVO_PASSI, oreMinuti, SONNO_MINIMO_MIN } from "@/lib/salute";
import { useSalute } from "@/lib/useSalute";
import { useStore } from "@/lib/store";
import Link from "next/link";

const iniziale = (d: string) => GIORNI_LUNGHI[giornoSettimana(d)].slice(0, 1).toUpperCase();

// Sonno e passi degli ultimi giorni, dai dati che il Comando Rapido manda dall'iPhone (vedi Impostazioni → Salute).
export default function SaluteCard() {
  const { oggi } = useStore();
  const dati = useSalute(14);
  if (dati === null) return null;

  if (dati.length === 0) {
    return (
      <div className="rounded-2xl bg-card p-4">
        <div className="flex items-center gap-2 text-sm text-muted"><HeartPulse size={16} /> Salute</div>
        <p className="mt-1 text-sm">Qui vedrai sonno e passi dell&apos;Apple Watch. Si collega con un Comando Rapido: lo trovi in <Link href="/impostazioni/#salute" className="text-accent underline">Impostazioni → Salute</Link>.</p>
      </div>
    );
  }

  const giorni = Array.from({ length: 7 }, (_, i) => dataPiù(oggi, i - 6));
  const perGiorno = new Map(dati.map((d) => [d.giorno, d]));
  const passi = giorni.map((g) => perGiorno.get(g)?.passi ?? 0);
  const sonni = giorni.map((g) => perGiorno.get(g)?.sonnoMin ?? 0);
  const maxPassi = Math.max(OBIETTIVO_PASSI, ...passi);
  const maxSonno = Math.max(9 * 60, ...sonni);
  const conPassi = passi.filter((p) => p > 0);
  const conSonno = sonni.filter((s) => s > 0);
  const mediaPassi = conPassi.length ? Math.round(conPassi.reduce((a, b) => a + b, 0) / conPassi.length) : null;
  const mediaSonno = conSonno.length ? Math.round(conSonno.reduce((a, b) => a + b, 0) / conSonno.length) : null;
  const oggiD = perGiorno.get(oggi);
  const ultimoSonno = perGiorno.get(oggi)?.sonnoMin ? perGiorno.get(oggi) : dati.find((d) => d.sonnoMin);

  return (
    <div className="space-y-4 rounded-2xl bg-card p-4">
      <div className="flex items-center gap-2 text-sm text-muted"><HeartPulse size={16} /> Salute · ultimi 7 giorni</div>

      <div>
        <div className="flex items-baseline justify-between">
          <span className="inline-flex items-center gap-1.5 font-semibold"><Footprints size={16} className="text-emerald-400" /> Passi</span>
          <span className="text-sm text-muted">
            {oggiD?.passi ? <><b className="text-lg text-foreground">{oggiD.passi.toLocaleString("it-IT")}</b> oggi</> : "oggi: nessun dato"}
            {mediaPassi ? ` · media ${mediaPassi.toLocaleString("it-IT")}` : ""}
          </span>
        </div>
        <div className="relative mt-2 flex h-20 items-end gap-2">
          <div className="pointer-events-none absolute inset-x-0 border-t border-dashed border-ov/25" style={{ bottom: `${(OBIETTIVO_PASSI / maxPassi) * 100}%` }} />
          {passi.map((p, i) => (
            <div key={giorni[i]} className="flex h-full flex-1 flex-col items-center gap-1">
              <div className="flex w-full flex-1 items-end">
                <div className={`barra-cresce w-full rounded-md ${p >= OBIETTIVO_PASSI ? "bg-emerald-400" : "bg-emerald-500/50"}`} style={{ height: `${(p / maxPassi) * 100}%`, minHeight: p ? 4 : 0 }} />
              </div>
              <div className="text-[10px] text-muted">{iniziale(giorni[i])}</div>
            </div>
          ))}
        </div>
        <div className="mt-1 text-[10px] text-muted">La linea tratteggiata è l&apos;obiettivo: {OBIETTIVO_PASSI.toLocaleString("it-IT")} passi.</div>
      </div>

      <div>
        <div className="flex items-baseline justify-between">
          <span className="inline-flex items-center gap-1.5 font-semibold"><Moon size={16} className="text-indigo-300" /> Sonno</span>
          <span className="text-sm text-muted">
            {ultimoSonno?.sonnoMin ? <><b className="text-lg text-foreground">{oreMinuti(ultimoSonno.sonnoMin)}</b>{ultimoSonno.giorno === oggi ? " stanotte" : ""}</> : "nessun dato"}
            {mediaSonno ? ` · media ${oreMinuti(mediaSonno)}` : ""}
          </span>
        </div>
        {ultimoSonno?.letto && ultimoSonno.sveglia && <div className="text-xs text-muted">Dalle {ultimoSonno.letto} alle {ultimoSonno.sveglia}</div>}
        <div className="relative mt-2 flex h-20 items-end gap-2">
          <div className="pointer-events-none absolute inset-x-0 border-t border-dashed border-ov/25" style={{ bottom: `${(SONNO_MINIMO_MIN / maxSonno) * 100}%` }} />
          {sonni.map((s, i) => (
            <div key={giorni[i]} className="flex h-full flex-1 flex-col items-center gap-1">
              <div className="flex w-full flex-1 items-end">
                <div className={`barra-cresce w-full rounded-md ${s >= SONNO_MINIMO_MIN ? "bg-indigo-300" : "bg-indigo-400/45"}`} style={{ height: `${(s / maxSonno) * 100}%`, minHeight: s ? 4 : 0 }} />
              </div>
              <div className="text-[10px] text-muted">{iniziale(giorni[i])}</div>
            </div>
          ))}
        </div>
        <div className="mt-1 text-[10px] text-muted">La linea tratteggiata è il minimo di 7 ore.</div>
      </div>
    </div>
  );
}
