"use client";

import Segmentato from "../components/Segmentato";
import ObiettiviSettimana from "../components/ObiettiviSettimana";
import CambiPiano from "../components/CambiPiano";
import RitoSettimana from "../components/RitoSettimana";
import VistaInsieme from "../components/VistaInsieme";
import { CalendarDays, CheckCircle2, ChevronLeft, Moon, Plane, Undo2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { caricoGiorno } from "@/lib/carico";
import { dataLunga, dataPiù, inizioSettimana } from "@/lib/date";
import { momentoAttuale } from "@/lib/momento";
import { èIgnorata, èPrevista, inVacanza } from "@/lib/regole";
import { titoloTask } from "@/lib/stanze";
import { useStore } from "@/lib/store";
import type { Evento, Task } from "@/lib/tipi";
import { AgendaDomani, InArrivo } from "../components/AgendaBox";
import BarraLivello from "../components/BarraLivello";
import SonnoCard from "../components/SonnoCard";
import TurniDaSistemare from "../components/TurniDaSistemare";
import PowerNap from "../components/PowerNap";
import SemaforiTerminal from "../components/SemaforiTerminal";
import SpiaSeguito from "../components/SpiaSeguito";
import TaskCard from "../components/TaskCard";
import BloccoTurno from "../components/BloccoTurno";
import Presenza from "../components/Presenza";
import Timeline from "../components/Timeline";
import { eventiDelGiorno } from "@/lib/eventi";
import InterruttoreTema from "../components/InterruttoreTema";
import GiornoSeguente from "../components/GiornoSeguente";
import StrisciaGiorni from "../components/StrisciaGiorni";
import GiornataAperta from "../components/GiornataAperta";
import GiornoIeri from "../components/GiornoIeri";
import FormEvento from "../task/FormEvento";
import { minutiNelGiorno } from "@/lib/giornoLogico";

// Dalle 18 le task non ancora fatte passano in "prima di dormire". Spenta durante lo sviluppo, per vedere tutto il resto.
const REGOLA_SERA_ATTIVA = false;
const ORA_SERA = 18;

export default function OggiVista() {
  const { pronto, stato, oggi, adesso, setVacanza, ripristina } = useStore();
  const [mostraTutte, setMostraTutte] = useState(false);
  const [daModificare, setDaModificare] = useState<Evento | null>(null);
  const [scelto, setScelto] = useState<string | null>(null); // il giorno guardato (null = oggi)
  const [settimana, setSettimana] = useState(false); // la modalità settimanale: il box ricompensa sparisce e i giorni salgono in alto
  const [vistaSett, setVistaSett] = useState<"giorno" | "insieme">("giorno");
  const [lunediVista, setLunediVista] = useState<string | null>(null); // la settimana della vista d'insieme (null = quella in corso)
  // La striscia dei giorni, quando è davvero salita in cima allo schermo, lascia lo spazio della barra di stato dell'iPhone (prima no: restava un vuoto sopra).
  const striscia = useRef<HTMLDivElement>(null);
  const [ferma, setFerma] = useState(false);
  useEffect(() => {
    if (!settimana) return;
    const controlla = () => setFerma((striscia.current?.getBoundingClientRect().top ?? 1) <= 0.5);
    window.addEventListener("scroll", controlla, { passive: true });
    return () => window.removeEventListener("scroll", controlla);
  }, [settimana]);
  if (!pronto) return null;

  const carico = caricoGiorno(oggi);
  const fuoriCasa = inVacanza(stato.vacanza, oggi);
  const previste = stato.task.filter((t) => èPrevista(t, oggi, { vacanza: stato.vacanza, ignoraCarico: mostraTutte }));
  const ignorate = previste.filter((t) => èIgnorata(stato.ignorati, t.id, oggi));
  const daFare = previste.filter((t) => !èIgnorata(stato.ignorati, t.id, oggi));
  const èFatta = (t: Task) => stato.completamenti.some((c) => c.taskId === t.id && c.data === oggi);
  const fatte = daFare.filter(èFatta).length;

  // Planner: prima le task con un momento consigliato, in ordine di orario; poi le altre (si parte dalla pulizia: la stanza
  // del giorno, poi il resto della casa). Le fatte vanno in fondo.
  const peso = (t: Task) => (t.tipo === "stanza" ? 0 : t.areaId === "casa" ? 1 : 2);
  const adessoMin = adesso > 0 ? minutiNelGiorno(adesso, oggi) : 0;
  const inizioMomento = (t: Task) =>
    momentoAttuale(t, oggi, { oggi, adessoMin, eventi: stato.eventi, scelto: stato.momenti.find((m) => m.taskId === t.id && m.data === oggi) }).finestra?.da ?? Infinity;
  const ordina = (a: Task, b: Task) => Number(èFatta(a)) - Number(èFatta(b)) || (inizioMomento(a) === inizioMomento(b) ? 0 : inizioMomento(a) < inizioMomento(b) ? -1 : 1) || peso(a) - peso(b);

  // "Prima di dormire": le task della sera (piatti) e, dalle 18 in poi, tutto quello che non è ancora fatto.
  const èSera = REGOLA_SERA_ATTIVA && adesso > 0 && new Date(adesso).getHours() >= ORA_SERA;
  const primaDiDormire = (t: Task) => t.fascia === "sera" || (èSera && !èFatta(t));
  const inSpia = (t: Task) => !!t.seguitoDi && (t.ripetiMin ?? 30) < 60 && !èFatta(t); // «Stendi il bucato» in attesa: sta nella spia, non nell'elenco
  const cosaOggi = daFare.filter((t) => !primaDiDormire(t) && !inSpia(t)).sort(ordina);
  const mustPrimaDiDormire = daFare.filter((t) => primaDiDormire(t) && !inSpia(t)).sort(ordina);

  const elenco = [...cosaOggi, ...mustPrimaDiDormire];
  const daFareOra = elenco.filter((t) => !èFatta(t));
  const fatteOggi = elenco.filter((t) => èFatta(t));
  const adessoTask = daFareOra[0] ?? null;
  const daLineaTempo = daFareOra.slice(1); // sulla linea del tempo: le prossime; le fatte stanno nella loro sezione
  const eventiOggi = eventiDelGiorno(stato.eventi, oggi, oggi).length > 0;
  const soloMinima = carico === "essenziale" && !mostraTutte;
  const giorno = scelto ?? oggi;

  // Tocchi un giorno: si passa subito alla modalità settimanale (il box sfuma mentre i giorni salgono) e il giorno toccato è già quello aperto.
  // Con «Indietro» è il contrario: si torna a oggi subito, il box ricompare e i giorni scendono.
  function sceglieGiorno(d: string) {
    setVistaSett("giorno");
    setScelto(d === oggi ? null : d);
    setSettimana(true);
  }
  // Dalla data si apre direttamente la vista d'insieme della settimana
  function apriSettimana() {
    setScelto(null);
    setVistaSett("insieme");
    setLunediVista(null);
    setSettimana(true);
  }
  function esciDallaSettimana() {
    setScelto(null);
    setVistaSett("giorno");
    setLunediVista(null);
    setSettimana(false);
    setFerma(false);
  }

  return (
    <section className="space-y-5">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1 pr-3">
          <h1 className="sr-only">Oggi</h1>
          <BarraLivello fatte={fatte} totale={daFare.length} />
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
        <div className="flex items-center gap-2">
          <InterruttoreTema />
          {settimana ? (
            <button data-suono="indietro" onClick={esciDallaSettimana} className="inline-flex items-center gap-1.5 rounded-full bg-ov/10 px-3 py-1.5 text-sm text-muted">
              <ChevronLeft size={15} /> Indietro
            </button>
          ) : (
            !fuoriCasa && (
              <button
                data-suono="via"
                onClick={() => setVacanza({ dal: oggi, al: null })}
                className="inline-flex items-center gap-1.5 rounded-full bg-ov/10 px-3 py-1.5 text-sm text-muted"
              >
                <Plane size={15} /> Fuori casa
              </button>
            )
          )}
        </div>
        {settimana ? (
          <Segmentato
            inline
            voci={[{ id: "giorno", etichetta: "Giorno" }, { id: "insieme", etichetta: "Settimana" }]}
            valore={vistaSett}
            onCambia={(v) => setVistaSett(v)}
            contenitore="rounded-full bg-ov/10 text-xs"
            pillola="rounded-full bg-foreground"
            testoAttivo="text-background"
            bottone="py-1 text-xs"
            margine={2}
            aria="Vista della settimana"
          />
        ) : (
          <button data-suono="via" onClick={apriSettimana} className="inline-flex items-center gap-1.5 rounded-full bg-ov/10 px-3 py-1 text-sm text-muted first-letter:uppercase" aria-label="Apri la vista settimanale">
            <CalendarDays size={14} /> <span className="first-letter:uppercase">{dataLunga(oggi)}</span>
          </button>
        )}
        </div>
      </div>

      <div ref={striscia} className={settimana ? "striscia-alta" : ""} data-ferma={settimana && ferma} style={{ paddingBottom: "0.5rem", marginBottom: "0.75rem" }}>
        <div className="entra flow-root" style={{ animationDelay: "70ms" }}>
          <StrisciaGiorni quanti={settimana ? 14 : 7} oggi={oggi} selezionato={giorno} onScegli={sceglieGiorno} />
        </div>
      </div>

      <GiornataAperta />
      <CambiPiano />

      {!settimana && <RitoSettimana />}

      {settimana && vistaSett === "insieme" ? (
        <div className="dissolve">
          <VistaInsieme lunedi={lunediVista ?? inizioSettimana(oggi)} onApriGiorno={(d) => { setVistaSett("giorno"); setScelto(d === oggi ? null : d); }} onModificaEvento={setDaModificare} onSposta={(delta) => setLunediVista(dataPiù(lunediVista ?? inizioSettimana(oggi), delta * 7))} />
        </div>
      ) : giorno !== oggi ? (
        <div key={giorno} className="entra">
          {giorno === dataPiù(oggi, -1) ? <GiornoIeri data={giorno} /> : <GiornoSeguente data={giorno} onApri={setDaModificare} />}
        </div>
      ) : (
      <div className="dissolve space-y-5">
      

      <div className="entra flex items-stretch gap-2" style={{ animationDelay: "130ms" }}>
        <div className="min-w-0 flex-1"><BloccoTurno data={oggi} /></div>
        <SemaforiTerminal />
      </div>

      <TurniDaSistemare />

      <PowerNap />

      {fuoriCasa && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-violet-500/40 bg-violet-500/10 p-4 text-sm">
          <span className="inline-flex items-center gap-2">
            <Plane size={18} className="shrink-0" /> Sei fuori casa: niente task di casa. Il resto continua.
          </span>
          <button data-suono="indietro" onClick={() => setVacanza(null)} className="shrink-0 rounded-lg bg-ov/10 px-3 py-1.5">
            Sono a casa
          </button>
        </div>
      )}

      {carico === "essenziale" && !mostraTutte && (
        <div className="flex items-start gap-2 rounded-2xl border border-sky-500/40 bg-sky-500/10 p-4 text-sm">
          <Moon size={18} className="mt-0.5 shrink-0" /> Giornata pesante: solo l&apos;essenziale, in versione minima. Il resto può aspettare.
        </div>
      )}
      {carico === "nessuna" && !mostraTutte && (
        <div className="flex items-start gap-2 rounded-2xl border border-sky-500/40 bg-sky-500/10 p-4 text-sm">
          <Moon size={18} className="mt-0.5 shrink-0" /> Notte + sera: oggi nessuna task. Mangia, dormi, recupera. Le serie non si rompono.
        </div>
      )}
      {carico !== "normale" && (
        <button onClick={() => setMostraTutte((v) => !v)} className="text-sm text-muted underline">
          {mostraTutte ? "Mostra solo l'essenziale" : "Mostra comunque le task di oggi"}
        </button>
      )}

      <SpiaSeguito />

      {/* Adesso: la prossima cosa da fare, in una scheda che respira piano */}
      {adessoTask ? (
        <div className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-muted">NEXT</h2>
          <div className="adesso-respira" key={adessoTask.id}>
            <TaskCard task={adessoTask} soloMinima={soloMinima} evidenza />
          </div>
        </div>
      ) : daFare.length > 0 ? (
        <div className="rounded-2xl bg-card p-4 text-center">
          <div className="text-lg font-bold text-emerald-300">Tutto fatto per oggi</div>
          <p className="mt-0.5 text-sm text-muted">Adesso pensa a recuperare.</p>
        </div>
      ) : null}

      {/* Le prossime task sulla linea del tempo (con gli appuntamenti), in ordine di orario */}
      {(daLineaTempo.length > 0 || eventiOggi) && <Timeline task={daLineaTempo} soloMinima={soloMinima} onModificaEvento={setDaModificare} />}

      {fatteOggi.length > 0 && (
        <div className="space-y-2">
          <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-muted">
            <CheckCircle2 size={14} className="text-emerald-400" /> Task completate · {fatteOggi.length}
          </h2>
          <div className="space-y-2">
            {fatteOggi.map((t) => <TaskCard key={t.id} task={t} soloMinima={soloMinima} />)}
          </div>
        </div>
      )}

      <AgendaDomani onModifica={setDaModificare} />
      <InArrivo onModifica={setDaModificare} />

      {ignorate.length > 0 && (
        <div className="space-y-1 rounded-2xl bg-card p-4 text-sm">
          <div className="text-muted">Saltate oggi (domani si ripropongono)</div>
          {ignorate.map((t) => (
            <div key={t.id} className="flex items-center justify-between">
              <span>{titoloTask(t, stato, oggi)}</span>
              <button data-suono="indietro" onClick={() => ripristina(t.id)} className="inline-flex items-center gap-1 text-muted">
                <Undo2 size={14} /> Rimetti
              </button>
            </div>
          ))}
        </div>
      )}

      {previste.length === 0 && carico === "normale" && (
        <p className="text-muted">
          Nessuna task per oggi. <Link href="/task" className="text-accent underline">Aggiungine una</Link>.
        </p>
      )}

      {/* Il sonno chiude la giornata: sta in fondo, dopo tutto il resto */}
      <SonnoCard />


      </div>
      )}

      {/* Gli obiettivi della settimana stanno per ultimi, sotto le task */}
      {settimana && <ObiettiviSettimana />}

      <Presenza dato={daModificare} ms={340}>
        {(e) => <FormEvento key={e.id} tipo={e.tipo} iniziale={e} onClose={() => setDaModificare(null)} />}
      </Presenza>
    </section>
  );
}
