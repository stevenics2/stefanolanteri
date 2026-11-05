"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { BedDouble, Briefcase, CalendarDays, Clock, Cloud, CloudFog, CloudLightning, CloudRain, CloudSun, ListChecks, Moon, Snowflake, Sun, Thermometer, type LucideIcon } from "lucide-react";
import { giornoEffettivo } from "@/lib/calendario";
import { dataPiù, oggiLocale } from "@/lib/date";
import { fraseDomani, fraseMeteo, fraseSonno, fraseTurno, iconaMeteo, iconaSaluto, PAUSA_MINIMA_MS, saluto, segnaBenvenuto, ultimoBenvenuto, type IconaMeteo } from "@/lib/benvenuto";
import { scaricaMeteo, type Meteo } from "@/lib/meteo";
import { momentoGiusto } from "@/lib/momento";
import { PAUSA_NOTTE_MS, pausaDaUltimoUso } from "@/lib/presenza";
import { èIgnorata, èPrevista } from "@/lib/regole";
import { linkSincronizza } from "@/lib/salute";
import { hhmm } from "@/lib/sonno";
import { notti } from "@/lib/sonnoProgressi";
import { titoloTask } from "@/lib/stanze";
import { useStore } from "@/lib/store";
import { useDatiSalute } from "@/lib/useSalute";
import AreaIcona, { iconaTask } from "./AreaIcona";
import GraficoLinea from "../progressi/GraficoLinea";

// Il benvenuto: la prima volta che apri l'app dopo una notte (o dopo il sonno seguito a un turno di notte) ti racconta la giornata, scrivendola a cascata.
const SALTA_SE_DA_NOTIFICA = "da=notifica";
export const EVENTO_RIVEDI_BENVENUTO = "keepway:benvenuto"; // lo manda il pulsante «Rivedi il benvenuto» in Impostazioni

export default function Benvenuto() {
  const { pronto, stato } = useStore();
  const percorso = usePathname();
  const [forzato, setForzato] = useState(() => typeof location !== "undefined" && location.search.includes("benvenuto=1"));
  const [voglio, setVoglio] = useState(() => {
    if (typeof location === "undefined") return false;
    if (location.search.includes("benvenuto=1")) return true;
    if (location.search.includes(SALTA_SE_DA_NOTIFICA)) return false; // arrivi da una notifica: vuoi fare una cosa precisa
    const u = ultimoBenvenuto();
    return pausaDaUltimoUso() >= PAUSA_NOTTE_MS && (u === null || Date.now() - u > PAUSA_MINIMA_MS);
  });
  const [chiuso, setChiuso] = useState(false);

  useEffect(() => {
    const cambio = () => {
      if (document.visibilityState !== "visible") return;
      const u = ultimoBenvenuto();
      if (pausaDaUltimoUso() >= PAUSA_NOTTE_MS && (u === null || Date.now() - u > PAUSA_MINIMA_MS)) setVoglio(true);
    };
    const rivedi = () => { setForzato(true); setChiuso(false); setVoglio(true); }; // da Impostazioni: si rivede subito, anche se spento o già visto
    document.addEventListener("visibilitychange", cambio);
    window.addEventListener(EVENTO_RIVEDI_BENVENUTO, rivedi);
    return () => {
      document.removeEventListener("visibilitychange", cambio);
      window.removeEventListener(EVENTO_RIVEDI_BENVENUTO, rivedi);
    };
  }, []);

  if (!pronto || chiuso || !voglio || !percorso.startsWith("/oggi")) return null;
  if (!forzato && !stato.impostazioni.benvenuto) return null;
  return <Schermata onChiudi={() => { segnaBenvenuto(); setChiuso(true); setVoglio(false); setForzato(false); }} />;
}

type Pezzo = { t: string; g: boolean };
const pezzi = (testo: string): Pezzo[] => testo.split("**").map((t, i) => ({ t, g: i % 2 === 1 })).filter((p) => p.t);
const lunghezza = (testo: string) => pezzi(testo).reduce((n, p) => n + p.t.length, 0);
function Scritto({ testo, quanti, cursore }: { testo: string; quanti: number; cursore: boolean }) {
  const ps = pezzi(testo);
  return (
    <>
      {ps.map((p, i) => {
        const prima = ps.slice(0, i).reduce((n, x) => n + x.t.length, 0);
        const x = p.t.slice(0, Math.max(0, quanti - prima));
        return x ? p.g ? <b key={i} className="font-bold text-foreground">{x}</b> : <span key={i}>{x}</span> : null;
      })}
      {cursore && <span className="cursore inline-block h-[1em] w-[2px] translate-y-[2px] bg-[#29a3f0] align-baseline" />}
    </>
  );
}

type IconaNome = "sole" | "solenuvola" | "luna" | "sonno" | "turno" | "domani" | "giornata" | IconaMeteo;
const ICONE: Record<IconaNome, LucideIcon> = {
  sole: Sun, solenuvola: CloudSun, luna: Moon, sonno: BedDouble, turno: Briefcase, domani: CalendarDays, giornata: ListChecks,
  nuvola: Cloud, nebbia: CloudFog, pioggia: CloudRain, neve: Snowflake, temporale: CloudLightning, termometro: Thermometer,
};
type CartaTask = { id: string; titolo: string; orario: string; colore: string; icona: string };
type Voce =
  | { tipo: "saluto"; testo: string; icona: IconaNome }
  | { tipo: "testo"; testo: string; icona: IconaNome; sync?: boolean }
  | { tipo: "grafico" }
  | { tipo: "task"; carta: CartaTask }
  | { tipo: "fine" };
type Blocco = Voce & { inizio: number; durata: number };

const Pastiglia = ({ nome, grande }: { nome: IconaNome; grande?: boolean }) => {
  const I = ICONE[nome];
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-full bg-[#29a3f0]/15 text-[#7cc8f7] ${grande ? "h-10 w-10" : "h-8 w-8"}`}>
      <I size={grande ? 22 : 17} strokeWidth={2} />
    </span>
  );
};

function Schermata({ onChiudi }: { onChiudi: () => void }) {
  const router = useRouter();
  const { stato, adesso } = useStore();
  const dati = useDatiSalute(14);
  const [meteo, setMeteo] = useState<Meteo | null>(null);
  const [meteoFatto, setMeteoFatto] = useState(false);
  const [scaduto, setScaduto] = useState(false);
  const [t, setT] = useState(0);
  const [saltato, setSaltato] = useState(false);
  const ridotto = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const scorri = useRef<HTMLDivElement>(null);
  const manuale = useRef(false); // se scorri tu con il dito, la pagina smette di scendere da sola

  useEffect(() => {
    void scaricaMeteo().then((m) => { setMeteo(m); setMeteoFatto(true); });
    const id = setTimeout(() => setScaduto(true), 2600); // non si aspetta all'infinito: si va avanti con quello che c'è
    return () => clearTimeout(id);
  }, []);

  const pronti = (dati !== null && meteoFatto) || scaduto;
  const oraH = adesso > 0 ? new Date(adesso).getHours() : new Date().getHours();
  const calendario = adesso > 0 ? oggiLocale(new Date(adesso)) : oggiLocale();
  const oggi = calendario;
  const domani = dataPiù(oggi, 1);

  const { blocchi, fine, grafico } = useMemo(() => {
    const giorni = dati?.giorni ?? [];
    const nott = notti(giorni);
    const stanotte = nott.find((n) => n.giorno === calendario) ?? null;
    const obiettivo = stato.impostazioni.obiettivoSonnoMin;
    const punti = Array.from({ length: 7 }, (_, i) => { const g = dataPiù(calendario, i - 6); const n = nott.find((y) => y.giorno === g); return { etichetta: `${Number(g.slice(8))}/${Number(g.slice(5, 7))}`, v: n ? Math.round((n.minuti / 60) * 10) / 10 : null }; });
    const lista: Voce[] = [];
    lista.push({ tipo: "saluto", testo: saluto(oraH, stato.impostazioni.nome), icona: iconaSaluto(oraH) });
    if (stanotte) lista.push({ tipo: "testo", testo: fraseSonno(stanotte.minuti, obiettivo), icona: "sonno" });
    else if (dati !== null) lista.push({ tipo: "testo", testo: "Il sonno di stanotte non è ancora arrivato dall'iPhone.", icona: "sonno", sync: true });
    if (punti.some((p) => p.v !== null)) lista.push({ tipo: "grafico" }); // anche se l'ultima notte non è ancora arrivata
    const turno = fraseTurno(giornoEffettivo(oggi));
    if (turno) lista.push({ tipo: "testo", testo: turno, icona: "turno" });
    if (meteo) lista.push({ tipo: "testo", testo: fraseMeteo(meteo), icona: iconaMeteo(meteo.codice) });

    const previste = stato.task.filter((x) => èPrevista(x, oggi, { vacanza: stato.vacanza }) && !èIgnorata(stato.ignorati, x.id, oggi) && !stato.completamenti.some((c) => c.taskId === x.id && c.data === oggi));
    const righe = previste
      .map((x) => { const m = momentoGiusto(x, oggi, stato.momenti.find((y) => y.taskId === x.id && y.data === oggi)); const area = stato.aree.find((a) => a.id === x.areaId); return { da: m?.da ?? 99999, carta: { id: x.id, titolo: titoloTask(x, stato, oggi), orario: m ? `${hhmm(m.da)}–${hhmm(m.a)}` : "", colore: area?.colore ?? "#888", icona: iconaTask(x, area?.icona ?? "") } }; })
      .sort((a, b) => a.da - b.da);
    lista.push({ tipo: "testo", testo: righe.length ? "Oggi la tua giornata prevede:" : "Oggi non hai task in programma. Giornata libera.", icona: "giornata" });
    for (const r of righe) lista.push({ tipo: "task", carta: r.carta });
    const dom = fraseDomani(giornoEffettivo(domani));
    if (dom) lista.push({ tipo: "testo", testo: dom, icona: "domani" });
    lista.push({ tipo: "fine" });

    // la cascata: ogni blocco comincia quando finisce il precedente
    let cursore = 150;
    const out: Blocco[] = lista.map((b) => {
      const testuale = b.tipo === "saluto" || b.tipo === "testo";
      const durata = b.tipo === "grafico" ? 300 : b.tipo === "task" ? 160 : b.tipo === "fine" ? 200 : testuale ? Math.min(750, Math.max(300, lunghezza(b.testo) * 12)) : 0;
      const x: Blocco = { ...b, inizio: cursore, durata };
      cursore += durata + (b.tipo === "task" ? 30 : 170);
      return x;
    });
    return { blocchi: out, fine: cursore, grafico: { punti, obiettivo } };
  }, [dati, meteo, stato, calendario, oggi, domani, oraH]);

  // il tempo scorre da solo; un tocco porta tutto alla fine
  const partito = pronti;
  useEffect(() => {
    if (!partito || ridotto || saltato) return;
    const inizio = performance.now();
    const id = setInterval(() => setT(Math.min(fine, performance.now() - inizio)), 40);
    return () => clearInterval(id);
  }, [partito, ridotto, saltato, fine]);

  const tt = ridotto || saltato ? fine : t; // con «riduci movimento», o con un tocco, tutto compare subito
  const salta = () => setSaltato(true);
  const vai = (a: () => void) => { onChiudi(); a(); };
  const visibili = partito ? blocchi.filter((b) => tt >= b.inizio).length : 0;

  // la pagina scende da sola man mano che compare altro (finché non scorri tu)
  useEffect(() => {
    const el = scorri.current;
    if (!el || manuale.current || visibili === 0) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [visibili, saltato]);

  return (
    <div ref={scorri} className="dissolve fixed inset-0 z-[60] overflow-y-auto" style={{ background: "radial-gradient(120% 60% at 50% 0%, #14202e, #0a0f16 70%), #0a0f16" }} onClick={salta} onTouchStart={() => { manuale.current = true; }} onWheel={() => { manuale.current = true; }} role="dialog" aria-label="Benvenuto">
      <div className="mx-auto max-w-md px-6" style={{ paddingTop: "calc(env(safe-area-inset-top) + 3.5rem)", paddingBottom: "calc(env(safe-area-inset-bottom) + 2.5rem)" }}>
        {!partito && <p className="text-[15px] text-muted">Controllo i dati…</p>}
        <div className="space-y-4 text-[16px] leading-relaxed text-foreground/85">
          {blocchi.map((b, i) => {
            if (!partito || tt < b.inizio) return null;
            const p = b.durata ? Math.max(0, Math.min(1, (tt - b.inizio) / b.durata)) : 1;
            if (b.tipo === "grafico") {
              return (
                <div key={i} className="entra rounded-2xl bg-card/70 p-3">
                  <GraficoLinea
                    titolo="Ore di sonno"
                    senzaIntestazione
                    colore="#29a3f0"
                    punti={grafico.punti}
                    yMin={3} yMax={10} passo={1}
                    formatoY={(n) => `${n}h`}
                    riferimento={{ v: grafico.obiettivo / 60, etichetta: "obiettivo" }}
                    alto={120}
                    annidato
                  />
                </div>
              );
            }
            if (b.tipo === "task") {
              const c = b.carta;
              return (
                <div key={i} className="entra !mt-2 flex items-center gap-3 rounded-2xl bg-card px-3 py-2.5" style={{ borderLeft: `4px solid ${c.colore}` }}>
                  <AreaIcona nome={c.icona} colore={c.colore} />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold leading-tight text-foreground">{c.titolo}</span>
                    {c.orario && <span className="mt-0.5 inline-flex items-center gap-1 text-xs font-semibold text-emerald-300"><Clock size={11} /> {c.orario}</span>}
                  </span>
                </div>
              );
            }
            if (b.tipo === "fine") {
              return (
                <div key={i} className="entra !mt-8 flex flex-col gap-2.5">
                  <button data-suono="via" onClick={(e) => { e.stopPropagation(); vai(() => {}); }} className="rounded-2xl bg-[#29a3f0] py-4 text-lg font-black tracking-wide text-[#04121f]">LET&apos;S GO!</button>
                  <button data-suono="via" onClick={(e) => { e.stopPropagation(); vai(() => router.push("/task/")); }} className="rounded-2xl bg-ov/10 py-3 text-[15px] font-semibold text-foreground">Aggiungi qualcosa</button>
                </div>
              );
            }
            const n = Math.round(lunghezza(b.testo) * p);
            const scrivendo = p < 1;
            if (b.tipo === "saluto") {
              return (
                <div key={i} className="flex items-center gap-3 text-[22px] font-bold leading-tight text-foreground">
                  <Pastiglia nome={b.icona} grande />
                  <span><Scritto testo={b.testo} quanti={n} cursore={scrivendo} /></span>
                </div>
              );
            }
            return (
              <div key={i} className="flex items-start gap-3">
                <span className="mt-0.5"><Pastiglia nome={b.icona} /></span>
                <p className="min-w-0 flex-1">
                  <Scritto testo={b.testo} quanti={n} cursore={scrivendo} />
                  {b.sync && !scrivendo && (
                    <a href={linkSincronizza()} onClick={(e) => e.stopPropagation()} className="mt-2 block w-fit rounded-full bg-ov/10 px-4 py-2 text-sm font-semibold text-[#7cc8f7]">Sincronizza ora</a>
                  )}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
