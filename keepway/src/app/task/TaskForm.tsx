"use client";

import { useState } from "react";
import { GIORNI_LUNGHI } from "@/lib/date";
import { puntiAuto } from "@/lib/regole";
import { nuovoId } from "@/lib/seed";
import { useStore } from "@/lib/store";
import type { Fascia, Task } from "@/lib/tipi";

// Scorciatoie per "ordine in una stanza": si sceglie la stanza e il giorno.
const STANZE = [
  { nome: "soggiorno", titolo: "Sistema il soggiorno" },
  { nome: "bagno", titolo: "Sistema il bagno" },
  { nome: "camera", titolo: "Sistema la camera" },
  { nome: "cucina", titolo: "Sistema la cucina" },
  { nome: "ingresso", titolo: "Sistema l'ingresso" },
  { nome: "balcone", titolo: "Sistema il balcone" },
];

const num = (v: string) => (v.trim() === "" ? null : Math.max(1, Math.round(Number(v)) || 1));

export default function TaskForm({ iniziale, onClose }: { iniziale: Task | null; onClose: () => void }) {
  const { stato, oggi, salvaTask, eliminaTask } = useStore();
  const [titolo, setTitolo] = useState(iniziale?.titolo ?? "");
  const [areaId, setAreaId] = useState(iniziale?.areaId ?? "abitudini");
  const [durata, setDurata] = useState(iniziale?.durataMin?.toString() ?? "");
  const [minima, setMinima] = useState(iniziale?.minimaMin?.toString() ?? "");
  const [tipo, setTipo] = useState<"giornaliera" | "settimana" | "una_volta">(iniziale?.ricorrenza.tipo ?? "giornaliera");
  const [giorni, setGiorni] = useState<number[]>(iniziale?.ricorrenza.tipo === "settimana" ? iniziale.ricorrenza.giorni : []);
  const [data, setData] = useState(iniziale?.ricorrenza.tipo === "una_volta" ? iniziale.ricorrenza.data : oggi);
  const [fascia, setFascia] = useState<Fascia>(iniziale?.fascia ?? "qualsiasi");
  const [solo, setSolo] = useState<Task["solo"]>(iniziale?.solo ?? "sempre");
  const [punti, setPunti] = useState(iniziale ? iniziale.punti.toString() : "");
  const [essenziale, setEssenziale] = useState(iniziale?.essenziale ?? false);
  const [soloACasa, setSoloACasa] = useState(iniziale?.soloACasa ?? false);
  const [adatta, setAdatta] = useState(iniziale?.adattaATurni ?? false);
  const [promemoria, setPromemoria] = useState((iniziale?.promemoria ?? []).join(", "));

  const puntiFinali = num(punti) ?? puntiAuto(num(durata));
  const valido = titolo.trim() !== "" && (tipo !== "settimana" || giorni.length > 0);

  const stanza = (titolo: string) => {
    setTitolo(titolo);
    setAreaId("casa");
    setDurata("15");
    setMinima("5");
  };

  const salva = () => {
    if (!valido) return;
    salvaTask({
      id: iniziale?.id ?? nuovoId(),
      titolo: titolo.trim(),
      areaId,
      durataMin: num(durata),
      minimaMin: num(minima),
      ricorrenza: tipo === "giornaliera" ? { tipo } : tipo === "settimana" ? { tipo, giorni } : { tipo, data },
      fascia,
      solo,
      punti: puntiFinali,
      essenziale,
      soloACasa,
      adattaATurni: adatta,
      promemoria: promemoria.split(/[,\s]+/).filter((o) => /^\d{1,2}:\d{2}$/.test(o)).map((o) => o.padStart(5, "0")),
      tipo: iniziale?.tipo,
      attiva: iniziale?.attiva ?? true,
      creatoIl: iniziale?.creatoIl ?? oggi,
    });
    onClose();
  };

  const campo = "mt-1 w-full rounded-xl bg-white/10 px-3 py-2.5 outline-none";
  return (
    <div className="fixed inset-0 z-30 overflow-y-auto bg-background px-4 pb-10 pt-[var(--pt-pagina)]">
      <div className="mx-auto max-w-md space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">{iniziale ? "Modifica task" : "Nuova task"}</h1>
          <button data-suono="indietro" onClick={onClose} className="text-muted">Chiudi</button>
        </div>

        {!iniziale && (
          <div>
            <div className="text-sm text-muted">Una stanza in un giorno preciso (la rotazione quotidiana c&apos;è già):</div>
            <div className="mt-1 flex flex-wrap gap-2">
              {STANZE.map((s) => (
                <button key={s.nome} onClick={() => stanza(s.titolo)} className="rounded-full bg-white/10 px-3 py-1 text-sm">
                  {s.nome}
                </button>
              ))}
            </div>
          </div>
        )}

        <label className="block text-sm text-muted">
          Cosa devi fare
          <input value={titolo} onChange={(e) => setTitolo(e.target.value)} placeholder="Es. Sistema il soggiorno" className={campo} />
        </label>

        <label className="block text-sm text-muted">
          Area
          <select value={areaId} onChange={(e) => setAreaId(e.target.value)} className={campo}>
            {stato.aree.map((a) => (
              <option key={a.id} value={a.id}>{a.nome}</option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm text-muted">
            Durata (min, facoltativa)
            <input inputMode="numeric" value={durata} onChange={(e) => setDurata(e.target.value)} placeholder="15" className={campo} />
          </label>
          <label className="block text-sm text-muted">
            Versione minima (min)
            <input inputMode="numeric" value={minima} onChange={(e) => setMinima(e.target.value)} placeholder="5" className={campo} />
          </label>
        </div>

        <label className="block text-sm text-muted">
          Quando
          <select value={tipo} onChange={(e) => setTipo(e.target.value as typeof tipo)} className={campo}>
            <option value="giornaliera">Ogni giorno</option>
            <option value="settimana">Giorni della settimana</option>
            <option value="una_volta">Una volta sola</option>
          </select>
        </label>

        {tipo === "settimana" && (
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5, 6, 0].map((g) => (
              <button
                key={g}
                onClick={() => setGiorni((x) => (x.includes(g) ? x.filter((y) => y !== g) : [...x, g]))}
                className={`rounded-full px-3 py-1.5 text-sm ${giorni.includes(g) ? "bg-accent text-black" : "bg-white/10"}`}
              >
                {GIORNI_LUNGHI[g].slice(0, 3)}
              </button>
            ))}
          </div>
        )}
        {tipo === "una_volta" && (
          <label className="block text-sm text-muted">
            Giorno
            <input type="date" value={data} onChange={(e) => setData(e.target.value)} className={campo} />
          </label>
        )}

        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm text-muted">
            Momento
            <select value={fascia} onChange={(e) => setFascia(e.target.value as Fascia)} className={campo}>
              <option value="qualsiasi">Quando vuoi</option>
              <option value="mattina">Mattina</option>
              <option value="pomeriggio">Pomeriggio</option>
              <option value="sera">Sera</option>
            </select>
          </label>
          <label className="block text-sm text-muted">
            Giorni
            <select value={solo} onChange={(e) => setSolo(e.target.value as Task["solo"])} className={campo}>
              <option value="sempre">Tutti</option>
              <option value="lavoro">Solo con turno</option>
              <option value="riposo">Solo di riposo</option>
            </select>
          </label>
        </div>

        <label className="block text-sm text-muted">
          Punti (se vuoto: {puntiAuto(num(durata))})
          <input inputMode="numeric" value={punti} onChange={(e) => setPunti(e.target.value)} className={campo} />
        </label>

        <label className="block text-sm text-muted">
          Promemoria (orari, es. 10:00, 18:00)
          <input value={promemoria} onChange={(e) => setPromemoria(e.target.value)} placeholder="10:00, 18:00" className={campo} />
          <span className="mt-1 block text-xs">Ripetuti fino a quando non la fai. Partiranno con le notifiche.</span>
        </label>

        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" checked={adatta} onChange={(e) => setAdatta(e.target.checked)} className="h-5 w-5" />
          Adatta ai turni: suggerisce il momento libero e manda i promemoria solo lì
        </label>

        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" checked={soloACasa} onChange={(e) => setSoloACasa(e.target.checked)} className="h-5 w-5" />
          Si fa solo a casa (in modalità fuori casa sparisce)
        </label>

        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" checked={essenziale} onChange={(e) => setEssenziale(e.target.checked)} className="h-5 w-5" />
          Essenziale: resta anche nel giorno dopo la notte
        </label>

        <button data-suono="via" onClick={salva} disabled={!valido} className="w-full rounded-2xl bg-accent py-3.5 text-lg font-bold text-black disabled:opacity-40">
          Salva
        </button>
        {iniziale && (
          <button
            data-suono="indietro"
            onClick={() => confirm("Eliminare questa task? Le prove già accumulate restano.") && (eliminaTask(iniziale.id), onClose())}
            className="w-full rounded-2xl bg-red-500/15 py-3 text-red-300"
          >
            Elimina task
          </button>
        )}
      </div>
    </div>
  );
}
