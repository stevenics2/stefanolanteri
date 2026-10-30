"use client";

import { useState } from "react";
import { GIORNI_LUNGHI } from "@/lib/date";
import { nuovoId } from "@/lib/seed";
import { useStore } from "@/lib/store";
import AreaIcona from "../components/AreaIcona";
import { Chip, Etichetta, Interruttore, Riquadro, Schermo } from "./ui";

// Durata, versione minima e punti consigliati per ogni attività.
const ATTIVITA = [
  { id: "corsa", nome: "Corsa", durata: 30, minima: 10, xp: 40 },
  { id: "palestra", nome: "Palestra", durata: 60, minima: 20, xp: 60 },
  { id: "freddo", nome: "Bagno freddo", durata: 5, minima: 2, xp: 30 },
  { id: "camminata", nome: "Camminata", durata: 30, minima: 10, xp: 30 },
  { id: "bici", nome: "Bici", durata: 45, minima: 15, xp: 50 },
  { id: "nuoto", nome: "Nuoto", durata: 40, minima: 15, xp: 50 },
  { id: "stretching", nome: "Stretching", durata: 15, minima: 5, xp: 20 },
  { id: "yoga", nome: "Yoga", durata: 30, minima: 10, xp: 30 },
];

export default function FormAllenamento({ onClose }: { onClose: () => void }) {
  const { oggi, salvaTask } = useStore();
  const [scelta, setScelta] = useState(ATTIVITA[0]);
  const [durata, setDurata] = useState(ATTIVITA[0].durata);
  const [minima, setMinima] = useState(ATTIVITA[0].minima);
  const [xp, setXp] = useState(ATTIVITA[0].xp);
  const [ognigiorno, setOgniGiorno] = useState(false);
  const [giorni, setGiorni] = useState<number[]>([]);
  const [adatta, setAdatta] = useState(true);

  const cambia = (a: (typeof ATTIVITA)[number]) => {
    setScelta(a);
    setDurata(a.durata);
    setMinima(a.minima);
    setXp(a.xp);
  };
  const valido = ognigiorno || giorni.length > 0;

  const salva = () => {
    if (!valido) return;
    salvaTask({
      id: nuovoId(), titolo: scelta.nome, areaId: "allenamento", icona: scelta.id,
      durataMin: durata, minimaMin: minima,
      ricorrenza: ognigiorno ? { tipo: "giornaliera" } : { tipo: "settimana", giorni },
      fascia: "qualsiasi", solo: "sempre", soloACasa: false, promemoria: [], adattaATurni: adatta,
      punti: xp, essenziale: false, attiva: true, creatoIl: oggi,
    });
    onClose();
  };

  return (
    <Schermo titolo="Nuovo allenamento" onClose={onClose}>
      <div>
        <Etichetta>Che allenamento?</Etichetta>
        <div className="grid grid-cols-4 gap-2">
          {ATTIVITA.map((a) => (
            <Riquadro key={a.id} attivo={scelta.id === a.id} nome={a.nome} onClick={() => cambia(a)}
              icona={<AreaIcona nome={a.id} colore="currentColor" size={22} badge={false} />} />
          ))}
        </div>
        {scelta.id === "freddo" && <p className="mt-2 text-xs text-amber-300">Mai da solo in acque libere, e mai in acqua dopo Wim Hof o alla guida.</p>}
      </div>

      <div>
        <Etichetta>Quali giorni?</Etichetta>
        <div className="mb-2"><Chip attivo={ognigiorno} onClick={() => setOgniGiorno((v) => !v)}>Ogni giorno</Chip></div>
        {!ognigiorno && (
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5, 6, 0].map((g) => (
              <Chip key={g} attivo={giorni.includes(g)} onClick={() => setGiorni((x) => (x.includes(g) ? x.filter((y) => y !== g) : [...x, g]))}>
                {GIORNI_LUNGHI[g].slice(0, 3)}
              </Chip>
            ))}
          </div>
        )}
      </div>

      <div>
        <Etichetta>Durata (minuti)</Etichetta>
        <div className="flex flex-wrap gap-2">
          {[5, 10, 15, 20, 30, 45, 60, 90].map((m) => <Chip key={m} attivo={durata === m} onClick={() => setDurata(m)}>{m}</Chip>)}
        </div>
      </div>
      <div>
        <Etichetta>Versione minima (basta questa per tenere la serie)</Etichetta>
        <div className="flex flex-wrap gap-2">
          {[2, 5, 10, 15, 20].map((m) => <Chip key={m} attivo={minima === m} onClick={() => setMinima(m)}>{m} min</Chip>)}
        </div>
      </div>
      <div>
        <Etichetta>Punti XP</Etichetta>
        <div className="flex flex-wrap gap-2">
          {[20, 30, 40, 50, 60, 100].map((v) => <Chip key={v} attivo={xp === v} onClick={() => setXp(v)}>+{v}</Chip>)}
        </div>
      </div>

      <Interruttore valore={adatta} onChange={setAdatta}>Adatta ai turni: ti suggerisce il momento libero e ti avvisa lì</Interruttore>

      <button data-suono="via" onClick={salva} disabled={!valido} className="w-full rounded-2xl bg-accent py-3.5 text-lg font-bold text-black disabled:opacity-40">
        Salva allenamento
      </button>
    </Schermo>
  );
}
