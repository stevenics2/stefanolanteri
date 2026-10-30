"use client";

import { useState } from "react";
import { GIORNI_LUNGHI } from "@/lib/date";
import { MIN_PER_KM } from "@/lib/durata";
import { nuovoId } from "@/lib/seed";
import { useStore } from "@/lib/store";
import AreaIcona from "../components/AreaIcona";
import { Chip, Etichetta, Interruttore, Riquadro, Schermo } from "./ui";

const XP_PER_KM = 10;

// Per ogni attività: durata e punti consigliati, e quanto ci si mette ad andare (fuori casa).
// `km` = si misura in chilometri invece che in minuti (niente timer: la durata si ricava a 6 min/km).
const ATTIVITA = [
  { id: "corsa", nome: "Corsa", durata: 30, durate: [] as number[], xp: 0, spostamento: 20, km: true },
  { id: "palestra", nome: "Palestra", durata: 60, durate: [60, 90, 120], xp: 60, spostamento: 20, km: false },
  { id: "freddo", nome: "Bagno freddo", durata: 5, durate: [3, 5, 10], xp: 30, spostamento: 0, km: false },
  { id: "camminata", nome: "Camminata", durata: 30, durate: [20, 30, 45, 60], xp: 30, spostamento: 0, km: false },
  { id: "bici", nome: "Bici", durata: 45, durate: [30, 45, 60, 90], xp: 50, spostamento: 20, km: false },
  { id: "nuoto", nome: "Nuoto", durata: 40, durate: [30, 40, 60], xp: 50, spostamento: 20, km: false },
  { id: "stretching", nome: "Stretching", durata: 15, durate: [10, 15, 20, 30], xp: 20, spostamento: 0, km: false },
  { id: "yoga", nome: "Yoga", durata: 30, durate: [20, 30, 45, 60], xp: 30, spostamento: 0, km: false },
];

export default function FormAllenamento({ onClose }: { onClose: () => void }) {
  const { oggi, salvaTask } = useStore();
  const [scelta, setScelta] = useState(ATTIVITA[0]);
  const [durata, setDurata] = useState(ATTIVITA[0].durata);
  const [km, setKm] = useState(5);
  const [xp, setXp] = useState(ATTIVITA[0].xp);
  const [spostamento, setSpostamento] = useState(ATTIVITA[0].spostamento);
  const [giorni, setGiorni] = useState<number[]>([]);
  const [adatta, setAdatta] = useState(true);

  const cambia = (a: (typeof ATTIVITA)[number]) => {
    setScelta(a);
    setDurata(a.durata);
    setXp(a.xp);
    setSpostamento(a.spostamento);
  };
  const valido = giorni.length > 0;
  const xpFinali = scelta.km ? km * XP_PER_KM : xp;

  const salva = () => {
    if (!valido) return;
    salvaTask({
      id: nuovoId(), titolo: scelta.km ? `Corsa ${km} km` : scelta.nome, areaId: "allenamento", icona: scelta.id,
      durataMin: scelta.km ? null : durata, minimaMin: null, km: scelta.km ? km : undefined, spostamentoMin: spostamento,
      ricorrenza: { tipo: "settimana", giorni },
      fascia: "qualsiasi", solo: "sempre", soloACasa: false, promemoria: [], adattaATurni: adatta,
      punti: xpFinali, essenziale: false, attiva: true, creatoIl: oggi,
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
        <Etichetta>Quando?</Etichetta>
        <div className="grid grid-cols-7 gap-1.5">
          {[1, 2, 3, 4, 5, 6, 0].map((g) => {
            const attivo = giorni.includes(g);
            return (
              <button
                key={g}
                type="button"
                onClick={() => setGiorni((x) => (x.includes(g) ? x.filter((y) => y !== g) : [...x, g]))}
                className={`rounded-xl py-2.5 text-sm font-semibold ${attivo ? "bg-accent text-black" : "bg-white/10"}`}
              >
                {GIORNI_LUNGHI[g].slice(0, 3)}
              </button>
            );
          })}
        </div>
      </div>

      {scelta.km ? (
        <div>
          <Etichetta>Quanti km?</Etichetta>
          <div className="flex flex-wrap gap-2">
            {[3, 5, 8, 10, 12, 15, 21].map((k) => <Chip key={k} attivo={km === k} onClick={() => setKm(k)}>{k} km</Chip>)}
          </div>
          <p className="mt-1.5 text-xs text-muted">
            Circa {km * MIN_PER_KM} minuti di corsa ({MIN_PER_KM} min al km), più {spostamento * 2} di spostamento tra andata e ritorno. Vale {xpFinali} XP.
          </p>
        </div>
      ) : (
        <>
          <div>
            <Etichetta>Durata (minuti)</Etichetta>
            <div className="flex flex-wrap gap-2">
              {scelta.durate.map((m) => <Chip key={m} attivo={durata === m} onClick={() => setDurata(m)}>{m}</Chip>)}
            </div>
          </div>
          <div>
            <Etichetta>Punti XP</Etichetta>
            <div className="flex flex-wrap gap-2">
              {[20, 30, 40, 50, 60, 100].map((v) => <Chip key={v} attivo={xp === v} onClick={() => setXp(v)}>+{v}</Chip>)}
            </div>
          </div>
        </>
      )}

      <div>
        <Etichetta>Spostamento (andata, e altrettanto per il ritorno)</Etichetta>
        <div className="flex flex-wrap gap-2">
          {[0, 10, 20, 30, 45].map((m) => <Chip key={m} attivo={spostamento === m} onClick={() => setSpostamento(m)}>{m === 0 ? "Da casa" : `${m} min`}</Chip>)}
        </div>
      </div>

      <Interruttore valore={adatta} onChange={setAdatta}>Adatta ai turni: ti suggerisce il momento libero e ti avvisa lì</Interruttore>

      <button data-suono="via" onClick={salva} disabled={!valido} className="w-full rounded-2xl bg-accent py-3.5 text-lg font-bold text-black disabled:opacity-40">
        Salva allenamento
      </button>
    </Schermo>
  );
}
