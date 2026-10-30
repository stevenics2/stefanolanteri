"use client";

import { Check, Clover, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { EVENTO_COMBO, EVENTO_FIAMMATA } from "./FestaOverlay";
import { aperturaCorrente, èDaRiprodurre, iscriviApertura, segnaRiprodotta } from "@/lib/apertura";
import { dataPiù, inizioSettimana } from "@/lib/date";
import { bossSettimana, èPrevista, livello, serie } from "@/lib/regole";
import { useStore } from "@/lib/store";

type Rgb = [number, number, number];
const FREDDO: Rgb = [205, 214, 224]; // argento freddo
const CALDO: Rgb = [255, 233, 189]; // bianco caldo
const VERDE: Rgb = [110, 231, 150]; // giornata completata

const mescola = (k: number): Rgb => FREDDO.map((v, i) => Math.round(v + (CALDO[i] - v) * Math.max(0, Math.min(1, k)))) as Rgb;
const rgba = (c: Rgb, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

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

const TRAGUARDI_SERIE = [3, 7, 14, 30, 60, 100];

// Il recap in cima a Oggi: una console da nerd. Barre e percentuali che avanzano, boss della settimana, combo, record.
export default function RiepilogoOggi({ fatte, totale }: { fatte: number; totale: number }) {
  const { stato, oggi, xp } = useStore();
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
      apertura={apertura}
      rgb={rgb}
      l={{ numero: l.numero, nome: l.nome }}
      xp={xp}
      nudge={nudge}
      tutto={tutto}
      centro={{ fatte, totale }}
      stat={[
        { id: "OGGI", nome: "Oggi", colore: "#fa114f", perc: percOggi, dettaglio: totale > 0 ? `${fatte}/${totale}` : "libero", pulsa: quasi },
        { id: "SETTIMANA", nome: "Settimana", colore: "#92f000", perc: previsteSett > 0 ? (fatteSett / previsteSett) * 100 : 0, dettaglio: `${fatteSett}/${previsteSett}` },
        { id: "LIVELLO", nome: "Livello", colore: "#00d9e8", perc: l.prossimo ? l.progresso * 100 : 100, dettaglio: l.prossimo ? `-${l.mancano}xp` : "MAX" },
        { id: "BOSS", nome: "Boss", colore: tutto ? "#92f000" : "#ff9686", perc: boss.pianificate > 0 ? (boss.hp / boss.pianificate) * 100 : 0, dettaglio: boss.sconfitto ? "KO!" : `${boss.hp}hp` },
        { id: "SERIE", nome: "Serie", colore: "#ffb340", perc: (giorniSerie / traguardo) * 100, dettaglio: `${giorniSerie}/${traguardo}g` },
        { id: "COSTANZA", nome: "Costanza", colore: "#bf8cff", perc: (attivi / finestra) * 100, dettaglio: `${attivi}/${finestra}g` },
      ]}
    />
  );
}

type Stat = { id: string; nome: string; colore: string; perc: number; dettaglio: string; pulsa?: boolean };
// Tre anelli concentrici come sull'Apple Watch: partono da zero e si riempiono con un'animazione morbida, con la punta tonda.
const TRACCE: Record<string, string> = { OGGI: "#3b0a1b", SETTIMANA: "#1f3200", LIVELLO: "#00323a" };

function Anelli({ stat, anima, tutto, centro, evento }: { stat: Stat[]; anima: boolean; tutto: boolean; centro: { fatte: number; totale: number }; evento: string | null }) {
  const gruppo = useRef<HTMLDivElement>(null);
  // a ogni task completata l'anello trema (si rilancia l'animazione anche se la classe c'è già)
  useEffect(() => {
    const e = gruppo.current;
    if (!e || !evento) return;
    e.classList.remove("trema");
    void e.offsetWidth;
    e.classList.add("trema");
  }, [evento]);
  const [pieni, setPieni] = useState(!anima);
  useEffect(() => {
    if (!anima) return;
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setPieni(true)));
    return () => cancelAnimationFrame(id);
  }, [anima]);
  const SPESSORE = 8;
  const DIM = 104;
  const C = DIM / 2;
  return (
    <div className="relative shrink-0" style={{ width: DIM, height: DIM }}>
      <div ref={gruppo} className="absolute inset-0">
      <svg width={DIM} height={DIM} viewBox={`0 0 ${DIM} ${DIM}`} className="-rotate-90">
        {stat.slice(0, 3).map((a, i) => {
          const r = C - SPESSORE / 2 - i * (SPESSORE + 1.5);
          const lunghezza = 2 * Math.PI * r;
          const frazione = pieni ? Math.max(0, Math.min(1, a.perc / 100)) : 0;
          return (
            <g key={a.id}>
              <circle cx={C} cy={C} r={r} fill="none" stroke={TRACCE[a.id]} strokeWidth={SPESSORE} />
              <circle
                cx={C} cy={C} r={r} fill="none" stroke={a.colore} strokeWidth={SPESSORE} strokeLinecap="round"
                strokeDasharray={lunghezza}
                strokeDashoffset={lunghezza * (1 - frazione)}
                style={{
                  opacity: frazione > 0.005 ? 1 : 0,
                  filter: frazione >= 1 ? `drop-shadow(0 0 4px ${a.colore})` : undefined,
                  transition: `stroke-dashoffset 1.4s cubic-bezier(.3,.7,.2,1) ${i * 180}ms, filter .6s`,
                }}
              />
            </g>
          );
        })}
      </svg>
      </div>
      {evento && (
        <div key={evento} className="pointer-events-none absolute inset-0" aria-hidden>
          {Array.from({ length: 44 }, (_, i) => {
            const ang = (i / 44) * 2 * Math.PI + (i % 3) * 0.14;
            const dist = 42 + ((i * 37) % 52);
            const lato = 5 + ((i * 7) % 6); // 5-10 px
            const colore = ["#fa114f", "#92f000", "#00d9e8"][i % 3];
            return (
              <span
                key={i}
                className="scintilla"
                style={{
                  color: colore,
                  width: lato,
                  height: lato,
                  "--dx": `${Math.cos(ang) * dist}px`,
                  "--dy": `${Math.sin(ang) * dist}px`,
                  "--d": `${0.6 + (i % 5) * 0.12}s`,
                  "--ritardo": `${(i % 7) * 70}ms`,
                } as React.CSSProperties}
              />
            );
          })}
        </div>
      )}
      <div className="absolute inset-0 flex items-center justify-center">
        {tutto ? (
          <Check size={24} strokeWidth={3.5} color="#92f000" />
        ) : (
          <span className="text-[17px] font-black leading-none tracking-tight text-white">{centro.fatte}/{centro.totale}</span>
        )}
      </div>
    </div>
  );
}

// Un indicatore con la sua barretta: nome, valore e percentuale.
function Cella({ s, anima }: { s: Stat; anima: boolean }) {
  const [pieno, setPieno] = useState(!anima);
  useEffect(() => {
    if (!anima) return;
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setPieno(true)));
    return () => cancelAnimationFrame(id);
  }, [anima]);
  const p = Math.max(0, Math.min(100, Math.round(s.perc)));
  return (
    <div className={`min-w-0 ${s.pulsa ? "pulsa" : ""}`}>
      <div className="flex items-baseline justify-between gap-1 leading-none">
        <span className="truncate text-[9px] font-semibold uppercase tracking-wider" style={{ color: "rgba(255,255,255,.6)" }}>{s.nome}</span>
        <span className="text-[13px] font-black tabular-nums" style={{ color: s.colore }}>{p}%</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,.1)" }}>
        <div className="h-full rounded-full" style={{ width: `${pieno ? p : 0}%`, background: s.colore, transition: "width 1.2s cubic-bezier(.3,.7,.2,1)" }} />
      </div>
      <div className="mt-0.5 text-[10px] font-semibold leading-none" style={{ color: "rgba(255,255,255,.45)" }}>{s.dettaglio}</div>
    </div>
  );
}

// Il riquadro vero e proprio. A ogni apertura si ricalcola: una riga luminosa lo attraversa mentre gli anelli si riempiono.
function Pannello({
  anima, apertura, rgb, l, xp, nudge, tutto, centro, stat,
}: {
  anima: boolean;
  apertura: number;
  rgb: Rgb;
  l: { numero: number; nome: string };
  xp: number;
  nudge: string | null;
  tutto: boolean;
  centro: { fatte: number; totale: number };
  stat: Stat[];
}) {
  // Si decide una volta sola per apertura: cambiando scheda e tornando qui non riparte.
  const { ricompensa: r, festa } = useStore();
  // il flash oro di fine combo: si rilancia a ogni evento
  const [fiammata, setFiammata] = useState(0);
  const [combo, setCombo] = useState<{ id: string; titolo: string; testo: string } | null>(null);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const mostra = (e: Event) => {
      const d = (e as CustomEvent<{ id: string; titolo: string; testo: string; durata: number }>).detail;
      setCombo(d);
      clearTimeout(t);
      t = setTimeout(() => setCombo(null), d.durata);
    };
    window.addEventListener(EVENTO_COMBO, mostra);
    return () => {
      window.removeEventListener(EVENTO_COMBO, mostra);
      clearTimeout(t);
    };
  }, []);
  useEffect(() => {
    const via = () => setFiammata((n) => n + 1);
    window.addEventListener(EVENTO_FIAMMATA, via);
    return () => window.removeEventListener(EVENTO_FIAMMATA, via);
  }, []);
  const [ricalcolo] = useState(() => anima && èDaRiprodurre(apertura));
  useEffect(() => segnaRiprodotta(apertura), [apertura]);

  return (
    <div
      data-box-avanzamento="" className={`relative overflow-hidden rounded-2xl border bg-black p-3 font-mono text-[11px] ${ricalcolo ? "ricalcolo" : ""}`}
      style={{ borderColor: rgba(rgb, 0.35), boxShadow: `0 0 28px -10px ${rgba(rgb, 0.6)}, inset 0 0 24px ${rgba(rgb, 0.06)}`, color: rgba(rgb), transition: "color .8s, border-color .8s" }}
    >
      {ricalcolo && <div className="lampo" aria-hidden />}
      {ricalcolo && <div className="scansione" aria-hidden />}
      {r && anima && <div key={r.id} className="lampo-ora" aria-hidden />}
      {combo && (
        <div className="pointer-events-none absolute inset-0 z-[4] flex items-center justify-center px-3">
          <div key={combo.id} className="risultato-combo w-full max-w-[17rem] rounded-3xl border bg-card px-4 py-3 text-center" style={{ borderColor: "#7dd3fc", boxShadow: "0 0 40px -6px #7dd3fc", color: "#7dd3fc" }}>
            <Zap size={40} strokeWidth={1.6} className="mx-auto" />
            <div className="mt-1 text-xl font-black tracking-wide">{combo.titolo}</div>
            <p className="mt-1 text-[13px] text-white">{combo.testo}</p>
          </div>
        </div>
      )}
      {fiammata > 0 && <div key={fiammata} className="flash-oro" aria-hidden />}
      {r && festa.length === 0 && (
        <div className="pointer-events-none absolute inset-0 z-[4] flex items-center justify-center px-3">
          <div key={r.id} className="risultato max-w-full rounded-2xl bg-black/75 px-5 py-2.5 text-center ring-1 ring-white/20 backdrop-blur-sm">
            <div className="text-[22px] font-black leading-tight" style={{ color: "#fa114f" }}>
              <span style={{ color: "#92f000" }}>+{r.punti} XP</span>
              {r.moltiplicatore > 1 && <span className="ml-2 text-[13px] text-sky-300">combo x{r.moltiplicatore}</span>}
            </div>
            {r.bonus > 0 && (
              <div className="mt-0.5 inline-flex items-center gap-1 text-[12px] font-bold text-emerald-400"><Clover size={14} /> +{r.bonus} colpo di fortuna!</div>
            )}
            <div className="mt-0.5 text-[12px] text-white/75">{r.frase || r.titolo}</div>
          </div>
        </div>
      )}

      <div className="relative">
        <div className="mb-2 flex items-baseline justify-between border-b pb-1" style={{ borderColor: rgba(rgb, 0.18) }}>
          <span className="text-[11px] font-bold uppercase tracking-widest">LV.{l.numero} {l.nome}</span>
          <span className="flex items-baseline gap-1 text-[13px] font-black" style={{ textShadow: `0 0 10px ${rgba(rgb, 0.6)}` }}>
            <Odometro valore={xp} anima={anima} /> <span className="text-[10px]">XP</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Anelli stat={stat} anima={anima && ricalcolo} tutto={tutto} centro={centro} evento={anima && r ? r.id : null} />
          <div className="grid min-w-0 flex-1 grid-cols-2 gap-x-3 gap-y-2">
            {stat.map((s) => (
              <Cella key={s.id} s={s} anima={anima && ricalcolo} />
            ))}
          </div>
        </div>

        {tutto && (
          <div className="mt-2 text-[12px] font-bold" style={{ color: "#ffffff", textShadow: `0 0 8px ${rgba(rgb, 0.9)}` }}>
            ✅ Hai completato tutte le task!
          </div>
        )}
        {nudge && (
          <div className="pulsa mt-2 font-bold" style={{ color: "#ffffff" }}>
            {nudge}
            <span className="cursore">█</span>
          </div>
        )}
      </div>
    </div>
  );
}
