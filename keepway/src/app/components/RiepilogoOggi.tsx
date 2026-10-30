"use client";

import { useEffect, useRef, useState } from "react";
import { aperturaCorrente, èDaRiprodurre, iscriviApertura, segnaRiprodotta } from "@/lib/apertura";
import { dataPiù, inizioSettimana } from "@/lib/date";
import { suonoApertura } from "@/lib/effetti";
import { bossSettimana, èPrevista, livello, serie } from "@/lib/regole";
import { titoloTask } from "@/lib/stanze";
import { useStore } from "@/lib/store";

type Rgb = [number, number, number];
const FREDDO: Rgb = [205, 214, 224]; // argento freddo
const CALDO: Rgb = [255, 233, 189]; // bianco caldo
const CORALLO: Rgb = [255, 150, 134]; // il boss
const VERDE: Rgb = [110, 231, 150]; // giornata completata
const LARGHEZZA_BARRA = 10;
const COMBO_PAUSA_MS = 60 * 60_000;

const mescola = (k: number): Rgb => FREDDO.map((v, i) => Math.round(v + (CALDO[i] - v) * Math.max(0, Math.min(1, k)))) as Rgb;
const rgba = (c: Rgb, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

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

// Gli XP come un contachilometri: ogni cifra scorre verso il suo valore.
function Odometro({ valore, anima }: { valore: number; anima: boolean }) {
  const [montato, setMontato] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMontato(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const cifre = String(Math.max(0, valore)).split("").map(Number);
  return (
    <span className="inline-flex" aria-label={String(valore)}>
      {cifre.map((d, i) => (
        <span key={cifre.length - i} className="inline-block h-[1em] overflow-hidden leading-none">
          <span className="block" style={{ transform: `translateY(-${anima && !montato ? 0 : d}em)`, transition: anima ? "transform 1.1s cubic-bezier(.2,.8,.2,1)" : "none" }}>
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
              <span key={n} className="block h-[1em] leading-[1em]">{n}</span>
            ))}
          </span>
        </span>
      ))}
    </span>
  );
}

// Una riga: ETICHETTA [████████░░] 67%  dettaglio. Quando il valore cambia lampeggia; a 100% si illumina d'oro.
function Riga({
  etichetta, perc, dettaglio, anima, col, pulsa = false, evidenzia,
}: { etichetta: string; perc: number; dettaglio: string; anima: boolean; col: Rgb; pulsa?: boolean; evidenzia?: boolean }) {
  const p = useConteggio(Math.max(0, Math.min(100, Math.round(perc))), anima);
  const el = useRef<HTMLDivElement>(null);
  const prec = useRef<number | null>(null);
  useEffect(() => {
    const e = el.current;
    const prima = prec.current;
    prec.current = perc;
    if (!e || prima === null || !anima || Math.abs(perc - prima) < 0.4) return;
    const classe = perc >= 100 && prima < 100 ? "riga-oro" : "riga-flash";
    e.classList.remove("riga-flash", "riga-oro");
    void e.offsetWidth; // fa ripartire l'animazione
    e.classList.add(classe);
  }, [perc, anima]);

  const pieni = Math.round((p / 100) * LARGHEZZA_BARRA);
  const fatto = evidenzia ?? p >= 100; // di solito a 100%; il boss si illumina da KO, non a vita piena
  return (
    <div ref={el} className={`grid grid-cols-[7.4rem_max-content_2.6rem_1fr] items-center gap-x-1.5 whitespace-nowrap leading-5 ${pulsa ? "pulsa" : ""}`}>
      <span style={{ color: rgba(col, 0.7) }}>{etichetta}</span>
      <span style={{ color: fatto ? "#ffffff" : rgba(col), textShadow: fatto ? `0 0 8px ${rgba(col, 0.9)}` : undefined }}>
        [{"█".repeat(pieni)}
        <span style={{ color: rgba(col, 0.22) }}>{"░".repeat(LARGHEZZA_BARRA - pieni)}</span>]
      </span>
      <span className="text-right font-bold tabular-nums" style={{ color: fatto ? "#ffffff" : rgba(col) }}>{p}%</span>
      <span className="text-right text-[10px]" style={{ color: rgba(col, 0.55) }}>{dettaglio}</span>
    </div>
  );
}

const TRAGUARDI_SERIE = [3, 7, 14, 30, 60, 100];
const ora2 = (n: number) => String(n).padStart(2, "0");

// Il recap in cima a Oggi: una console da nerd. Barre e percentuali che avanzano, boss della settimana, combo, record.
export default function RiepilogoOggi({ fatte, totale }: { fatte: number; totale: number }) {
  const { stato, oggi, adesso, xp } = useStore();
  const anima = stato.impostazioni.animazioni;
  const l = livello(xp);

  // --- settimana, serie, costanza ---
  const lunedi = inizioSettimana(oggi);
  const giorniSettimana: string[] = [];
  for (let d = lunedi; d <= oggi; d = dataPiù(d, 1)) giorniSettimana.push(d);
  const previsteSett = giorniSettimana.reduce((t, d) => t + stato.task.filter((x) => èPrevista(x, d, { vacanza: stato.vacanza })).length, 0);
  const fatteSett = stato.completamenti.filter((c) => c.data >= lunedi && c.data <= oggi).length;

  const giorniSerie = Math.max(0, ...stato.task.map((t) => serie(t, stato.completamenti, oggi, { vacanza: stato.vacanza }, stato.ignorati)));
  const traguardo = TRAGUARDI_SERIE.find((x) => x > giorniSerie) ?? giorniSerie + 30;

  const giorniConAttivita = new Set(stato.completamenti.map((c) => c.data));
  const primo = stato.completamenti.reduce((m, c) => (c.data < m ? c.data : m), oggi);
  const finestra = Math.min(30, Math.max(1, Math.round((Date.parse(oggi) - Date.parse(primo)) / 86_400_000) + 1));
  let attivi = 0;
  for (let i = 0; i < finestra; i++) if (giorniConAttivita.has(dataPiù(oggi, -i))) attivi++;

  // --- il boss della settimana ---
  const boss = bossSettimana(stato, oggi);

  // --- XP: media, variazione, tempo al prossimo livello ---
  const xpGiorno = (d: string) =>
    stato.completamenti.filter((c) => c.data === d).reduce((t, c) => t + c.punti + c.bonus, 0) + stato.bonus.filter((b) => b.data === d).reduce((t, b) => t + b.xp, 0);
  const xpOggi = xpGiorno(oggi);
  const somma7 = (da: number) => Array.from({ length: 7 }, (_, i) => xpGiorno(dataPiù(oggi, -(i + da)))).reduce((a, b) => a + b, 0);
  const mediaPrima = somma7(1) / 7;
  const variazione = mediaPrima > 0 ? Math.round(((xpOggi - mediaPrima) / mediaPrima) * 100) : null;
  const mediaRecente = somma7(0) / 7;
  const eta = l.prossimo && mediaRecente > 0 ? Math.max(1, Math.ceil(l.mancano / mediaRecente)) : null;

  // --- combo (task di fila, pause sotto l'ora) e record di task in un giorno ---
  const oggiOrdinate = stato.completamenti.filter((c) => c.data === oggi).sort((a, b) => a.ts - b.ts);
  let combo = 0;
  let rif = adesso;
  for (let i = oggiOrdinate.length - 1; i >= 0 && adesso > 0; i--) {
    if (rif - oggiOrdinate[i].ts > COMBO_PAUSA_MS) break;
    combo++;
    rif = oggiOrdinate[i].ts;
  }
  const perGiorno = new Map<string, number>();
  for (const c of stato.completamenti) perGiorno.set(c.data, (perGiorno.get(c.data) ?? 0) + 1);
  const recordMax = Math.max(0, ...perGiorno.values());

  // --- le ultime task fatte, come righe di log ---
  const log = [...stato.completamenti]
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 2)
    .map((c) => {
      const t = stato.task.find((x) => x.id === c.taskId);
      const d = new Date(c.ts);
      const nome = c.nota ? `sistema ${c.nota}` : t ? titoloTask(t, stato, oggi).toLowerCase() : "task";
      return `[${c.data === oggi ? "" : `${ora2(d.getDate())}/${ora2(d.getMonth() + 1)} `}${ora2(d.getHours())}:${ora2(d.getMinutes())}] ${nome} OK +${c.punti + c.bonus}xp`;
    });

  // --- "quasi ci sei": la riga di oggi pulsa e c'è un invito ---
  const percOggi = totale > 0 ? (fatte / totale) * 100 : 0;
  const quasi = totale > 0 && fatte < totale && (percOggi >= 80 || (totale - fatte === 1 && fatte >= 2)); // sopra l'80%, o ne manca una sola
  const nudge = quasi ? `» manca ${totale - fatte === 1 ? "1 task" : `${totale - fatte} task`} per chiudere la giornata` : null;

  // il colore si scalda man mano che la giornata avanza: dall'argento al bianco caldo
  // a giornata completata tutto diventa verde
  const tutto = totale > 0 && fatte >= totale;
  const rgb = tutto ? VERDE : mescola(totale > 0 ? fatte / totale : 0);

  const [apertura, setApertura] = useState(() => aperturaCorrente());
  useEffect(() => iscriviApertura(() => setApertura(aperturaCorrente())), []);

  return (
    <Pannello
      key={`${oggi}-${apertura}`}
      anima={anima}
      suoni={stato.impostazioni.suoni}
      apertura={apertura}
      rgb={rgb}
      l={{ numero: l.numero, nome: l.nome }}
      xp={xp}
      nudge={nudge}
      tutto={tutto}
      log={log}
      righe={[
        { etichetta: "OGGI", perc: percOggi, dettaglio: totale > 0 ? `${fatte}/${totale}` : "libero", pulsa: quasi },
        { etichetta: "SETTIMANALE", perc: previsteSett > 0 ? (fatteSett / previsteSett) * 100 : 0, dettaglio: `${fatteSett}/${previsteSett}` },
        { etichetta: "BOSS SETTIMANA", perc: boss.pianificate > 0 ? (boss.hp / boss.pianificate) * 100 : 0, dettaglio: boss.sconfitto ? "KO!" : `${boss.hp} hp`, rosso: true },
        { etichetta: "SERIE COMPLETATE", perc: (giorniSerie / traguardo) * 100, dettaglio: `${giorniSerie}/${traguardo}g` },
        { etichetta: "COSTANZA", perc: (attivi / finestra) * 100, dettaglio: `${attivi}/${finestra}g` },
        { etichetta: "XP PROSSIMO LEVEL", perc: l.prossimo ? l.progresso * 100 : 100, dettaglio: l.prossimo ? `-${l.mancano}` : "MAX" },
      ]}
      piede={{
        xpOggi,
        variazione: variazione === null ? "n/d" : `${variazione >= 0 ? "+" : ""}${variazione}%`,
        eta: l.prossimo ? (eta ? `lv.${l.numero + 1} ~${eta}g` : "n/d") : "max",
        combo: combo >= 3 ? `COMBO x${combo} · xp x1.5` : combo > 0 ? `combo ${combo}/3` : "combo 0/3",
        record: `record ${recordMax || 0} task/g`,
      }}
    />
  );
}

type RigaDati = { etichetta: string; perc: number; dettaglio: string; pulsa?: boolean; rosso?: boolean };

// Il riquadro vero e proprio. A ogni apertura fa il "ricalcolo": una riga luminosa lo attraversa mentre le barre si ricontano, e a conti finiti un lampo.
function Pannello({
  anima, suoni, apertura, rgb, l, xp, nudge, tutto, log, righe, piede,
}: {
  anima: boolean;
  suoni: boolean;
  apertura: number;
  rgb: Rgb;
  l: { numero: number; nome: string };
  xp: number;
  nudge: string | null;
  tutto: boolean;
  log: string[];
  righe: RigaDati[];
  piede: { xpOggi: number; variazione: string; eta: string; combo: string; record: string };
}) {
  // Si decide una volta sola per apertura: cambiando scheda e tornando qui non riparte.
  const [ricalcolo] = useState(() => anima && èDaRiprodurre(apertura));
  useEffect(() => segnaRiprodotta(apertura), [apertura]);
  // Il suono del computer che calcola parte insieme all'animazione (una volta per apertura)
  useEffect(() => {
    if (ricalcolo && suoni) void suonoApertura();
  }, [ricalcolo, suoni]);

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border bg-black p-3 font-mono text-[11px] ${ricalcolo ? "ricalcolo" : ""}`}
      style={{ borderColor: rgba(rgb, 0.35), boxShadow: `0 0 28px -10px ${rgba(rgb, 0.6)}, inset 0 0 24px ${rgba(rgb, 0.06)}`, color: rgba(rgb), transition: "color .8s, border-color .8s" }}
    >
      {ricalcolo && <div className="lampo" aria-hidden />}
      {ricalcolo && <div className="scansione" aria-hidden />}

      <div className="relative">
        <div className="mb-1 flex items-baseline justify-between border-b pb-1" style={{ borderColor: rgba(rgb, 0.18) }}>
          <span className="text-[13px] font-bold uppercase tracking-widest">LV.{l.numero} {l.nome}</span>
          <span className="flex items-baseline gap-1 text-[15px] font-black" style={{ textShadow: `0 0 10px ${rgba(rgb, 0.6)}` }}>
            <Odometro valore={xp} anima={anima} /> <span className="text-[11px]">XP</span>
          </span>
        </div>

        {righe.map((r) => (
          <Riga key={r.etichetta} etichetta={r.etichetta} perc={r.perc} dettaglio={r.dettaglio} anima={anima} col={r.rosso && !tutto ? CORALLO : rgb} pulsa={r.pulsa} evidenzia={r.rosso ? r.dettaglio === "KO!" : undefined} />
        ))}

        {tutto && (
          <div className="mt-1 font-bold" style={{ color: "#ffffff", textShadow: `0 0 8px ${rgba(rgb, 0.9)}` }}>
            ✅ Hai completato tutte le task!
          </div>
        )}

        {nudge && (
          <div className="pulsa mt-1 font-bold" style={{ color: "#ffffff" }}>
            {nudge}
            <span className="cursore">█</span>
          </div>
        )}

        {log.length > 0 && (
          <div className="mt-1.5 space-y-0.5 text-[10px]" style={{ color: rgba(rgb, 0.6) }}>
            {log.map((r, i) => (
              <div key={r + i} className="break-words">{r}</div>
            ))}
          </div>
        )}

        <div className="mt-1.5 flex flex-wrap justify-between gap-x-3 border-t pt-1 text-[10px]" style={{ borderColor: rgba(rgb, 0.18), color: rgba(rgb, 0.65) }}>
          <span>+{piede.xpOggi} xp oggi</span>
          <span>Δ {piede.variazione} vs 7g prima</span>
          <span>ETA {piede.eta}</span>
        </div>
        <div className="mt-0.5 flex justify-between gap-x-3 text-[10px]" style={{ color: rgba(rgb, 0.65) }}>
          <span className={piede.combo.startsWith("COMBO") ? "font-bold" : ""} style={piede.combo.startsWith("COMBO") ? { color: "#ffffff" } : undefined}>{piede.combo}</span>
          <span>{piede.record}</span>
        </div>
      </div>
    </div>
  );
}
