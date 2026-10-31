"use client";

import { useState } from "react";
import { GIORNI_LUNGHI } from "@/lib/date";
import { nuovoId } from "@/lib/seed";
import { useStore } from "@/lib/store";
import type { Task } from "@/lib/tipi";
import { campo, Chip, Etichetta, Schermo } from "./ui";
import PianoSettimana from "./PianoSettimana";

// Lavatrice (o altre faccende col seguito): quante volte, quando, e cosa ricordarti dopo il «Fatto».
export default function FormLavatrice({ onClose, iniziale }: { onClose: () => void; iniziale?: Task | null }) {
  const { oggi, salvaTask, eliminaTask } = useStore();
  const [titolo, setTitolo] = useState(iniziale?.titolo ?? "Lavatrice");
  const [automatica, setAutomatica] = useState(iniziale ? iniziale.ricorrenza.tipo === "auto" : true);
  const [volte, setVolte] = useState(iniziale?.ricorrenza.tipo === "auto" ? iniziale.ricorrenza.volte : 2);
  const [giorni, setGiorni] = useState<number[]>(iniziale?.ricorrenza.tipo === "settimana" ? iniziale.ricorrenza.giorni : []);
  const [ore, setOre] = useState(iniziale?.seguito ? iniziale.seguito.dopoMin / 60 : 4);
  const [titoloSeguito, setTitoloSeguito] = useState(iniziale?.seguito?.titolo ?? "Stendi il bucato");
  const [testo, setTesto] = useState(iniziale?.seguito?.testo ?? "Ricordati di stendere il bucato");
  const [xp, setXp] = useState(iniziale?.punti ?? 20);
  const [xpSeguito, setXpSeguito] = useState(iniziale?.seguito?.punti ?? 20);

  const valido = titolo.trim() !== "" && titoloSeguito.trim() !== "" && (automatica ? volte > 0 : giorni.length > 0);

  const costruisci = (id: string): Task => ({
    id, titolo: titolo.trim() || "Lavatrice", areaId: "casa", icona: "lavatrice", durataMin: null, minimaMin: null,
    ricorrenza: automatica ? { tipo: "auto", volte } : { tipo: "settimana", giorni },
    fascia: "qualsiasi", solo: "sempre", soloACasa: true, promemoria: [], adattaATurni: true, essenziale: false,
    seguito: { dopoMin: Math.round(ore * 60), titolo: titoloSeguito.trim() || "Stendi il bucato", testo: testo.trim() || "Ricordati di stendere il bucato", punti: xpSeguito },
    punti: xp, attiva: iniziale?.attiva ?? true, creatoIl: iniziale?.creatoIl ?? oggi,
  });

  const salva = () => {
    if (!valido) return;
    salvaTask(costruisci(iniziale?.id ?? nuovoId()));
    onClose();
  };

  return (
    <Schermo titolo={iniziale ? "Modifica lavatrice" : "Nuova lavatrice"} onClose={onClose}>
      <label className="block text-sm text-muted">
        Come si chiama
        <input value={titolo} onChange={(e) => setTitolo(e.target.value)} className={campo} />
      </label>

      <div>
        <Etichetta>Quando?</Etichetta>
        <div className="mb-3 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setAutomatica(true)} className={`rounded-xl py-2.5 text-sm font-semibold ${automatica ? "bg-accent text-black" : "bg-white/10"}`}>
            Decide l&apos;app
          </button>
          <button type="button" onClick={() => setAutomatica(false)} className={`rounded-xl py-2.5 text-sm font-semibold ${!automatica ? "bg-accent text-black" : "bg-white/10"}`}>
            Scelgo i giorni
          </button>
        </div>
        {automatica ? (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4].map((n) => <Chip key={n} attivo={volte === n} onClick={() => setVolte(n)}>{n} {n === 1 ? "volta" : "volte"} a settimana</Chip>)}
            </div>
            <p className="text-xs text-muted">
              L&apos;app la mette quando, a fine ciclo ({ore} {ore === 1 ? "ora" : "ore"} dopo), sei sveglio e libero per stendere. Mai nei giorni 1+4 o di malattia.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1.5">
            {[1, 2, 3, 4, 5, 6, 0].map((g) => {
              const attivo = giorni.includes(g);
              return (
                <button key={g} type="button" onClick={() => setGiorni((x) => (x.includes(g) ? x.filter((y) => y !== g) : [...x, g]))}
                  className={`rounded-xl py-2.5 text-sm font-semibold ${attivo ? "bg-accent text-black" : "bg-white/10"}`}>
                  {GIORNI_LUNGHI[g].slice(0, 3)}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <Etichetta>Dopo il «Fatto», quando ti ricordo?</Etichetta>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5, 6].map((h) => <Chip key={h} attivo={ore === h} onClick={() => setOre(h)}>{h} {h === 1 ? "ora" : "ore"}</Chip>)}
        </div>
        <p className="mt-1.5 text-xs text-muted">
          Quando premi «Fatto», dopo questo tempo si apre da sola una nuova task con la notifica. Arriva anche se sei in turno; se dormi c&apos;è il non disturbare e arriva al risveglio.
        </p>
      </div>

      <label className="block text-sm text-muted">
        La nuova task si chiama
        <input value={titoloSeguito} onChange={(e) => setTitoloSeguito(e.target.value)} className={campo} />
      </label>
      <label className="block text-sm text-muted">
        Testo della notifica
        <input value={testo} onChange={(e) => setTesto(e.target.value)} className={campo} />
      </label>

      <div>
        <Etichetta>Punti XP (lavatrice e nuova task)</Etichetta>
        <div className="flex flex-wrap gap-2">
          {[10, 20, 30].map((v) => <Chip key={v} attivo={xp === v} onClick={() => setXp(v)}>Lavatrice +{v}</Chip>)}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {[10, 20, 30].map((v) => <Chip key={v} attivo={xpSeguito === v} onClick={() => setXpSeguito(v)}>Seguito +{v}</Chip>)}
        </div>
      </div>

      {automatica && (
        <div>
          <Etichetta>{iniziale ? "Il piano" : "Anteprima del piano"}</Etichetta>
          <PianoSettimana task={costruisci(iniziale?.id ?? "anteprima")} modifica={!!iniziale && iniziale.ricorrenza.tipo === "auto"} />
          {iniziale && iniziale.ricorrenza.tipo === "auto" && <p className="mt-2 text-xs text-muted">Se cambi frequenza o tempo, salva: il piano si ricalcola.</p>}
        </div>
      )}

      <button data-suono="via" onClick={salva} disabled={!valido} className="w-full rounded-2xl bg-accent py-3.5 text-lg font-bold text-black disabled:opacity-40">
        {iniziale ? "Salva" : "Salva lavatrice"}
      </button>
      {iniziale && (
        <button data-suono="indietro" onClick={() => confirm("Eliminare la lavatrice?") && (eliminaTask(iniziale.id), onClose())} className="w-full rounded-2xl bg-red-500/15 py-3 text-red-300">
          Elimina
        </button>
      )}
    </Schermo>
  );
}
