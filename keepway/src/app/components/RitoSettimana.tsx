"use client";

import { CalendarCheck, ChevronRight, Minus, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { dataPiù } from "@/lib/date";
import { suono } from "@/lib/effetti";
import { giornata } from "@/lib/regole";
import { obiettiviDi, progressoObiettivi, ritoDaFare } from "@/lib/settimana";
import { useStore } from "@/lib/store";
import type { ObiettivoSett } from "@/lib/tipi";
import { useDatiSalute } from "@/lib/useSalute";
import { Schermo } from "../task/ui";
import VistaInsieme from "./VistaInsieme";
import { minutiNelGiorno } from "@/lib/giornoLogico";

const TITOLI = ["Com'è andata", "La settimana che arriva", "I tuoi obiettivi"];

// Il rito della domenica: una scheda in Oggi (dalla domenica pomeriggio e il lunedì, finché non l'hai fatto) che apre tre passi:
// com'è andata la settimana, il programma di quella che arriva (con i giorni troppo carichi), gli obiettivi. Alla fine «Settimana pronta».
export default function RitoSettimana() {
  const { stato, oggi, adesso, impostaSettimana } = useStore();
  const [aperto, setAperto] = useState(false);
  const [passo, setPasso] = useState(0);
  const [bozza, setBozza] = useState<ObiettivoSett[] | null>(null);
  const [finito, setFinito] = useState(false);
  const oraMin = adesso > 0 ? minutiNelGiorno(adesso, oggi) : 0;
  const lunedi = adesso > 0 ? ritoDaFare(stato, oggi, oraMin) : null;

  const dati = useDatiSalute(30);
  const scorsa = lunedi ? dataPiù(lunedi, -7) : null;
  const resoconto = useMemo(() => {
    if (!scorsa) return null;
    let previste = 0;
    let fatte = 0;
    for (let i = 0; i < 7; i++) {
      const g = giornata(stato, dataPiù(scorsa, i));
      previste += g.previste.length;
      fatte += g.fatte.length;
    }
    return { previste, fatte, perc: previste ? Math.round((fatte / previste) * 100) : null };
  }, [stato, scorsa]);

  if (!lunedi && !finito) return null;
  const obiettivi = bozza ?? obiettiviDi(stato);
  const apri = () => {
    setBozza(obiettiviDi(stato));
    setPasso(0);
    setAperto(true);
  };
  const cambia = (id: ObiettivoSett["id"], p: Partial<ObiettivoSett>) => setBozza((b) => (b ?? obiettiviDi(stato)).map((o) => (o.id === id ? { ...o, ...p } : o)));
  const conferma = () => {
    if (!lunedi) return;
    impostaSettimana({ programmata: lunedi, obiettivi });
    setFinito(true);
    if (stato.impostazioni.suoni) suono("slot");
    setTimeout(() => {
      setFinito(false);
      setAperto(false);
    }, 1600);
  };

  return (
    <>
      {lunedi && !aperto && (
        <button data-suono="via" onClick={apri} className="entra flex w-full items-center gap-3 rounded-2xl border border-violet-400/40 bg-gradient-to-r from-violet-500/20 to-sky-500/10 p-3 text-left">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-violet-500/25 text-violet-200"><CalendarCheck size={22} /></span>
          <span className="min-w-0 flex-1">
            <span className="block font-bold">Prepara la settimana</span>
            <span className="block text-xs text-muted">Cinque minuti per partire alla grande: com&apos;è andata, il programma e gli obiettivi.</span>
          </span>
          <ChevronRight size={18} className="shrink-0 text-muted" />
        </button>
      )}

      {aperto && (
        <Schermo titolo="Prepara la settimana" onClose={() => setAperto(false)}>
          {finito ? (
            <div className="py-16 text-center" aria-live="polite">
              <svg viewBox="0 0 96 96" className="spunta-pop mx-auto h-24 w-24" style={{ filter: "drop-shadow(0 0 14px rgba(34,197,94,0.55))" }}>
                <circle cx="48" cy="48" r="42" fill="rgba(34,197,94,0.15)" stroke="#22c55e" strokeWidth="5" />
                <path d="M28 49 L43 64 L69 34" pathLength={1} fill="none" stroke="#22c55e" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" className="spunta-segno" />
              </svg>
              <div className="entra mt-4 text-2xl font-black text-green-400">Settimana pronta</div>
              <div className="mt-1 text-sm text-muted">Buon lunedì: si parte alla grande.</div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-1.5">
                {TITOLI.map((t, i) => <span key={t} className="h-1.5 flex-1 rounded-full transition-colors duration-300" style={{ background: i <= passo ? "var(--accent)" : "rgba(128,128,128,0.25)" }} />)}
              </div>
              <h2 className="text-lg font-bold">{passo + 1}. {TITOLI[passo]}</h2>

              {passo === 0 && scorsa && (
                <div className="dissolve space-y-3">
                  <div className="rounded-2xl bg-card p-4 text-center">
                    <div className="text-xs text-muted">Task fatte la settimana scorsa</div>
                    <div className="text-4xl font-black tabular-nums" style={{ color: (resoconto?.perc ?? 0) >= 75 ? "#4ade80" : (resoconto?.perc ?? 0) >= 50 ? "#fbbf24" : "#f87171" }}>{resoconto?.perc ?? "—"}{resoconto?.perc !== null && "%"}</div>
                    <div className="text-xs text-muted">{resoconto?.fatte} su {resoconto?.previste}</div>
                  </div>
                  <div className="space-y-2">
                    {progressoObiettivi(stato, scorsa, dati?.giorni ?? [], oggi).map((o) => (
                      <div key={o.id} className="flex items-center justify-between rounded-xl bg-card px-3 py-2 text-sm">
                        <span>{o.titolo}</span>
                        <b style={{ color: o.fatto ? "#4ade80" : "#f87171" }}>{o.valore}/{o.target} {o.fatto ? "✓" : ""}</b>
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-muted">{(resoconto?.perc ?? 0) >= 75 ? "Settimana solida: tieni questo ritmo." : (resoconto?.perc ?? 0) >= 50 ? "Una buona base. La nuova settimana è il momento di alzare un po' l'asticella." : "Non è andata come volevi, e va bene: ripartire con un programma chiaro è già metà del lavoro."}</p>
                </div>
              )}

              {passo === 1 && lunedi && (
                <div className="dissolve">
                  <p className="mb-3 text-sm text-muted">Ecco la settimana che arriva, giorno per giorno. Se vedi un giorno troppo carico, cambialo adesso dal Task.</p>
                  <VistaInsieme lunedi={lunedi} onApriGiorno={() => {}} />
                </div>
              )}

              {passo === 2 && (
                <div className="dissolve space-y-2">
                  <p className="text-sm text-muted">Scegli pochi obiettivi, veri. Li vedi in Oggi quando tocchi un giorno.</p>
                  {obiettivi.filter((o) => o.id !== "libero").map((o) => (
                    <div key={o.id} className="flex items-center justify-between rounded-2xl bg-card px-3 py-2.5">
                      <label className="flex items-center gap-2 text-sm font-medium">
                        <input type="checkbox" checked={o.attivo} onChange={(e) => cambia(o.id, { attivo: e.target.checked })} className="h-4 w-4 accent-amber-500" />
                        {o.id === "allenamenti" ? "Allenamenti" : o.id === "notti" ? "Notti sopra l'obiettivo di sonno" : "Giornate piene"}
                      </label>
                      <div className={`flex items-center gap-2 ${o.attivo ? "" : "opacity-40"}`}>
                        <button type="button" aria-label="Meno" disabled={!o.attivo || o.target <= 1} data-suono="nessuno" onClick={() => cambia(o.id, { target: o.target - 1 })} className="rounded-full bg-ov/10 p-1.5 disabled:opacity-30"><Minus size={14} /></button>
                        <span className="w-5 text-center font-bold tabular-nums">{o.target}</span>
                        <button type="button" aria-label="Più" disabled={!o.attivo || o.target >= 7} data-suono="nessuno" onClick={() => cambia(o.id, { target: o.target + 1 })} className="rounded-full bg-ov/10 p-1.5 disabled:opacity-30"><Plus size={14} /></button>
                      </div>
                    </div>
                  ))}
                  {(() => {
                    const l = obiettivi.find((o) => o.id === "libero");
                    return (
                      <div className="rounded-2xl bg-card px-3 py-2.5">
                        <label className="flex items-center gap-2 text-sm font-medium">
                          <input type="checkbox" checked={!!l?.attivo} onChange={(e) => cambia("libero", { attivo: e.target.checked })} className="h-4 w-4 accent-amber-500" />
                          Un obiettivo tuo
                        </label>
                        {l?.attivo && <input value={l.testo ?? ""} onChange={(e) => cambia("libero", { testo: e.target.value })} placeholder="Es. Chiamare il dentista" maxLength={60} className="mt-2 w-full rounded-xl bg-ov/10 px-3 py-2 text-sm" />}
                      </div>
                    );
                  })()}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                {passo > 0 && <button data-suono="indietro" onClick={() => setPasso(passo - 1)} className="rounded-2xl bg-ov/10 px-5 py-3 font-semibold">Indietro</button>}
                {passo < 2 ? (
                  <button data-suono="via" onClick={() => setPasso(passo + 1)} className="flex-1 rounded-2xl bg-accent py-3 font-bold text-black">Avanti</button>
                ) : (
                  <button data-suono="ok" onClick={conferma} className="flex-1 rounded-2xl bg-accent py-3 text-lg font-bold text-black">Conferma la settimana</button>
                )}
              </div>
            </>
          )}
        </Schermo>
      )}
    </>
  );
}
