"use client";

import { AlarmClock, Moon, Plane, Plus, Sun, X } from "lucide-react";
import { useState } from "react";
import { inVacanza } from "@/lib/regole";
import { useStore } from "@/lib/store";
import AreaIcona from "../components/AreaIcona";
import NotificheImpostazioni from "./NotificheImpostazioni";

export default function ImpostazioniVista() {
  const { pronto, stato, oggi, impostazioni, setFrase, setStanze, setVacanza, azzera } = useStore();
  const [nuovaStanza, setNuovaStanza] = useState("");
  const [dal, setDal] = useState("");
  const [al, setAl] = useState("");
  if (!pronto) return null;

  const esporta = () => {
    const blob = new Blob([JSON.stringify(stato, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "keepway-dati.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const aggiungiStanza = () => {
    const nome = nuovaStanza.trim();
    if (nome && !stato.stanze.includes(nome)) setStanze([...stato.stanze, nome]);
    setNuovaStanza("");
  };

  const fuori = inVacanza(stato.vacanza, oggi);
  const riga = "flex items-center justify-between rounded-2xl bg-card p-4";
  const campo = "mt-1 w-full rounded-xl bg-card px-3 py-2.5 text-foreground outline-none";
  const titolo = "text-sm font-semibold uppercase tracking-wide text-muted";
  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-bold">Impostazioni</h1>

      <div className="space-y-2">
        <div className={riga}>
          <span>Tema</span>
          <div className="inline-flex rounded-full bg-ov/10 p-0.5 text-sm" role="group" aria-label="Tema">
            {([["scuro", "Scuro", Moon], ["chiaro", "Chiaro", Sun]] as const).map(([t, nome, Icona]) => (
              <button
                key={t}
                data-suono="via"
                onClick={() => impostazioni({ tema: t })}
                aria-pressed={stato.impostazioni.tema === t}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-semibold ${stato.impostazioni.tema === t ? "bg-foreground text-background" : "text-muted"}`}
              >
                <Icona size={14} /> {nome}
              </button>
            ))}
          </div>
        </div>
        <label className={riga}>
          <span>Suoni</span>
          <input type="checkbox" className="h-5 w-5" checked={stato.impostazioni.suoni} onChange={(e) => impostazioni({ suoni: e.target.checked })} />
        </label>
        <label className={riga}>
          <span>Suono a ogni tocco</span>
          <input type="checkbox" className="h-5 w-5" checked={stato.impostazioni.suonoTocco} onChange={(e) => impostazioni({ suonoTocco: e.target.checked })} />
        </label>
        <label className={riga}>
          <span>Vibrazione a ogni tocco<span className="block text-xs text-muted">Su iPhone potrebbe non funzionare</span></span>
          <input type="checkbox" className="h-5 w-5" checked={stato.impostazioni.vibrazione} onChange={(e) => impostazioni({ vibrazione: e.target.checked })} />
        </label>
        <label className={riga}>
          <span>Animazioni e coriandoli</span>
          <input type="checkbox" className="h-5 w-5" checked={stato.impostazioni.animazioni} onChange={(e) => impostazioni({ animazioni: e.target.checked })} />
        </label>
      </div>

      <NotificheImpostazioni />

      <div id="sveglia" className="space-y-2">
        <h2 className={`${titolo} flex items-center gap-2`}><AlarmClock size={15} /> Sveglia dell&apos;iPhone</h2>
        <p className="text-sm text-muted">
          Un&apos;app web non può aprire l&apos;Orologio da sola, ma può aprire un Comando rapido che lo fa per te. Lo crei una volta sola, ci vuole un minuto:
        </p>
        <ol className="list-decimal space-y-1 rounded-2xl bg-card p-4 pl-8 text-sm">
          <li>Apri l&apos;app <b>Comandi rapidi</b> e tocca <b>+</b> per un nuovo comando.</li>
          <li>Chiamalo esattamente <b>Keepway Sveglia</b>.</li>
          <li>Aggiungi una sola azione: <b>Apri app</b>, e come app scegli <b>Orologio</b>.</li>
          <li>Salva. Non serve altro.</li>
          <li>Da Keepway, nel riquadro del sonno in Oggi, tocca <b>Imposta sveglia</b>: si apre l&apos;Orologio e la sveglia la imposti lì, con l&apos;orario che ti ha consigliato Keepway.</li>
        </ol>
        <p className="text-xs text-muted">
          L&apos;Orologio si apre sull&apos;ultima scheda usata: la prima volta tocca <b>Sveglia</b> in basso e poi resta lì. La prima volta l&apos;iPhone può chiederti il permesso di aprire il comando.
        </p>
      </div>

      <div className="space-y-2">
        <h2 className={`${titolo} flex items-center gap-2`}><Plane size={15} /> Fuori casa (vacanza / trasferta)</h2>
        <p className="text-sm text-muted">Quando non sei a casa le task &ldquo;solo a casa&rdquo; (stanze, piatti) spariscono. Le serie non si rompono.</p>
        {stato.vacanza ? (
          <div className="space-y-2 rounded-2xl bg-card p-4">
            <div className="text-sm">
              {fuori ? "Fuori casa" : "Programmato"}: dal {stato.vacanza.dal}
              {stato.vacanza.al ? ` al ${stato.vacanza.al}` : ", finché non torni"}
            </div>
            <button data-suono="indietro" onClick={() => setVacanza(null)} className="w-full rounded-xl bg-ov/10 py-2.5">Sono a casa / annulla</button>
          </div>
        ) : (
          <div className="space-y-2 rounded-2xl bg-card p-4">
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm text-muted">
                Dal
                <input type="date" value={dal || oggi} onChange={(e) => setDal(e.target.value)} className={campo.replace("bg-card", "bg-ov/10")} />
              </label>
              <label className="block text-sm text-muted">
                Al (facoltativo)
                <input type="date" value={al} onChange={(e) => setAl(e.target.value)} className={campo.replace("bg-card", "bg-ov/10")} />
              </label>
            </div>
            <button data-suono="via" onClick={() => setVacanza({ dal: dal || oggi, al: al || null })} className="w-full rounded-xl bg-accent py-2.5 font-bold text-black">
              Attiva
            </button>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <h2 className={titolo}>Stanze da sistemare</h2>
        <p className="text-sm text-muted">Una al giorno, a rotazione: non ricompare finché non le hai fatte tutte.</p>
        <div className="space-y-2">
          {stato.stanze.map((s) => (
            <div key={s} className={riga}>
              <span className="first-letter:uppercase">{s}</span>
              <button data-suono="indietro" onClick={() => setStanze(stato.stanze.filter((x) => x !== s))} aria-label={`Togli ${s}`} className="text-muted">
                <X size={18} />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={nuovaStanza}
            onChange={(e) => setNuovaStanza(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && aggiungiStanza()}
            placeholder="es. lo studio, la lavanderia"
            className="flex-1 rounded-xl bg-card px-3 py-2.5 outline-none"
          />
          <button data-suono="via" onClick={aggiungiStanza} aria-label="Aggiungi stanza" className="rounded-xl bg-accent px-4 text-black">
            <Plus size={20} />
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <h2 className={titolo}>La persona che vuoi diventare</h2>
        <p className="text-sm text-muted">Una frase per area: compare ogni volta che completi una task di quell&apos;area.</p>
        {stato.aree.map((a) => (
          <label key={a.id} className="block text-sm text-muted">
            <span className="flex items-center gap-2">
              <AreaIcona nome={a.icona} colore={a.colore} size={14} badge={false} /> {a.nome}
            </span>
            <input value={a.frase} onChange={(e) => setFrase(a.id, e.target.value)} className={campo} />
          </label>
        ))}
      </div>

      <div className="space-y-2">
        <h2 className={titolo}>I tuoi dati</h2>
        <p className="text-sm text-muted">Per ora i dati restano su questo telefono. Con gli account arriverà il salvataggio online.</p>
        <button onClick={esporta} className="w-full rounded-2xl bg-ov/10 py-3">Esporta i dati (JSON)</button>
        <button
          onClick={() => confirm("Cancellare tutto e ripartire da zero?") && azzera()}
          className="w-full rounded-2xl bg-red-500/15 py-3 text-red-300"
        >
          Cancella tutti i dati
        </button>
      </div>
    </section>
  );
}
