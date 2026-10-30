"use client";

import { Bell, BellOff, BellRing } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { attivaPush, disattivaPush, inviaProva, statoPush, type StatoPush } from "@/lib/notifiche";

// Attiva, prova e disattiva le notifiche. Su iPhone funzionano solo dall'app aggiunta alla Home.
export default function NotificheImpostazioni() {
  const [stato, setStato] = useState<StatoPush | null>(null);
  const [messaggio, setMessaggio] = useState("");
  const [occupato, setOccupato] = useState(false);

  const aggiorna = useCallback(() => void statoPush().then(setStato), []);
  useEffect(() => aggiorna(), [aggiorna]);

  const esegui = async (azione: () => Promise<string | void>) => {
    setOccupato(true);
    setMessaggio("");
    try {
      const m = await azione();
      if (m) setMessaggio(m);
    } catch (e) {
      setMessaggio(e instanceof Error ? e.message : "Qualcosa non ha funzionato.");
    }
    setOccupato(false);
    aggiorna();
  };

  const box = "space-y-2 rounded-2xl bg-card p-4 text-sm";
  if (stato === null) return null;

  return (
    <div className="space-y-2">
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted">
        <Bell size={15} /> Notifiche
      </h2>

      {stato === "non_supportato" && <div className={box}>Questo browser non supporta le notifiche.</div>}

      {stato === "serve_home" && (
        <div className={box}>
          Su iPhone le notifiche funzionano solo dall&apos;app sulla Home: premi <b>Condividi</b>, poi <b>Aggiungi alla schermata Home</b>, apri
          Keepway da quell&apos;icona e torna qui.
        </div>
      )}

      {stato === "bloccate" && (
        <div className={box}>Le notifiche sono bloccate. Sull&apos;iPhone: Impostazioni, Notifiche, Keepway, e consentile. Poi riapri l&apos;app.</div>
      )}

      {stato === "spente" && (
        <div className={box}>
          <p className="text-muted">Promemoria delle task, fine timer e &ldquo;più tardi&rdquo;, anche con l&apos;app chiusa. Non disturbano durante i turni e il sonno.</p>
          <button
            disabled={occupato}
            data-suono="via"
            onClick={() =>
              esegui(async () => {
                const r = await attivaPush();
                if (r === "negato") return "Permesso negato. Puoi cambiarlo dalle Impostazioni dell'iPhone.";
              })
            }
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 font-bold text-black disabled:opacity-50"
          >
            <BellRing size={18} /> Attiva notifiche
          </button>
        </div>
      )}

      {stato === "attive" && (
        <div className={box}>
          <div className="text-emerald-400">Notifiche attive su questo telefono.</div>
          <div className="grid grid-cols-2 gap-2">
            <button
              disabled={occupato}
              onClick={() =>
                esegui(async () => {
                  const r = await inviaProva();
                  return r.ok
                    ? `Apple ha accettato la notifica (${r.stato}): dovrebbe arrivare tra pochi secondi.`
                    : `Non inviata. Risposta: ${r.stato || "nessuna"}${r.dettaglio ? ` — ${r.dettaglio}` : ""}`;
                })
              }
              className="rounded-xl bg-white/10 py-2.5 disabled:opacity-50"
            >
              Invia una prova
            </button>
            <button
              disabled={occupato}
              data-suono="indietro"
              onClick={() => esegui(async () => void (await disattivaPush()))}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 py-2.5 disabled:opacity-50"
            >
              <BellOff size={16} /> Disattiva
            </button>
          </div>
        </div>
      )}

      {messaggio && <p className="text-sm text-muted">{messaggio}</p>}
    </div>
  );
}
