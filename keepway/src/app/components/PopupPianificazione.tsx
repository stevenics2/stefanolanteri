"use client";

import { CalendarClock, CalendarCog, Check, Clock } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { proposte, analizzaGiorno, type Proposta } from "@/lib/allenamento";
import { GIORNI_LUNGHI, giornoSettimana } from "@/lib/date";
import { suono } from "@/lib/effetti";
import { hhmm } from "@/lib/sonno";
import { useStore } from "@/lib/store";
import type { PianoVoce, Task } from "@/lib/tipi";
import Presenza from "./Presenza";

const ELABORAZIONE_MS = 1500;
const SALVATAGGIO_MS = 2000; // «Pianificazione…»: le task nuove si compilano una dopo l'altra
const PIANIFICATO_MS = 1200; // «Pianificato» con la spunta verde, poi il popup si chiude

type Esito = { indice: number; voci: PianoVoce[] };

// Il popup della «Pianificazione automatica»: 1,5 secondi di «elaborazione» con animazione, un lampo, poi il riassunto
// («Martedì 09:00 · Giovedì 18:00 · Sabato 17:00») con il tasto Pianifica. Ci sono sempre 2-3 proposte, da scorrere con il dito.
// Se le hai viste tutte e nessuna va bene, compare «Pianificazione manuale».
export default function PopupPianificazione({
  bozza, onConferma, onManuale, onChiudi,
}: { bozza: Task | null; onConferma: (e: Esito) => void; onManuale: () => void; onChiudi: () => void }) {
  return (
    <Presenza dato={bozza} ms={300}>
      {(t, uscendo) => <Contenuto key={t.id} bozza={t} uscendo={uscendo} onConferma={onConferma} onManuale={onManuale} onChiudi={onChiudi} />}
    </Presenza>
  );
}

function Contenuto({
  bozza, uscendo, onConferma, onManuale, onChiudi,
}: { bozza: Task; uscendo: boolean; onConferma: (e: Esito) => void; onManuale: () => void; onChiudi: () => void }) {
  const { stato, oggi } = useStore();
  const [pronta, setPronta] = useState(false);
  const [indice, setIndice] = useState(0);
  const [viste, setViste] = useState<number[]>([0]);
  const scorri = useRef<HTMLDivElement>(null);
  const suoni = stato.impostazioni.suoni;
  const animazioni = stato.impostazioni.animazioni;
  const [fase, setFase] = useState<"scelta" | "salvo" | "fatto">("scelta");
  const [vociScelte, setVociScelte] = useState<PianoVoce[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => {
    const t = timer.current;
    return () => t.forEach(clearTimeout);
  }, []);

  // «Pianifica»: prima «Pianificazione…», poi «Pianificato» con la spunta verde, e solo dopo si salva e si chiude.
  const conferma = (e: Esito) => {
    if (!animazioni) return onConferma(e);
    setVociScelte(e.voci);
    setFase("salvo");
    timer.current.push(
      setTimeout(() => {
        setFase("fatto");
        if (suoni) suono("slot");
      }, SALVATAGGIO_MS),
      setTimeout(() => onConferma(e), SALVATAGGIO_MS + PIANIFICATO_MS),
    );
  };

  // Le proposte si calcolano subito (sono rapide); la «elaborazione» è una pausa con animazione
  const elenco: Proposta[] = useMemo(() => proposte(stato, bozza, oggi, 3), [stato, bozza, oggi]);

  useEffect(() => {
    const t = setTimeout(() => {
      setPronta(true);
      if (suoni) suono("via");
    }, ELABORAZIONE_MS);
    return () => clearTimeout(t);
  }, [suoni]);

  const sulloScorrimento = () => {
    const el = scorri.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    setIndice(i);
    setViste((v) => (v.includes(i) ? v : [...v, i]));
  };
  const vaiA = (i: number) => scorri.current?.scrollTo({ left: i * (scorri.current?.clientWidth ?? 0), behavior: "smooth" });

  const r = bozza.ricorrenza;
  const ritmo = r.tipo === "auto" ? `${r.volte} ${r.volte === 1 ? "volta" : "volte"} a settimana` : r.tipo === "intervallo" ? `ogni ${r.ogni} giorni${r.tolleranza ? ` (fino a ${r.ogni + r.tolleranza})` : " esatti"}` : "";
  const tutteViste = elenco.length > 0 && viste.length >= elenco.length;

  return (
    <div className={`fixed inset-0 z-[70] flex items-center justify-center bg-black/65 px-4 backdrop-blur-sm ${uscendo ? "vela-fuori" : "vela-dentro"}`}>
      <div className={`relative w-full max-w-sm overflow-hidden rounded-3xl border border-ov/15 bg-card p-5 shadow-2xl ${uscendo ? "carta-fuori" : "carta-dentro"}`}>
        {fase === "salvo" ? (
          <div className="py-1" aria-live="polite">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
              <span className="pianifica-anello h-3.5 w-3.5 rounded-full border-2" style={{ borderColor: "rgba(34,197,94,0.25)", borderTopColor: "#22c55e" }} />
              {bozza.titolo}
            </div>
            <div className="dissolve mt-1 text-xl font-bold">Pianificazione<span className="pianifica-punti" /></div>
            <div className="mt-3 space-y-1.5">
              {vociScelte.map((v, i) => {
                const passo = Math.min(0.3, 1.3 / Math.max(1, vociScelte.length));
                const ritardo = 0.1 + i * passo;
                return (
                  <div key={v.data} className="compila-riga flex items-center gap-2 rounded-xl bg-ov/10 px-3 py-2" style={{ animationDelay: `${ritardo}s` }}>
                    <span className="compila-testo text-sm font-bold capitalize" style={{ animationDelay: `${ritardo + 0.05}s` }}>{GIORNI_LUNGHI[giornoSettimana(v.data)]} {Number(v.data.slice(8))}</span>
                    {v.da !== undefined && v.a !== undefined && (
                      <span className="compila-testo ml-auto inline-flex items-center gap-1 whitespace-nowrap text-xs font-semibold text-emerald-300" style={{ animationDelay: `${ritardo + 0.2}s` }}>
                        <Clock size={12} /> {hhmm(v.da)}–{hhmm(v.a)}
                      </span>
                    )}
                    <span className="compila-spunta text-green-400" style={{ animationDelay: `${ritardo + 0.5}s` }}><Check size={15} strokeWidth={3} /></span>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-ov/10">
              <div className="h-full rounded-full bg-green-500" style={{ animation: `barraElabora ${SALVATAGGIO_MS}ms linear both` }} />
            </div>
          </div>
        ) : fase === "fatto" ? (
          <div className="py-8 text-center" aria-live="polite">
            <div className="relative mx-auto flex h-24 w-24 items-center justify-center">
              <svg key="spunta" viewBox="0 0 96 96" className="spunta-pop h-24 w-24" style={{ filter: "drop-shadow(0 0 14px rgba(34,197,94,0.55))" }}>
                <circle cx="48" cy="48" r="42" fill="rgba(34,197,94,0.15)" stroke="#22c55e" strokeWidth="5" />
                <path d="M28 49 L43 64 L69 34" pathLength={1} fill="none" stroke="#22c55e" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" className="spunta-segno" />
              </svg>
            </div>
            <div key="fatto" className="entra mt-4">
              <div className="text-2xl font-black text-green-400">Pianificato</div>
              <div className="mt-1 text-sm text-muted">{vociScelte.length} {vociScelte.length === 1 ? "giorno" : "giorni"} nel tuo piano</div>
            </div>
          </div>
        ) : !pronta ? (
          <div className="py-4 text-center">
            <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
              <span className="pianifica-anello absolute inset-0 rounded-full border-[3px]" style={{ borderColor: "rgba(250,17,79,0.25)", borderTopColor: "#fa114f" }} />
              <span className="pianifica-anello-2 absolute inset-[7px] rounded-full border-[3px]" style={{ borderColor: "rgba(146,240,0,0.25)", borderBottomColor: "#92f000" }} />
              <span className="pianifica-anello absolute inset-[14px] rounded-full border-[3px]" style={{ borderColor: "rgba(0,217,232,0.25)", borderTopColor: "#00d9e8", animationDuration: "0.7s" }} />
              <CalendarClock size={22} className="text-foreground" />
            </div>
            <div className="mt-4 text-xl font-bold">Pianifico<span className="pianifica-punti" /></div>
            <div className="mt-1 text-sm text-muted">Controllo turni, sonno e appuntamenti</div>
            <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-ov/10">
              <div className="pianifica-barra h-full rounded-full bg-accent" />
            </div>
            <div className="mt-4 space-y-2">
              {[78, 62, 70].map((w, i) => (
                <div key={i} className="relative h-3 overflow-hidden rounded-full bg-ov/10" style={{ width: `${w}%` }}>
                  <span className="pianifica-scheletro absolute inset-0" style={{ animationDelay: `${i * 0.18}s` }} />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            <span key="flash" className="flash-pianifica pointer-events-none absolute inset-0 z-20" aria-hidden />
            <div className="entra">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted">
                {bozza.titolo}{ritmo ? ` · ${ritmo}` : ""}
              </div>
              <div className="mt-0.5 text-xl font-bold">Ecco la proposta</div>
              {r.tipo === "intervallo" && <div className="mt-0.5 text-xs text-muted">Le date successive si contano dall&apos;ultima volta che la fai.</div>}
            </div>

            {elenco.length === 0 ? (
              <p className="mt-4 text-sm text-muted">Nei prossimi giorni non trovo un momento adatto: turni, sonno e appuntamenti non lasciano spazio. Puoi scegliere i giorni a mano.</p>
            ) : (
              <>
                <div ref={scorri} onScroll={sulloScorrimento} className="no-scrollbar -mx-5 mt-3 flex snap-x snap-mandatory overflow-x-auto">
                  {elenco.map((p, i) => (
                    <div key={i} className="w-full shrink-0 snap-center px-5">
                      <div className="mb-2 text-xs text-muted">Proposta {i + 1} di {elenco.length}{elenco.length > 1 && i < elenco.length - 1 ? " · scorri per vedere le altre" : ""}</div>
                      <div className="stagger space-y-1.5" key={`${i}-${indice === i}`}>
                        {p.voci.map((v) => {
                          const nota = analizzaGiorno(bozza, v.data, stato.eventi).nota;
                          return (
                            <div key={v.data} className="rounded-xl bg-ov/10 px-3 py-2.5">
                              <div className="text-base font-bold capitalize">{GIORNI_LUNGHI[giornoSettimana(v.data)]} {Number(v.data.slice(8))}</div>
                              {v.da !== undefined && v.a !== undefined && (
                                <div className="mt-1 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-300">
                                  <Clock size={12} /> Orario suggerito: {hhmm(v.da)}–{hhmm(v.a)}
                                </div>
                              )}
                              {nota && <div className="mt-1 text-[11px] text-muted">{nota}</div>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                {elenco.length > 1 && (
                  <div className="mt-3 flex justify-center gap-1.5">
                    {elenco.map((_, i) => (
                      <button key={i} aria-label={`Proposta ${i + 1}`} data-suono="nessuno" onClick={() => vaiA(i)} className={`h-1.5 rounded-full transition-all duration-300 ${i === indice ? "w-5 bg-accent" : "w-1.5 bg-ov/25"}`} />
                    ))}
                  </div>
                )}
              </>
            )}

            <div className="mt-4 space-y-2">
              {elenco.length > 0 && (
                <button
                  data-suono="ok"
                  onClick={() => conferma({ indice, voci: elenco[Math.min(indice, elenco.length - 1)].voci })}
                  className="w-full rounded-2xl bg-accent py-3.5 text-lg font-bold text-black"
                >
                  Pianifica
                </button>
              )}
              {/* «Pianificazione manuale» compare molto piano, e la scheda si allarga con dolcezza */}
              <div className={`compare-piano ${tutteViste || elenco.length <= 1 ? "visibile" : ""}`} aria-hidden={!(tutteViste || elenco.length <= 1)}>
                <div>
                  <button tabIndex={tutteViste || elenco.length <= 1 ? 0 : -1} data-suono="via" onClick={onManuale} className="mb-0.5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-ov/10 py-3 font-semibold">
                    <CalendarCog size={18} /> Pianificazione manuale
                  </button>
                </div>
              </div>
              <button data-suono="indietro" onClick={onChiudi} className="w-full py-2 text-sm text-muted">Annulla</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
