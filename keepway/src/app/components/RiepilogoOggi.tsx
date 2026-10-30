"use client";

import { useEffect, useRef, useState } from "react";
import { aperturaCorrente, èDaRiprodurre, iscriviApertura, segnaRiprodotta } from "@/lib/apertura";
import { dataPiù, inizioSettimana } from "@/lib/date";
import { èPrevista, livello, serie } from "@/lib/regole";
import { useStore } from "@/lib/store";

const COLORE = "#cdd6e0"; // argento freddo, neutro
const LARGHEZZA_BARRA = 10;

// Un numero che "sale" fino al valore (parte da 0 la prima volta, poi da dove era).
function useConteggio(valore: number, anima: boolean) {
  const [v, setV] = useState(0);
  const da = useRef(0);
  useEffect(() => {
    if (!anima) return;
    const inizio = performance.now();
    const partenza = da.current;
    let raf = 0;
    const passo = (t: number) => {
      const k = Math.min(1, (t - inizio) / 900);
      const x = Math.round(partenza + (valore - partenza) * (1 - Math.pow(1 - k, 3)));
      da.current = x;
      setV(x);
      if (k < 1) raf = requestAnimationFrame(passo);
    };
    raf = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(raf);
  }, [valore, anima]);
  return anima ? v : valore;
}

// Una riga: ETICHETTA [████████░░░░] 67%  dettaglio
function Riga({ etichetta, perc, dettaglio, anima }: { etichetta: string; perc: number; dettaglio: string; anima: boolean }) {
  const p = useConteggio(Math.max(0, Math.min(100, Math.round(perc))), anima);
  const pieni = Math.round((p / 100) * LARGHEZZA_BARRA);
  const fatto = p >= 100;
  return (
    <div className="grid grid-cols-[7.4rem_max-content_2.6rem_1fr] items-center gap-x-1.5 whitespace-nowrap leading-5">
      <span style={{ color: "rgba(205,214,224,0.7)" }}>{etichetta}</span>
      <span className="whitespace-nowrap" style={{ color: fatto ? "#ffffff" : COLORE, textShadow: fatto ? "0 0 8px rgba(205,214,224,0.9)" : undefined }}>
        [{"█".repeat(pieni)}
        <span style={{ color: "rgba(205,214,224,0.22)" }}>{"░".repeat(LARGHEZZA_BARRA - pieni)}</span>]
      </span>
      <span className="text-right font-bold tabular-nums" style={{ color: fatto ? "#ffffff" : COLORE }}>{p}%</span>
      <span className="text-right text-[10px]" style={{ color: "rgba(205,214,224,0.55)" }}>{dettaglio}</span>
    </div>
  );
}

const TRAGUARDI_SERIE = [3, 7, 14, 30, 60, 100];

// Il recap in cima a Oggi: una console da nerd. Percentuali e barre che avanzano su livello, giornata, settimana, serie e costanza.
export default function RiepilogoOggi({ fatte, totale }: { fatte: number; totale: number }) {
  const { stato, oggi, xp } = useStore();
  const anima = stato.impostazioni.animazioni;
  const l = livello(xp);

  // --- numeri ---
  const lunedi = inizioSettimana(oggi);
  const giorniSettimana: string[] = [];
  for (let d = lunedi; d <= oggi; d = dataPiù(d, 1)) giorniSettimana.push(d);
  const previsteSett = giorniSettimana.reduce((t, d) => t + stato.task.filter((x) => èPrevista(x, d, { vacanza: stato.vacanza })).length, 0);
  const fatteSett = stato.completamenti.filter((c) => c.data >= lunedi && c.data <= oggi).length;

  const giorniSerie = Math.max(0, ...stato.task.map((t) => serie(t, stato.completamenti, oggi, { vacanza: stato.vacanza }, stato.ignorati)));
  const traguardo = TRAGUARDI_SERIE.find((x) => x > giorniSerie) ?? giorniSerie + 30;

  // costanza: giorni con almeno una task fatta, sugli ultimi 30 (o da quando hai iniziato)
  const giorniConAttivita = new Set(stato.completamenti.map((c) => c.data));
  const primo = stato.completamenti.reduce((m, c) => (c.data < m ? c.data : m), oggi);
  const finestra = Math.min(30, Math.max(1, Math.round((Date.parse(oggi) - Date.parse(primo)) / 86_400_000) + 1));
  let attivi = 0;
  for (let i = 0; i < finestra; i++) if (giorniConAttivita.has(dataPiù(oggi, -i))) attivi++;

  // XP degli ultimi 7 giorni: media, variazione di oggi e tempo stimato al prossimo livello
  const xpGiorno = (d: string) => stato.completamenti.filter((c) => c.data === d).reduce((t, c) => t + c.punti + c.bonus, 0);
  const xpOggi = xpGiorno(oggi);
  const somma7 = (da: number) => Array.from({ length: 7 }, (_, i) => xpGiorno(dataPiù(oggi, -(i + da)))).reduce((a, b) => a + b, 0);
  const mediaPrima = somma7(1) / 7; // i 7 giorni PRIMA di oggi: il confronto è con la tua abitudine, non con oggi stesso
  const variazione = mediaPrima > 0 ? Math.round(((xpOggi - mediaPrima) / mediaPrima) * 100) : null;
  const mediaRecente = somma7(0) / 7; // gli ultimi 7 giorni, oggi compreso: per stimare quando arrivi al prossimo livello
  const eta = l.prossimo && mediaRecente > 0 ? Math.max(1, Math.ceil(l.mancano / mediaRecente)) : null;

  // Ogni volta che l'app si apre (o torna in primo piano) il recap fa l'animazione di ricalcolo
  const [apertura, setApertura] = useState(() => aperturaCorrente());
  useEffect(() => iscriviApertura(() => setApertura(aperturaCorrente())), []);

  return (
    // key: a ogni apertura (e a ogni giorno nuovo) il pannello si rimonta, e barre e scritta ripartono da zero
    <Pannello
      key={`${oggi}-${apertura}`}
      anima={anima}
      apertura={apertura}
      l={{ numero: l.numero, nome: l.nome, prossimo: !!l.prossimo, progresso: l.progresso, mancano: l.mancano }}
      xp={xp}
      righe={[
        { etichetta: "OGGI", perc: totale > 0 ? (fatte / totale) * 100 : 0, dettaglio: totale > 0 ? `${fatte}/${totale}` : "libero" },
        { etichetta: "SETTIMANALE", perc: previsteSett > 0 ? (fatteSett / previsteSett) * 100 : 0, dettaglio: `${fatteSett}/${previsteSett}` },
        { etichetta: "SERIE COMPLETATE", perc: (giorniSerie / traguardo) * 100, dettaglio: `${giorniSerie}/${traguardo}g` },
        { etichetta: "COSTANZA", perc: (attivi / finestra) * 100, dettaglio: `${attivi}/${finestra}g` },
        { etichetta: "XP PROSSIMO LEVEL", perc: l.prossimo ? l.progresso * 100 : 100, dettaglio: l.prossimo ? `-${l.mancano}` : "MAX" },
      ]}
      piede={{
        xpOggi,
        variazione: variazione === null ? "n/d" : `${variazione >= 0 ? "+" : ""}${variazione}%`,
        eta: l.prossimo ? (eta ? `lv.${l.numero + 1} ~${eta}g` : "n/d") : "max",
      }}
    />
  );
}

type RigaDati = { etichetta: string; perc: number; dettaglio: string };

// Il riquadro vero e proprio. A ogni apertura dell'app fa il "ricalcolo": una riga luminosa lo attraversa mentre le barre si ricontano, e a conti finiti un lampo.
function Pannello({
  anima, apertura, l, xp, righe, piede,
}: {
  anima: boolean;
  apertura: number;
  l: { numero: number; nome: string; prossimo: boolean; progresso: number; mancano: number };
  xp: number;
  righe: RigaDati[];
  piede: { xpOggi: number; variazione: string; eta: string };
}) {
  // Si decide una volta sola per apertura: cambiando scheda e tornando qui non riparte.
  const [ricalcolo] = useState(() => anima && èDaRiprodurre(apertura));
  useEffect(() => segnaRiprodotta(apertura), [apertura]);
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border bg-black p-3 font-mono text-[11px] ${ricalcolo ? "ricalcolo" : ""}`}
      style={{ borderColor: "rgba(205,214,224,0.35)", boxShadow: "0 0 28px -10px rgba(205,214,224,0.6), inset 0 0 24px rgba(205,214,224,0.06)", color: COLORE }}
    >
      {ricalcolo && <div className="lampo" aria-hidden />}
      {ricalcolo && <div className="scansione" aria-hidden />}

      <div className="relative">
        <div className="mb-1 flex items-baseline justify-between border-b pb-1" style={{ borderColor: "rgba(205,214,224,0.18)" }}>
          <span className="text-[13px] font-bold uppercase tracking-widest">LV.{l.numero} {l.nome}</span>
          <span className="text-[13px] font-black tabular-nums" style={{ textShadow: "0 0 10px rgba(205,214,224,0.6)" }}>{xp} XP</span>
        </div>

        {righe.map((r) => (
          <Riga key={r.etichetta} etichetta={r.etichetta} perc={r.perc} dettaglio={r.dettaglio} anima={anima} />
        ))}

        <div className="mt-1.5 flex flex-wrap justify-between gap-x-3 border-t pt-1 text-[10px]" style={{ borderColor: "rgba(205,214,224,0.18)", color: "rgba(205,214,224,0.65)" }}>
          <span>+{piede.xpOggi} xp oggi</span>
          <span>Δ {piede.variazione} vs 7g prima</span>
          <span>ETA {piede.eta}</span>
        </div>
      </div>
    </div>
  );
}
