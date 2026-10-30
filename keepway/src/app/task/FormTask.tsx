"use client";

import { CalendarCheck, CalendarDays, Repeat } from "lucide-react";
import { useState } from "react";
import { GIORNI_LUNGHI } from "@/lib/date";
import { puntiAuto } from "@/lib/regole";
import { nuovoId } from "@/lib/seed";
import { useStore } from "@/lib/store";
import type { Fascia, Task } from "@/lib/tipi";
import AreaIcona from "../components/AreaIcona";
import { campo, Chip, Etichetta, Interruttore, Riquadro, Schermo } from "./ui";

// Scorciatoie: una stanza in un giorno preciso (la rotazione quotidiana c'è già).
const STANZE = ["Sistema il soggiorno", "Sistema il bagno", "Sistema la camera", "Sistema la cucina", "Sistema l'ingresso", "Sistema il balcone"];

export default function FormTask({ iniziale, onClose }: { iniziale: Task | null; onClose: () => void }) {
  const { stato, oggi, salvaTask, eliminaTask } = useStore();
  const [titolo, setTitolo] = useState(iniziale?.titolo ?? "");
  const [areaId, setAreaId] = useState(iniziale?.areaId ?? "abitudini");
  const [durata, setDurata] = useState<number | null>(iniziale ? iniziale.durataMin : 15);
  const [minima, setMinima] = useState<number | null>(iniziale ? iniziale.minimaMin : 5);
  const [tipo, setTipo] = useState<"giornaliera" | "settimana" | "una_volta">(iniziale?.ricorrenza.tipo ?? "giornaliera");
  const [giorni, setGiorni] = useState<number[]>(iniziale?.ricorrenza.tipo === "settimana" ? iniziale.ricorrenza.giorni : []);
  const [data, setData] = useState(iniziale?.ricorrenza.tipo === "una_volta" ? iniziale.ricorrenza.data : oggi);
  const [fascia, setFascia] = useState<Fascia>(iniziale?.fascia ?? "qualsiasi");
  const [xp, setXp] = useState<number | null>(iniziale ? iniziale.punti : null);
  const [essenziale, setEssenziale] = useState(iniziale?.essenziale ?? false);
  const [soloACasa, setSoloACasa] = useState(iniziale?.soloACasa ?? false);
  const [adatta, setAdatta] = useState(iniziale?.adattaATurni ?? false);
  const [spostamento, setSpostamento] = useState(iniziale?.spostamentoMin ?? 0);
  const [promemoria, setPromemoria] = useState((iniziale?.promemoria ?? []).join(", "));

  const puntiFinali = xp ?? puntiAuto(durata);
  const valido = titolo.trim() !== "" && (tipo !== "settimana" || giorni.length > 0);

  const stanza = (nome: string) => {
    setTitolo(nome);
    setAreaId("casa");
    setDurata(15);
    setMinima(5);
    setSoloACasa(true);
    setTipo("una_volta");
    setXp(50);
  };

  const salva = () => {
    if (!valido) return;
    salvaTask({
      id: iniziale?.id ?? nuovoId(),
      titolo: titolo.trim(),
      areaId,
      icona: iniziale?.icona,
      durataMin: durata,
      minimaMin: durata ? minima : null,
      ricorrenza: tipo === "giornaliera" ? { tipo } : tipo === "settimana" ? { tipo, giorni } : { tipo, data },
      fascia,
      solo: iniziale?.solo ?? "sempre",
      punti: puntiFinali,
      essenziale,
      soloACasa,
      adattaATurni: adatta,
      km: iniziale?.km,
      spostamentoMin: spostamento,
      promemoria: promemoria.split(/[,\s]+/).filter((o) => /^\d{1,2}:\d{2}$/.test(o)).map((o) => o.padStart(5, "0")),
      tipo: iniziale?.tipo,
      attiva: iniziale?.attiva ?? true,
      creatoIl: iniziale?.creatoIl ?? oggi,
    });
    onClose();
  };

  return (
    <Schermo titolo={iniziale ? "Modifica task" : "Nuova task"} onClose={onClose}>
      {!iniziale && (
        <div>
          <Etichetta>Una stanza in un giorno preciso:</Etichetta>
          <div className="flex flex-wrap gap-2">
            {STANZE.map((s) => <Chip key={s} attivo={titolo === s} onClick={() => stanza(s)}>{s.replace("Sistema ", "")}</Chip>)}
          </div>
        </div>
      )}

      <label className="block text-sm text-muted">
        Cosa devi fare
        <input value={titolo} onChange={(e) => setTitolo(e.target.value)} placeholder="Es. Studiare 20 minuti" className={campo} />
      </label>

      <div>
        <Etichetta>Di che area è?</Etichetta>
        <div className="grid grid-cols-4 gap-2">
          {stato.aree.map((a) => (
            <Riquadro key={a.id} attivo={areaId === a.id} nome={a.nome.split(" ")[0]} onClick={() => setAreaId(a.id)}
              icona={<AreaIcona nome={a.icona} colore="currentColor" size={22} badge={false} />} />
          ))}
        </div>
      </div>

      <div>
        <Etichetta>Quanto dura (minuti)</Etichetta>
        <div className="flex flex-wrap gap-2">
          <Chip attivo={durata === null} onClick={() => setDurata(null)}>Senza timer</Chip>
          {[5, 10, 15, 20, 30, 45, 60].map((m) => <Chip key={m} attivo={durata === m} onClick={() => setDurata(m)}>{m}</Chip>)}
        </div>
      </div>
      {durata !== null && (
        <div>
          <Etichetta>Versione minima (basta questa per tenere la serie)</Etichetta>
          <div className="flex flex-wrap gap-2">
            <Chip attivo={minima === null} onClick={() => setMinima(null)}>Nessuna</Chip>
            {[2, 3, 5, 10].map((m) => <Chip key={m} attivo={minima === m} onClick={() => setMinima(m)}>{m} min</Chip>)}
          </div>
        </div>
      )}

      <div>
        <Etichetta>Quando</Etichetta>
        <div className="grid grid-cols-3 gap-2">
          <Riquadro attivo={tipo === "giornaliera"} nome="Ogni giorno" onClick={() => setTipo("giornaliera")} icona={<Repeat size={22} />} />
          <Riquadro attivo={tipo === "settimana"} nome="Giorni fissi" onClick={() => setTipo("settimana")} icona={<CalendarDays size={22} />} />
          <Riquadro attivo={tipo === "una_volta"} nome="Una volta" onClick={() => setTipo("una_volta")} icona={<CalendarCheck size={22} />} />
        </div>
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

      <div>
        <Etichetta>Spostamento (andata, e altrettanto per il ritorno)</Etichetta>
        <div className="flex flex-wrap gap-2">
          {[0, 10, 20, 30, 45].map((m) => <Chip key={m} attivo={spostamento === m} onClick={() => setSpostamento(m)}>{m === 0 ? "Da casa" : `${m} min`}</Chip>)}
        </div>
      </div>

      <div>
        <Etichetta>In che momento</Etichetta>
        <div className="flex flex-wrap gap-2">
          {([["qualsiasi", "Quando vuoi"], ["mattina", "Mattina"], ["pomeriggio", "Pomeriggio"], ["sera", "Prima di dormire"]] as const).map(([v, n]) => (
            <Chip key={v} attivo={fascia === v} onClick={() => setFascia(v)}>{n}</Chip>
          ))}
        </div>
      </div>

      <div>
        <Etichetta>Quanti XP vale</Etichetta>
        <div className="flex flex-wrap gap-2">
          <Chip attivo={xp === null} onClick={() => setXp(null)}>Auto (+{puntiAuto(durata)})</Chip>
          {[10, 20, 30, 50, 100].map((v) => <Chip key={v} attivo={xp === v} onClick={() => setXp(v)}>+{v}</Chip>)}
        </div>
      </div>

      <div className="space-y-2">
        <Interruttore valore={adatta} onChange={setAdatta}>Adatta ai turni: suggerisce il momento libero e avvisa lì</Interruttore>
        <Interruttore valore={essenziale} onChange={setEssenziale}>Essenziale: resta anche nei giorni pesanti</Interruttore>
        <Interruttore valore={soloACasa} onChange={setSoloACasa}>Si fa solo a casa (sparisce quando sei fuori)</Interruttore>
      </div>

      {!adatta && (
        <label className="block text-sm text-muted">
          Promemoria (orari, es. 10:00, 18:00)
          <input value={promemoria} onChange={(e) => setPromemoria(e.target.value)} placeholder="10:00, 18:00" className={campo} />
          <span className="mt-1 block text-xs">Si ripetono fino a quando non la fai.</span>
        </label>
      )}

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
    </Schermo>
  );
}
