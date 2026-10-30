"use client";

import { useEffect, useRef, useState } from "react";
import { dataPiù, inizioSettimana } from "@/lib/date";
import { èPrevista, livello, serie } from "@/lib/regole";
import { useStore } from "@/lib/store";

const VERDE = "#3dffa8";
const LARGHEZZA_BARRA = 20;

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

// L'intestazione si "scrive" a caratteri, una volta sola.
function useScrittura(testo: string, anima: boolean) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!anima) return;
    const id = setInterval(() => setN((x) => (x >= testo.length ? x : x + 1)), 35);
    return () => clearInterval(id);
  }, [testo, anima]);
  return anima ? testo.slice(0, n) : testo;
}

// Una riga: ETICHETTA [████████░░░░] 67%  dettaglio
function Riga({ etichetta, perc, dettaglio, anima }: { etichetta: string; perc: number; dettaglio: string; anima: boolean }) {
  const p = useConteggio(Math.max(0, Math.min(100, Math.round(perc))), anima);
  const pieni = Math.round((p / 100) * LARGHEZZA_BARRA);
  const fatto = p >= 100;
  return (
    <div className="grid grid-cols-[4.4rem_1fr_2.6rem_auto] items-center gap-x-1.5 leading-5">
      <span style={{ color: "rgba(61,255,168,0.65)" }}>{etichetta}</span>
      <span className="whitespace-nowrap" style={{ color: fatto ? "#d6ffe9" : VERDE, textShadow: fatto ? "0 0 8px rgba(61,255,168,0.9)" : undefined }}>
        [{"█".repeat(pieni)}
        <span style={{ color: "rgba(61,255,168,0.22)" }}>{"░".repeat(LARGHEZZA_BARRA - pieni)}</span>]
      </span>
      <span className="text-right font-bold tabular-nums" style={{ color: fatto ? "#d6ffe9" : VERDE }}>{p}%</span>
      <span className="text-[10px]" style={{ color: "rgba(61,255,168,0.5)" }}>{dettaglio}</span>
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

  const intestazione = "keepway@oggi:~$ ./status --live";
  const scritta = useScrittura(intestazione, anima);

  return (
    <div
      className="overflow-hidden rounded-2xl border bg-black p-3 font-mono text-[11px]"
      style={{ borderColor: "rgba(61,255,168,0.35)", boxShadow: "0 0 28px -10px rgba(61,255,168,0.6), inset 0 0 24px rgba(61,255,168,0.06)", color: VERDE }}
    >
      <div className="mb-1.5 flex items-center justify-between" style={{ color: "rgba(61,255,168,0.7)" }}>
        <span className="min-h-4">
          {scritta}
          <span className="cursore">█</span>
        </span>
        <span>0x{String(l.numero).padStart(2, "0")}</span>
      </div>

      <div className="mb-1 flex items-baseline justify-between border-b pb-1" style={{ borderColor: "rgba(61,255,168,0.18)" }}>
        <span className="text-[13px] font-bold uppercase tracking-widest">LV.{l.numero} {l.nome}</span>
        <span className="text-[13px] font-black tabular-nums" style={{ textShadow: "0 0 10px rgba(61,255,168,0.6)" }}>{xp} XP</span>
      </div>

      <Riga etichetta="XP→LV" perc={l.prossimo ? l.progresso * 100 : 100} dettaglio={l.prossimo ? `-${l.mancano}` : "MAX"} anima={anima} />
      <Riga etichetta="OGGI" perc={totale > 0 ? (fatte / totale) * 100 : 0} dettaglio={totale > 0 ? `${fatte}/${totale}` : "libero"} anima={anima} />
      <Riga etichetta="SETTIM" perc={previsteSett > 0 ? (fatteSett / previsteSett) * 100 : 0} dettaglio={`${fatteSett}/${previsteSett}`} anima={anima} />
      <Riga etichetta="SERIE" perc={(giorniSerie / traguardo) * 100} dettaglio={`${giorniSerie}/${traguardo}g`} anima={anima} />
      <Riga etichetta="COSTANZA" perc={(attivi / finestra) * 100} dettaglio={`${attivi}/${finestra}g`} anima={anima} />

      <div className="mt-1.5 flex flex-wrap justify-between gap-x-3 border-t pt-1 text-[10px]" style={{ borderColor: "rgba(61,255,168,0.18)", color: "rgba(61,255,168,0.65)" }}>
        <span>+{xpOggi} xp oggi</span>
        <span>Δ {variazione === null ? "n/d" : `${variazione >= 0 ? "+" : ""}${variazione}%`} vs 7g prima</span>
        <span>ETA {l.prossimo ? (eta ? `lv.${l.numero + 1} ~${eta}g` : "n/d") : "max"}</span>
      </div>
    </div>
  );
}
