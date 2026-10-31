"use client";

import { Check, Copy, HeartPulse } from "lucide-react";
import { useState } from "react";
import { cancellaSalute, codiceSalute, indirizzoInvio, oreMinuti, rigeneraCodice } from "@/lib/salute";
import { useSalute } from "@/lib/useSalute";

// Sonno e passi dall'Apple Watch: li legge un Comando Rapido dell'iPhone (che ha il permesso per l'app Salute) e li manda a Keepway.
export default function SaluteImpostazioni() {
  const dati = useSalute(14);
  const [copiato, setCopiato] = useState(false);
  const [codice, setCodice] = useState(() => codiceSalute());
  const indirizzo = codice ? indirizzoInvio() : "";
  const ultimo = dati?.[0];

  const copia = async () => {
    try {
      await navigator.clipboard.writeText(indirizzo);
      setCopiato(true);
      setTimeout(() => setCopiato(false), 2200);
    } catch {
      window.prompt("Copia questo indirizzo:", indirizzo);
    }
  };

  return (
    <div id="salute" className="space-y-2">
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted"><HeartPulse size={15} /> Salute: sonno e passi</h2>
      <p className="text-sm text-muted">
        Keepway non può leggere l&apos;app Salute da solo. Lo fa un <b>Comando rapido</b> sul tuo iPhone, che ha già il permesso, e poi <b>manda</b> i dati a Keepway con un indirizzo web, come un corriere.
        Le informazioni arrivano in Progressi e nel riquadro del sonno.
      </p>

      <div className="space-y-3 rounded-2xl bg-card p-4">
        <div className="text-sm">
          {ultimo ? (
            <>
              Ultimo dato ricevuto: <b>{ultimo.giorno}</b>
              {ultimo.passi ? ` · ${ultimo.passi.toLocaleString("it-IT")} passi` : ""}
              {ultimo.sonnoMin ? ` · ${oreMinuti(ultimo.sonnoMin)} di sonno` : ""}
            </>
          ) : (
            "Nessun dato ricevuto ancora."
          )}
        </div>
        <div>
          <div className="mb-1 text-xs text-muted">Il tuo indirizzo personale (contiene il tuo codice: non condividerlo)</div>
          <div className="break-all rounded-xl bg-ov/10 px-3 py-2 font-mono text-[11px] leading-snug">{indirizzo || "non disponibile"}</div>
          <button data-suono="via" onClick={copia} className="mt-2 inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-black">
            {copiato ? <><Check size={16} /> Copiato</> : <><Copy size={16} /> Copia l&apos;indirizzo</>}
          </button>
        </div>
      </div>

      <details className="rounded-2xl bg-card p-4 text-sm">
        <summary className="cursor-pointer font-semibold">Come creare il Comando rapido (una volta sola)</summary>
        <ol className="mt-3 list-decimal space-y-2 pl-5">
          <li>Apri <b>Comandi rapidi</b>, tocca <b>+</b> e chiamalo <b>Keepway Salute</b>.</li>
          <li>
            <b>Passi.</b> Aggiungi <b>Trova campioni di Salute</b>: tipo <b>Passi</b>, data di inizio <b>è oggi</b>. Poi aggiungi <b>Calcola statistica</b> (<b>Somma</b>) e dai al risultato il nome <b>Passi</b> (azione <b>Imposta variabile</b>).
          </li>
          <li>
            <b>Sonno.</b> Aggiungi <b>Trova campioni di Salute</b>: tipo <b>Analisi del sonno</b>, data di fine <b>è oggi</b>, e valore <b>Core, Profondo, REM</b> (se c&apos;è anche «Addormentato», includilo). Poi <b>Ottieni dettagli dei campioni di Salute</b> → <b>Durata</b>, e <b>Calcola statistica</b> → <b>Somma</b>. Chiamalo <b>Sonno</b>.
          </li>
          <li>
            <b>A letto e sveglia.</b> Un secondo <b>Trova campioni di Salute</b> sul sonno di oggi, ordinato per <b>Data di inizio</b> dal più vecchio, limite <b>1</b> → <b>Ottieni dettagli</b>: <b>Data di inizio</b> → <b>Formatta data</b> con formato personalizzato <b>HH:mm</b> → chiamalo <b>Letto</b>. Lo stesso, ordinando per <b>Data di fine</b> dal più recente e prendendo <b>Data di fine</b>, per <b>Sveglia</b>.
          </li>
          <li>
            Infine <b>Ottieni contenuti dell&apos;URL</b> con questo indirizzo, scrivendo di seguito e inserendo le variabili: <span className="break-all font-mono text-[11px]">{indirizzo || "…"}&amp;passi=<i>Passi</i>&amp;sonno=<i>Sonno</i>&amp;letto=<i>Letto</i>&amp;sveglia=<i>Sveglia</i></span>
          </li>
          <li>Toccalo una volta a mano: l&apos;iPhone chiede il permesso di leggere Salute e di inviare i dati. Poi controlla qui sopra: deve comparire «Ultimo dato ricevuto».</li>
          <li>
            <b>In automatico.</b> In Comandi rapidi → <b>Automazione</b> → <b>Ora del giorno</b> (per esempio 12:00 e 22:30) → esegui <b>Keepway Salute</b> e scegli <b>Esegui subito</b> (così non chiede conferma ogni volta).
          </li>
        </ol>
        <p className="mt-3 text-xs text-muted">
          I nomi delle azioni possono cambiare un po&apos; a seconda della versione di iOS. Se non hai tutti i dati va bene lo stesso: puoi mandare anche solo i passi, o solo il sonno.
          Il sonno può arrivare in ore, minuti o secondi: Keepway lo riconosce da solo. Se il Comando rapido ti dà qualche difficoltà dimmi a che punto sei e lo sistemiamo insieme.
        </p>
      </details>

      <div className="flex gap-2">
        <button
          data-suono="nessuno"
          onClick={() => confirm("Creare un nuovo codice? Il vecchio indirizzo smette di funzionare e dovrai aggiornare il Comando rapido.") && setCodice(rigeneraCodice())}
          className="flex-1 rounded-xl bg-ov/10 py-2.5 text-sm"
        >
          Nuovo codice
        </button>
        <button
          data-suono="nessuno"
          onClick={async () => {
            if (confirm("Cancellare tutti i dati di salute salvati su Keepway? Quelli dell'app Salute dell'iPhone restano.")) {
              await cancellaSalute();
              location.reload();
            }
          }}
          className="flex-1 rounded-xl bg-red-500/15 py-2.5 text-sm text-red-300"
        >
          Cancella i miei dati
        </button>
      </div>
      <p className="text-xs text-muted">I dati di salute sono tuoi: stanno sul server di Keepway (Cloudflare) legati solo al tuo codice, e li puoi cancellare quando vuoi.</p>
    </div>
  );
}
