"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { giornoEffettivo } from "@/lib/calendario";
import { dataPiù, oggiLocale } from "@/lib/date";
import { fraseDomani, fraseMeteo, fraseSonno, fraseTurno, PAUSA_MINIMA_MS, saluto, segnaBenvenuto, ultimoBenvenuto } from "@/lib/benvenuto";
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
import GraficoLinea from "../progressi/GraficoLinea";

// Il benvenuto: la prima volta che apri l'app dopo una notte (o dopo il sonno seguito a un turno di notte) ti racconta la giornata, scrivendola a cascata.
const SALTA_SE_DA_NOTIFICA = "da=notifica";

export default function Benvenuto() {
  const { pronto, stato } = useStore();
  const percorso = usePathname();
  const [forzato] = useState(() => typeof location !== "undefined" && location.search.includes("benvenuto=1"));
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
    document.addEventListener("visibilitychange", cambio);
    return () => document.removeEventListener("visibilitychange", cambio);
  }, []);

  if (!pronto || chiuso || !voglio || !percorso.startsWith("/oggi")) return null;
  if (!forzato && !stato.impostazioni.benvenuto) return null;
  return <Schermata onChiudi={() => { segnaBenvenuto(); setChiuso(true); setVoglio(false); }} />;
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

type Voce =
  | { tipo: "testo"; testo: string; grande?: boolean; sync?: boolean }
  | { tipo: "grafico" }
  | { tipo: "riga"; testo: string };
type Blocco = Voce & { inizio: number; durata: number };

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
    const lista: Voce[] = [];
    lista.push({ tipo: "testo", testo: saluto(oraH, stato.impostazioni.nome), grande: true });
    if (stanotte) {
      lista.push({ tipo: "testo", testo: fraseSonno(stanotte.minuti, obiettivo) });
      lista.push({ tipo: "grafico" });
    } else if (dati !== null) {
      lista.push({ tipo: "testo", testo: "Il sonno di stanotte non è ancora arrivato dall'iPhone.", sync: true });
    }
    const turno = fraseTurno(giornoEffettivo(oggi));
    if (turno) lista.push({ tipo: "testo", testo: turno });
    if (meteo) lista.push({ tipo: "testo", testo: fraseMeteo(meteo) });

    const previste = stato.task.filter((x) => èPrevista(x, oggi, { vacanza: stato.vacanza }) && !èIgnorata(stato.ignorati, x.id, oggi) && !stato.completamenti.some((c) => c.taskId === x.id && c.data === oggi));
    const righe = previste
      .map((x) => { const m = momentoGiusto(x, oggi, stato.momenti.find((y) => y.taskId === x.id && y.data === oggi)); return { x, da: m?.da ?? 99999, orario: m ? hhmm(m.da) : "" }; })
      .sort((a, b) => a.da - b.da);
    lista.push({ tipo: "testo", testo: righe.length ? "Oggi la tua giornata prevede:" : "Oggi non hai task in programma. Giornata libera 🙌" });
    for (const r of righe) lista.push({ tipo: "riga", testo: `${r.orario ? `**${r.orario}** · ` : ""}${titoloTask(r.x, stato, oggi)}` });
    const dom = fraseDomani(giornoEffettivo(domani));
    if (dom) lista.push({ tipo: "testo", testo: dom });

    // la cascata: ogni blocco comincia quando finisce il precedente
    let cursore = 250;
    const out: Blocco[] = lista.map((b) => {
      const durata = b.tipo === "grafico" ? 500 : b.tipo === "riga" ? Math.min(450, lunghezza(b.testo) * 14) : Math.min(1200, Math.max(500, lunghezza(b.testo) * 20));
      const x: Blocco = { ...b, inizio: cursore, durata };
      cursore += durata + (b.tipo === "riga" ? 60 : 280);
      return x;
    });
    const punti = Array.from({ length: 7 }, (_, i) => { const g = dataPiù(calendario, i - 6); const n = nott.find((y) => y.giorno === g); return { etichetta: `${Number(g.slice(8))}/${Number(g.slice(5, 7))}`, v: n ? Math.round((n.minuti / 60) * 10) / 10 : null }; });
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
  const finito = partito && tt >= fine;
  const salta = () => setSaltato(true);
  const vai = (a: () => void) => { onChiudi(); a(); };

  return (
    <div className="dissolve fixed inset-0 z-[60] overflow-y-auto" style={{ background: "radial-gradient(120% 60% at 50% 0%, #14202e, #0a0f16 70%), #0a0f16" }} onClick={salta} role="dialog" aria-label="Benvenuto">
      <div className="mx-auto max-w-md px-6 pb-44" style={{ paddingTop: "calc(env(safe-area-inset-top) + 4.5rem)" }}>
        {!partito && <p className="text-[15px] text-muted">Controllo i dati…</p>}
        <div className="space-y-4 text-[17px] leading-relaxed text-foreground/85">
          {blocchi.map((b, i) => {
            if (tt < b.inizio) return null;
            const p = Math.max(0, Math.min(1, (tt - b.inizio) / b.durata));
            if (b.tipo === "grafico") {
              return (
                <div key={i} className="entra">
                  <GraficoLinea
                    titolo="Ore di sonno"
                    sotto="ultime 7 notti"
                    colore="#29a3f0"
                    punti={grafico.punti}
                    yMin={3} yMax={10} passo={1}
                    formatoY={(n) => `${n}h`}
                    riferimento={{ v: grafico.obiettivo / 60, etichetta: "obiettivo" }}
                    alto={130}
                  />
                </div>
              );
            }
            const n = Math.round(lunghezza(b.testo) * p);
            const scrivendo = p < 1;
            if (b.tipo === "riga") return <div key={i} className="!mt-1.5 flex gap-2 pl-1 text-[16px]"><span className="text-[#29a3f0]">•</span><span><Scritto testo={b.testo} quanti={n} cursore={scrivendo} /></span></div>;
            return (
              <p key={i} className={b.grande ? "text-[30px] font-extrabold leading-tight text-foreground" : ""}>
                <Scritto testo={b.testo} quanti={n} cursore={scrivendo} />
                {b.sync && !scrivendo && (
                  <a href={linkSincronizza()} onClick={(e) => e.stopPropagation()} className="mt-2 block w-fit rounded-full bg-ov/10 px-4 py-2 text-sm font-semibold text-[#7cc8f7]">Sincronizza ora</a>
                )}
              </p>
            );
          })}
        </div>
      </div>
      <div className={`fixed inset-x-0 bottom-0 px-6 pt-4 transition-opacity duration-500 ${finito ? "opacity-100" : "pointer-events-none opacity-0"}`} style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.25rem)", background: "linear-gradient(to top, #0a0f16 60%, transparent)" }}>
        <div className="mx-auto flex max-w-md flex-col gap-2.5">
          <button data-suono="via" onClick={(e) => { e.stopPropagation(); vai(() => {}); }} className="rounded-2xl bg-[#29a3f0] py-4 text-lg font-black tracking-wide text-[#04121f]">LET&apos;S GO!</button>
          <button data-suono="via" onClick={(e) => { e.stopPropagation(); vai(() => router.push("/task/")); }} className="rounded-2xl bg-ov/10 py-3 text-[15px] font-semibold text-foreground">Aggiungi qualcosa</button>
        </div>
      </div>
    </div>
  );
}
