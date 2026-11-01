"use client";

import { Check, Copy, HeartPulse } from "lucide-react";
import { useState } from "react";
import { cancellaSalute, codiceSalute, indirizzoInvio, linkSincronizza, oreMinuti, rigeneraCodice } from "@/lib/salute";
import { dataEuropea, dataOraEuropea } from "@/lib/date";
import { useDatiSalute } from "@/lib/useSalute";

const quandoFa = (ms: number) => {
  const min = Math.max(0, Math.round((Date.now() - ms) / 60_000));
  if (min < 1) return "adesso";
  if (min < 60) return `${min} min fa`;
  if (min < 1440) return `${Math.round(min / 60)} h fa`;
  return `${Math.round(min / 1440)} giorni fa`;
};

// Sonno e passi dall'Apple Watch: li legge un Comando Rapido dell'iPhone (che ha il permesso per l'app Salute) e li manda a Keepway.
export default function SaluteImpostazioni() {
  const tutti = useDatiSalute(14);
  const dati = tutti?.giorni;
  const ultimoAllenamento = tutti?.allenamenti[0];
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
        <div className="flex items-center justify-between gap-3 text-sm">
          <span>
            Ultima sincronizzazione: <b>{tutti?.ultimo ? quandoFa(tutti.ultimo) : "mai"}</b>{tutti?.ultimo ? <span className="block text-xs text-muted">{dataOraEuropea(tutti.ultimo)}</span> : null}
          </span>
          <a href={linkSincronizza()} data-suono="nessuno" className="shrink-0 rounded-xl bg-ov/10 px-3 py-1.5 text-xs font-semibold">Sincronizza</a>
        </div>
        {ultimoAllenamento && (
          <div className="text-sm text-muted">
            Ultimo allenamento: {ultimoAllenamento.tipo} · {dataEuropea(ultimoAllenamento.giorno)}
            {ultimoAllenamento.minuti ? ` · ${ultimoAllenamento.minuti} min` : ""}
            {ultimoAllenamento.km ? ` · ${ultimoAllenamento.km.toLocaleString("it-IT")} km` : ""}
            {ultimoAllenamento.aggiornato ? <><br />Ricevuto il {dataOraEuropea(ultimoAllenamento.aggiornato)}</> : null}
          </div>
        )}
        <div className="text-sm">
          {ultimo ? (
            <>
              Ultimo dato ricevuto: <b>{dataEuropea(ultimo.giorno)}</b>
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
          <li>Apri <b>Comandi rapidi</b>, tocca <b>+</b> e chiamalo esattamente <b>Keepway Salute</b> (il pulsante «Sincronizza» lo cerca con questo nome).</li>
          <li>
            <b>Passi.</b> Aggiungi <b>Trova campioni di Salute</b>: tipo <b>Passi</b>, data di inizio <b>è oggi</b>. Poi <b>Calcola statistica</b> (<b>Somma</b>) e <b>Imposta variabile</b> con nome <b>Passi</b>.
          </li>
          <li>
            <b>Sonno</b> (quattro azioni, senza calcoli: i conti li fa Keepway).
            <ol className="mt-1 list-[lower-alpha] space-y-1 pl-5">
              <li><b>Trova campioni di dati sanitari</b>: <b>Tipo è Sleep</b> e <b>Data di inizio è negli ultimi 3 giorni</b>. Nessun altro filtro.</li>
              <li><b>Ripeti per ciascun elemento</b> (sul risultato). Dentro metti un&apos;azione <b>Testo</b> con tre pezzi separati da <b>;</b> (punto e virgola): <i>Valore</i> ; <i>Data di inizio</i> ; <i>Data di fine</i>. Si inseriscono toccando <b>Elemento ripetizione</b> e scegliendo la proprietà. Il primo pezzetto può restare scritto «Elemento ripetizione» anche con <b>Valore</b> scelto, e va bene: la lista deve mostrare «Core», «Awake», «REM»… Se mostra «Campione di dati sanitari», usa invece la proprietà <b>Valore</b>.</li>
              <li>Dopo <b>Fine ripetizione</b>, aggiungi <b>Combina testo</b> sul <b>Risultato della ripetizione</b>, con separatore <b>Nuova riga</b>.</li>
              <li><b>Ottieni contenuti dell&apos;URL</b> con l&apos;indirizzo (senza altro dopo il codice), <b>Metodo POST</b>, <b>Corpo della richiesta: JSON</b>, e un campo di tipo <b>Testo</b> con chiave <span className="font-mono text-[11px]">campioni</span> e valore <i>Testo combinato</i>. Nell&apos;indirizzo il testo lungo si perde; nel corpo no.</li>
              <li><b>Storico:</b> la prima volta puoi cambiare «negli ultimi 3 giorni» in <b>30 giorni</b>, lanciare il comando una volta e poi rimetterlo a 3. Così i grafici del sonno partono già pieni. Il giorno più vecchio dell'elenco viene saltato (potrebbe essere tagliato a metà).</li>
            </ol>
          </li>
          <li>
            <b>Allenamenti.</b> Aggiungi <b>Trova campioni di Salute</b>: tipo <b>Allenamenti</b>, data di inizio <b>è oggi</b>. Poi <b>Ripeti con ciascun elemento</b> e, dentro, un altro <b>Ottieni contenuti dell&apos;URL</b> con: <span className="break-all font-mono text-[11px]">{indirizzo || "…"}&amp;allenamento=<i>Tipo</i>&amp;minuti=<i>Durata</i>&amp;km=<i>Distanza</i>&amp;inizio=<i>Ora di inizio</i></span> (<i>Ora di inizio</i> = <b>Data di inizio</b> con <b>Formatta data</b> <b>HH:mm</b>; la distanza va in <b>km</b>, e per la palestra non serve).
            Se lo stesso allenamento arriva due volte non c&apos;è problema: Keepway lo riconosce e lo conta una volta sola.
          </li>
          <li>Toccalo una volta a mano: l&apos;iPhone chiede i permessi per Salute e per inviare i dati. Per il sonno, in <b>Impostazioni → App → Comandi rapidi</b> bisogna consentire <b>la condivisione di grandi quantità di dati</b>. Poi guarda qui sopra: deve comparire «Ultimo dato ricevuto».</li>
        </ol>

        <h3 className="mt-4 font-semibold">Farlo partire senza pensarci</h3>
        <p className="mt-1 text-xs text-muted">Senza fare niente: la <b>prima volta che apri Keepway dopo una notte</b> compare un popup che propone «Sincronizza». Se vuoi che parta anche da solo, in più puoi creare queste automazioni (facoltative).</p>
        <p className="mt-1 text-xs text-muted">In Comandi rapidi → <b>Automazione</b> → <b>+</b>. In tutte scegli <b>Esegui subito</b> (così non chiede conferma) e come azione <b>Esegui comando rapido</b> → <b>Keepway Salute</b>.</p>
        <ol className="mt-2 list-decimal space-y-2 pl-5">
          <li><b>Fine allenamento</b> (Apple Watch: «Allenamento» → «Termina»): subito dopo una corsa o la palestra la task si segna da sola.</li>
          <li><b>Sveglia</b> (Sveglia → «Quando mi sveglio»): porta a Keepway l&apos;orario vero del risveglio e quanto hai dormito.</li>
          <li><b>Ora del giorno</b>, una automazione per ognuno di questi orari: <b>07:00</b>, <b>11:00</b>, <b>15:00</b> e <b>19:00</b>. Portano il sonno e i passi a Keepway durante la giornata, e sono la rete di sicurezza se le altre non partono.</li>
        </ol>
        <p className="mt-3 text-xs text-muted">
          Attenzione: con l&apos;iPhone bloccato l&apos;app Salute è protetta e il comando può non leggere niente. Per questo conviene lasciare qualche orario fisso, e usare il popup di Keepway («Sincronizza») quando serve.
          Alle <b>22:30</b>, se oggi non è arrivato nulla (cioè se nessuna delle automazioni è partita), Keepway ti manda una notifica (solo se in passato hai già sincronizzato) e un popup con il pulsante «Sincronizza».
          I nomi delle azioni possono cambiare un po&apos; con la versione di iOS: se non hai tutti i dati va bene lo stesso, puoi mandare anche solo una parte. Il sonno può arrivare in ore, minuti o secondi: Keepway lo riconosce.
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
