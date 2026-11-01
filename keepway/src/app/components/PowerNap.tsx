"use client";

import { BedDouble } from "lucide-react";
import { useState } from "react";
import { DURATE_NAP, momentoNap, serveNap } from "@/lib/nap";
import { oreMinuti } from "@/lib/salute";
import { debitoComplessivo, notti } from "@/lib/sonnoProgressi";
import { hhmm } from "@/lib/sonno";
import { useStore } from "@/lib/store";
import { useDatiSalute } from "@/lib/useSalute";
import type { Task } from "@/lib/tipi";

const chiave = (oggi: string) => `keepway.nap.${oggi}`;
const letto = (oggi: string) => {
  try {
    return localStorage.getItem(chiave(oggi));
  } catch {
    return null;
  }
};

// Dopo una notte corta propone un power nap nel primo pomeriggio: se accetti diventa una task di oggi, con la sua notifica.
export default function PowerNap() {
  const { pronto, stato, oggi, adesso, salvaTask, impostaMomento } = useStore();
  const tutti = useDatiSalute(30);
  const salute = tutti ? tutti.giorni : null;
  const [durata, setDurata] = useState<number>(30);
  const [giaScelto, setGiaScelto] = useState(false);

  if (!pronto || !oggi || adesso === 0 || !salute) return null;
  const chiusa = giaScelto || letto(oggi) !== null;
  if (chiusa) return null;
  const n = notti(salute);
  const stanotte = n.find((x) => x.giorno === oggi) ?? null;
  const { debito } = debitoComplessivo(salute, tutti?.sonni, stato.impostazioni.obiettivoSonnoMin, oggi, adesso);
  if (!serveNap(stanotte?.minuti ?? null, debito, stato.impostazioni.obiettivoSonnoMin)) return null;
  const d = new Date(adesso);
  const slot = momentoNap(oggi, d.getHours() * 60 + d.getMinutes(), durata);
  if (!DURATE_NAP.some((m) => momentoNap(oggi, d.getHours() * 60 + d.getMinutes(), m))) return null; // nessun momento adatto, con nessuna durata: meglio non proporlo

  const chiudi = (esito: "ok" | "no") => {
    try {
      localStorage.setItem(chiave(oggi), esito);
    } catch {
      // pazienza
    }
    setGiaScelto(true);
  };
  const pianifica = () => {
    if (!slot) return;
    const task: Task = {
      id: `power-nap-${oggi}`, titolo: "Power nap", areaId: "selfcare", durataMin: durata, minimaMin: null,
      ricorrenza: { tipo: "una_volta", data: oggi }, fascia: "pomeriggio", solo: "sempre", punti: 15, essenziale: true, soloACasa: false,
      promemoria: [hhmm(slot.da)], icona: "luna", attiva: true, creatoIl: oggi,
    };
    salvaTask(task);
    impostaMomento(task.id, slot);
    chiudi("ok");
  };

  return (
    <div className="entra rounded-2xl border border-indigo-400/40 bg-indigo-500/10 p-4">
      <div className="flex items-center gap-2 text-sm text-indigo-200"><BedDouble size={16} /> Notte corta</div>
      <p className="mt-1">
        Stanotte hai dormito <b>{stanotte ? oreMinuti(stanotte.minuti) : "poco"}</b>. Un power nap oggi ti aiuta a recuperare, senza rovinare la notte.
      </p>
      <div className="mt-3 flex gap-2">
        {DURATE_NAP.map((m) => (
          <button key={m} data-suono="nessuno" onClick={() => setDurata(m)} className={`flex-1 rounded-xl py-2 text-sm font-semibold ${durata === m ? "bg-indigo-300 text-black" : "bg-ov/10"}`}>{m} min</button>
        ))}
      </div>
      {slot ? (
        <p className="mt-2 text-sm text-muted">Il momento migliore: <b className="text-foreground">{hhmm(slot.da)}–{hhmm(slot.a)}</b> (libero, e almeno 6 ore prima di andare a letto). 30 minuti sono l&apos;ideale; oltre 45 ci si sveglia intontiti.</p>
      ) : (
        <p className="mt-2 text-sm text-muted">Oggi non c&apos;è un momento libero adatto per questa durata. Prova con un riposino più corto, o salta.</p>
      )}
      <div className="mt-3 flex gap-2">
        <button data-suono="via" disabled={!slot} onClick={pianifica} className="flex-1 rounded-xl bg-indigo-300 py-2.5 text-sm font-bold text-black disabled:opacity-40">Pianifica</button>
        <button data-suono="indietro" onClick={() => chiudi("no")} className="rounded-xl bg-ov/10 px-4 py-2.5 text-sm">Non oggi</button>
      </div>
    </div>
  );
}
