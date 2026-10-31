"use client";

import { CalendarClock, ListChecks, Moon, Plane, Undo2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { caricoGiorno } from "@/lib/carico";
import { dataLunga } from "@/lib/date";
import { momentoGiusto } from "@/lib/momento";
import { èIgnorata, èPrevista, inVacanza } from "@/lib/regole";
import { titoloTask } from "@/lib/stanze";
import { useStore } from "@/lib/store";
import type { Evento, Task } from "@/lib/tipi";
import { AgendaDomani, AgendaOggi, InArrivo } from "../components/AgendaBox";
import RiepilogoOggi from "../components/RiepilogoOggi";
import SonnoCard from "../components/SonnoCard";
import TurniDaSistemare from "../components/TurniDaSistemare";
import TaskCard from "../components/TaskCard";
import BloccoTurno from "../components/BloccoTurno";
import InterruttoreTema from "../components/InterruttoreTema";
import GiornoSeguente from "../components/GiornoSeguente";
import StrisciaGiorni from "../components/StrisciaGiorni";
import Timeline from "../components/Timeline";
import FormEvento from "../task/FormEvento";

// Dalle 18 le task non ancora fatte passano in "prima di dormire". Spenta durante lo sviluppo, per vedere tutto il resto.
const REGOLA_SERA_ATTIVA = false;
const ORA_SERA = 18;

export default function OggiVista() {
  const { pronto, stato, oggi, adesso, setVacanza, ripristina, impostazioni } = useStore();
  const [mostraTutte, setMostraTutte] = useState(false);
  const [daModificare, setDaModificare] = useState<Evento | null>(null);
  const [scelto, setScelto] = useState<string | null>(null); // il giorno guardato (null = oggi)
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
  const inizioMomento = (t: Task) => momentoGiusto(t, oggi, stato.momenti.find((m) => m.taskId === t.id && m.data === oggi))?.da ?? Infinity;
  const ordina = (a: Task, b: Task) => Number(èFatta(a)) - Number(èFatta(b)) || (inizioMomento(a) === inizioMomento(b) ? 0 : inizioMomento(a) < inizioMomento(b) ? -1 : 1) || peso(a) - peso(b);

  // "Prima di dormire": le task della sera (piatti) e, dalle 18 in poi, tutto quello che non è ancora fatto.
  const èSera = REGOLA_SERA_ATTIVA && adesso > 0 && new Date(adesso).getHours() >= ORA_SERA;
  const primaDiDormire = (t: Task) => t.fascia === "sera" || (èSera && !èFatta(t));
  const cosaOggi = daFare.filter((t) => !primaDiDormire(t)).sort(ordina);
  const mustPrimaDiDormire = daFare.filter(primaDiDormire).sort(ordina);

  const soloMinima = carico === "essenziale" && !mostraTutte;
  const v = stato.impostazioni.vistaOggi as string; // "timeline" è il nome vecchio di "estesa"; "lista" e il vecchio "compatta" sono la vista compatta
  const vista: "compatta" | "estesa" = v === "estesa" || v === "timeline" ? "estesa" : "compatta";
  const giorno = scelto ?? oggi;

  return (
    <section className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Oggi</h1>
          <p className="text-muted first-letter:uppercase">{dataLunga(oggi)}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
        <div className="flex items-center gap-2">
          <InterruttoreTema />
          {!fuoriCasa && (
            <button
              data-suono="via"
              onClick={() => setVacanza({ dal: oggi, al: null })}
              className="inline-flex items-center gap-1.5 rounded-full bg-ov/10 px-3 py-1.5 text-sm text-muted"
            >
              <Plane size={15} /> Fuori casa
            </button>
          )}
        </div>
        <div className="inline-flex rounded-full bg-ov/10 p-0.5 text-xs" role="group" aria-label="Vista">
          {([["compatta", "Compatta"], ["estesa", "Estesa"]] as const).map(([vv, nome]) => (
            <button
              key={vv}
              data-suono="via"
              onClick={() => impostazioni({ vistaOggi: vv })}
              aria-pressed={vista === vv}
              className={`rounded-full px-2.5 py-1 font-semibold ${vista === vv ? "bg-foreground text-background" : "text-muted"}`}
            >
              {nome}
            </button>
          ))}
        </div>
        </div>
      </div>

      <StrisciaGiorni oggi={oggi} selezionato={giorno} onScegli={(d) => setScelto(d === oggi ? null : d)} />

      {giorno !== oggi ? (
        <GiornoSeguente data={giorno} onApri={setDaModificare} />
      ) : (
      <>
      <RiepilogoOggi fatte={fatte} totale={daFare.length} />

      <TurniDaSistemare />

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

      <BloccoTurno data={oggi} />

      {vista === "compatta" && <AgendaOggi onModifica={setDaModificare} />}

      {vista === "estesa" && (
        <div className="space-y-2">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <CalendarClock size={20} className="text-accent" /> La tua giornata
          </h2>
          <Timeline task={cosaOggi} soloMinima={soloMinima} onModificaEvento={setDaModificare} />
        </div>
      )}

      {vista === "compatta" && cosaOggi.length > 0 && (
        <div className="space-y-2">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <ListChecks size={20} className="text-accent" /> Il piano di oggi
          </h2>
          {cosaOggi.map((t) => (
            <TaskCard key={t.id} task={t} soloMinima={soloMinima} />
          ))}
        </div>
      )}

      {mustPrimaDiDormire.length > 0 && (
        <div className="space-y-2">
          <h2 className="flex items-center gap-2 text-lg font-extrabold uppercase tracking-wide text-amber-300">
            <Moon size={20} /> Must before sleep:
          </h2>
          {mustPrimaDiDormire.map((t) => (
            <TaskCard key={t.id} task={t} soloMinima={soloMinima} />
          ))}
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

      </>
      )}

      {daModificare && <FormEvento key={daModificare.id} tipo={daModificare.tipo} iniziale={daModificare} onClose={() => setDaModificare(null)} />}
    </section>
  );
}
