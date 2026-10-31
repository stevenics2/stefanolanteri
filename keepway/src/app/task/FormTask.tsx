"use client";

import { CalendarCheck, CalendarClock, CalendarDays, Check, Repeat } from "lucide-react";
import { useState } from "react";
import { GIORNI_LUNGHI } from "@/lib/date";
import { puntiAuto } from "@/lib/regole";
import { nuovoId } from "@/lib/seed";
import { useStore } from "@/lib/store";
import type { Fascia, Task } from "@/lib/tipi";
import AreaIcona from "../components/AreaIcona";
import PianoSettimana from "./PianoSettimana";
import { èPianificata } from "@/lib/pianoAuto";
import { usePianifica } from "./usePianifica";
import Segmentato from "../components/Segmentato";
import { campo, Chip, Etichetta, Gruppo, Interruttore, Riquadro, RigaSelect, Schermo } from "./ui";

export default function FormTask({ iniziale, onClose }: { iniziale: Task | null; onClose: () => void }) {
  const { stato, oggi, salvaTask, eliminaTask } = useStore();
  const [titolo, setTitolo] = useState(iniziale?.titolo ?? "");
  const [areaId, setAreaId] = useState(iniziale?.areaId ?? "abitudini");
  const [durata, setDurata] = useState<number | null>(iniziale ? iniziale.durataMin : 15);
  const [minima, setMinima] = useState<number | null>(iniziale ? iniziale.minimaMin : 5);
  const [tipo, setTipo] = useState<"giornaliera" | "settimana" | "una_volta" | "auto">(iniziale?.ricorrenza.tipo === "intervallo" ? "auto" : (iniziale?.ricorrenza.tipo ?? "giornaliera"));
  const [ritmo, setRitmo] = useState<"settimana" | "intervallo">(iniziale?.ricorrenza.tipo === "intervallo" ? "intervallo" : "settimana");
  const [ogni, setOgni] = useState(iniziale?.ricorrenza.tipo === "intervallo" ? iniziale.ricorrenza.ogni : 7);
  const [tolleranza, setTolleranza] = useState(iniziale?.ricorrenza.tipo === "intervallo" ? iniziale.ricorrenza.tolleranza : 0);
  const [volte, setVolte] = useState(iniziale?.ricorrenza.tipo === "auto" ? iniziale.ricorrenza.volte : 3);
  const [giorni, setGiorni] = useState<number[]>(iniziale?.ricorrenza.tipo === "settimana" ? iniziale.ricorrenza.giorni : []);
  const [data, setData] = useState(iniziale?.ricorrenza.tipo === "una_volta" ? iniziale.ricorrenza.data : oggi);
  const fascia: Fascia = iniziale?.fascia ?? "qualsiasi"; // la fascia non si chiede più: il momento lo sceglie Keepway (le task esistenti la mantengono)
  const [xp, setXp] = useState<number | null>(iniziale ? iniziale.punti : null);
  const [essenziale, setEssenziale] = useState(iniziale?.essenziale ?? false);
  const [soloACasa, setSoloACasa] = useState(iniziale?.soloACasa ?? true); // «Da casa» (spostamento 0) = si fa solo a casa
  const [spostamento, setSpostamento] = useState(iniziale?.spostamentoMin ?? 0);
  const scegliSpostamento = (m: number) => {
    setSpostamento(m);
    setSoloACasa(m === 0); // da casa = solo a casa; se devi spostarti, si fa anche fuori
  };

  const puntiFinali = xp ?? puntiAuto(durata);
  const valido = titolo.trim() !== "" && (tipo !== "settimana" || giorni.length > 0);

  // La task com'è nel modulo (serve per salvarla e per l'anteprima della pianificazione automatica)
  const [idTask] = useState(() => iniziale?.id ?? nuovoId());
  const costruisci = (id: string = idTask): Task => ({
    id,
    titolo: titolo.trim() || "Task",
    areaId,
    icona: iniziale?.icona,
    durataMin: durata,
    minimaMin: durata ? minima : null,
    ricorrenza: tipo === "giornaliera" ? { tipo } : tipo === "settimana" ? { tipo, giorni } : tipo === "auto" ? (ritmo === "intervallo" ? { tipo: "intervallo" as const, ogni, tolleranza } : { tipo, volte }) : { tipo, data },
    fascia,
    solo: iniziale?.solo ?? "sempre",
    punti: puntiFinali,
    essenziale,
    soloACasa,
    adattaATurni: true, // il momento giusto e gli avvisi si scelgono sempre tra turni, sonno e impegni
    km: iniziale?.km,
    spostamentoMin: spostamento,
    promemoria: iniziale?.promemoria ?? [], // l'avviso è automatico: gli orari a mano non si chiedono più (restano quelli che c'erano)
    tipo: iniziale?.tipo,
    attiva: iniziale?.attiva ?? true,
    creatoIl: iniziale?.creatoIl ?? oggi,
  });

  const salva = () => {
    if (!valido) return;
    salvaTask(costruisci());
    onClose();
  };
  const { apri: apriPianifica, popup } = usePianifica({ costruisci: () => costruisci(), modifica: !!iniziale && èPianificata(iniziale), onClose, onManuale: () => setTipo("settimana") });

  const opzioniDurata: [number | null, string][] = [[null, "Senza timer"], ...[5, 10, 15, 20, 30, 45, 60].map((m): [number | null, string] => [m, `${m} min`])];
  const opzioniMinima: [number | null, string][] = [[null, "Nessuna"], ...[2, 3, 5, 10].map((m): [number | null, string] => [m, `${m} min`])];
  const opzioniXp: [number | null, string][] = [[null, `Automatici (+${puntiAuto(durata)})`], ...[10, 20, 30, 50, 100].map((v): [number | null, string] => [v, `+${v}`])];
  const opzioniSpostamento: [number, string][] = [[0, "Da casa"], ...[10, 20, 30, 45].map((m): [number, string] => [m, `${m} min`])];

  return (
    <Schermo titolo={iniziale ? "Modifica task" : "Nuova task"} onClose={onClose}>
      <label className="block text-sm text-muted">
        Cosa devi fare
        <input value={titolo} onChange={(e) => setTitolo(e.target.value)} placeholder="Es. Studiare 20 minuti" className={campo} />
      </label>

      <div>
        <Etichetta>Di che area è?</Etichetta>
        {/* Una sola riga che scorre di lato: le aree sono sei e non entrerebbero con il nome intero */}
        <div className="no-scrollbar -mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1">
          {stato.aree.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setAreaId(a.id)}
              className={`flex min-w-[5.6rem] shrink-0 snap-start flex-col items-center gap-1.5 rounded-2xl border px-2 py-3 text-xs font-medium ${areaId === a.id ? "chip-on border-accent bg-accent/15 text-accent" : "border-transparent bg-ov/10"}`}
            >
              <AreaIcona nome={a.icona} colore="currentColor" size={22} badge={false} />
              <span className="whitespace-nowrap">{a.nome.replace(" quotidiane", "").replace("Ordine in casa", "Ordine")}</span>
            </button>
          ))}
        </div>
      </div>

      <Gruppo>
        <RigaSelect etichetta="Quanto dura" valore={durata} opzioni={opzioniDurata} onCambia={setDurata} />
        {durata !== null && <RigaSelect etichetta="Versione minima" sotto="Basta questa per tenere la serie" valore={minima} opzioni={opzioniMinima} onCambia={setMinima} />}
        <RigaSelect etichetta="Quanti XP vale" valore={xp} opzioni={opzioniXp} onCambia={setXp} />
        <RigaSelect etichetta="Spostamento" sotto="Andata, e altrettanto per il ritorno" valore={spostamento} opzioni={opzioniSpostamento} onCambia={scegliSpostamento} />
      </Gruppo>

      <div>
        <Etichetta>Quando</Etichetta>
        <div className="grid grid-cols-2 gap-2">
          <Riquadro attivo={tipo === "giornaliera"} nome="Ogni giorno" onClick={() => setTipo("giornaliera")} icona={<Repeat size={22} />} />
          <Riquadro attivo={tipo === "settimana"} nome="Giorni fissi" onClick={() => setTipo("settimana")} icona={<CalendarDays size={22} />} />
          <Riquadro attivo={tipo === "una_volta"} nome="Una volta" onClick={() => setTipo("una_volta")} icona={<CalendarCheck size={22} />} />
          <Riquadro attivo={tipo === "auto"} nome="Pianificazione automatica" onClick={() => setTipo("auto")} icona={<CalendarClock size={22} />} />
        </div>
        {tipo === "auto" && (
          <div className="mt-3 space-y-3">
            <Segmentato
              voci={[{ id: "settimana", etichetta: "Volte a settimana" }, { id: "intervallo", etichetta: "Ogni N giorni" }]}
              valore={ritmo}
              onCambia={setRitmo}
              aria="Ritmo"
            />
            <Gruppo>
              {ritmo === "settimana" ? (
                <RigaSelect
                  etichetta="Quante volte"
                  valore={volte}
                  opzioni={[1, 2, 3, 4, 5, 6].map((n): [number, string] => [n, `${n} ${n === 1 ? "volta" : "volte"} a settimana`])}
                  onCambia={setVolte}
                />
              ) : (
                <>
                  <RigaSelect
                    etichetta="Ogni quanti giorni"
                    valore={ogni}
                    opzioni={[2, 3, 4, 5, 7, 10, 14, 21, 30].map((n): [number, string] => [n, `ogni ${n} giorni`])}
                    onCambia={setOgni}
                  />
                  <RigaSelect
                    etichetta="Quanto può slittare"
                    sotto="Al massimo, mai prima"
                    valore={tolleranza}
                    opzioni={[[0, "Esatta"], [1, "+1 giorno"], [2, "+2 giorni"]] as [number, string][]}
                    onCambia={setTolleranza}
                  />
                </>
              )}
            </Gruppo>
            {ritmo === "intervallo" && (
              <p className="text-xs text-muted">
                I giorni si contano dall&apos;ultima volta che l&apos;hai fatta e non passano mai meno di N giorni: se la fai prima o dopo, il conto riparte da quel giorno. Così il giardino cade sempre a 7 giorni esatti dal precedente
                e la barba da 3 a 4 giorni dopo (ogni 3 giorni, +1): mai il lunedì dopo il sabato.
              </p>
            )}
            <p className="text-xs text-muted">
              Keepway sceglie i giorni e l&apos;orario tenendo conto di turni, sonno e appuntamenti. Nei giorni pesanti (dopo la notte, doppio turno) mette solo le task essenziali. Se il giorno giusto è impossibile prende quello più vicino.
            </p>
            {iniziale && èPianificata(iniziale) ? (
              <div>
                <Etichetta>Il piano</Etichetta>
                <PianoSettimana task={iniziale} modifica />
                <button type="button" data-suono="via" onClick={apriPianifica} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-ov/10 px-4 py-2.5 text-sm font-semibold">
                  Nuova pianificazione
                </button>
                <p className="mt-2 text-xs text-muted">Se cambi il ritmo o la durata, usa «Nuova pianificazione» o salva: il piano si ricalcola.</p>
              </div>
            ) : (
              <p className="text-xs text-muted">Premi «Pianifica» in fondo: Keepway prepara delle proposte e scegli tu quella che preferisci.</p>
            )}
          </div>
        )}
        {tipo === "settimana" && (
          <div className="mt-2 flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5, 6, 0].map((g) => (
              <Chip key={g} attivo={giorni.includes(g)} onClick={() => setGiorni((x) => (x.includes(g) ? x.filter((y) => y !== g) : [...x, g]))}>
                {GIORNI_LUNGHI[g].slice(0, 3)}
              </Chip>
            ))}
          </div>
        )}
        {tipo === "una_volta" && <input type="date" value={data} onChange={(e) => setData(e.target.value)} className={campo} aria-label="Giorno" />}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-ov/5 px-4 py-3 text-sm">
          <span>
            <span className="block font-medium">Adatta ai turni e agli impegni</span>
            <span className="block text-xs text-muted">Suggerisce il momento libero tra turni, sonno e appuntamenti e ti avvisa</span>
          </span>
          <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white" aria-label="Sempre attivo"><Check size={15} strokeWidth={3} /></span>
        </div>
        <Interruttore valore={essenziale} onChange={setEssenziale}>Essenziale: resta anche nei giorni pesanti</Interruttore>
        <Interruttore valore={soloACasa} onChange={setSoloACasa}>Si fa solo a casa (sparisce quando sei fuori)</Interruttore>
      </div>

      <button data-suono="via" onClick={tipo === "auto" && !iniziale ? apriPianifica : salva} disabled={!valido} className="w-full rounded-2xl bg-accent py-3.5 text-lg font-bold text-black disabled:opacity-40">
        {tipo === "auto" && !iniziale ? "Pianifica" : "Salva"}
      </button>
      {popup}
      {iniziale && (
        <button
          data-suono="indietro"
          onClick={() => confirm("Eliminare questa task? Le prove già accumulate restano.") && (eliminaTask(iniziale.id), onClose())}
          className="w-full rounded-2xl bg-red-500/15 py-3 text-red-300"
        >
          Elimina task
        </button>
      )}
    </Schermo>
  );
}
