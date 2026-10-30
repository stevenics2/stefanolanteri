"use client";

import { AlertTriangle, Apple, Check } from "lucide-react";
import { useState } from "react";
import { apriInCalendarioApple, leggiScelta, salvaScelta } from "@/lib/calendarioApple";
import { dataPiù } from "@/lib/date";
import { dataBreve, PRIORITA } from "@/lib/eventi";
import { nuovoId } from "@/lib/seed";
import { conflittiAgenda, finestreLibere, hhmm } from "@/lib/sonno";
import { useStore } from "@/lib/store";
import type { Evento, Priorita } from "@/lib/tipi";
import AreaIcona from "../components/AreaIcona";
import { aMinuti, campo, Chip, Etichetta, Riquadro, Schermo } from "./ui";

const CATEGORIE = [
  { id: "dottore", nome: "Dottore" },
  { id: "dentista", nome: "Dentista" },
  { id: "psicologa", nome: "Psicologa" },
  { id: "lavoro", nome: "Lavoro" },
  { id: "auto", nome: "Auto" },
  { id: "calendario", nome: "Altro" },
];

// Modulo per appuntamenti e promemoria. Controlla da solo se l'orario va in conflitto con i turni, il sonno o altri appuntamenti.
export default function FormEvento({
  tipo, iniziale, dataIniziale, onClose,
}: { tipo: "appuntamento" | "promemoria"; iniziale?: Evento | null; dataIniziale?: string; onClose: () => void }) {
  const { stato, oggi, salvaEvento, eliminaEvento } = useStore();
  const èApp = tipo === "appuntamento";
  const [icona, setIcona] = useState(iniziale?.icona ?? (èApp ? "dottore" : "promemoria"));
  const [titolo, setTitolo] = useState(iniziale?.titolo ?? "");
  const [data, setData] = useState(iniziale?.data ?? dataIniziale ?? dataPiù(oggi, 1));
  const [ora, setOra] = useState(iniziale?.ora ?? "11:00"); // parte da un orario scritto, così non sembra vuoto
  const [senzaOra, setSenzaOra] = useState(iniziale ? iniziale.ora === null : false); // solo per i promemoria
  const [durata, setDurata] = useState(iniziale?.durataMin ?? 60);
  const [priorita, setPriorita] = useState<Priorita>(iniziale?.priorita ?? "media");
  const [luogo, setLuogo] = useState(iniziale?.luogo ?? "");
  const [avvisi, setAvvisi] = useState<number[]>(iniziale?.avvisi ?? (èApp ? [7] : []));
  const [spostamento, setSpostamento] = useState(iniziale?.spostamentoMin ?? (èApp ? 20 : 0));
  const [suApple, setSuApple] = useState(() => èApp && leggiScelta()); // ricordo l'ultima scelta
  const attivaAvviso = (n: number) => setAvvisi((x) => (x.includes(n) ? x.filter((y) => y !== n) : [...x, n].sort((a, b) => b - a)));

  const scegliCategoria = (id: string, nome: string) => {
    const precedente = CATEGORIE.find((c) => c.id === icona)?.nome;
    setIcona(id);
    if (!titolo.trim() || titolo === precedente) setTitolo(nome);
  };

  // Controlli: turni e sonno, e altri appuntamenti nello stesso orario.
  const inizio = !senzaOra && ora ? aMinuti(ora) : null;
  const fine = inizio === null ? null : inizio + (èApp ? durata : 15);
  const conflitti =
    inizio !== null && fine !== null && data
      ? [
          ...conflittiAgenda(data, inizio, fine, èApp ? spostamento : 0).map((c) => c.testo),
          ...stato.eventi
            .filter((e) => e.id !== iniziale?.id && e.tipo === "appuntamento" && e.data === data && e.ora && !e.fatto)
            .filter((e) => inizio < aMinuti(e.ora!) + e.durataMin && fine > aMinuti(e.ora!))
            .map((e) => `Si sovrappone a «${e.titolo}» (${e.ora})`),
        ]
      : [];
  const liberi = data ? finestreLibere(data, 8 * 60, 22 * 60 + 30, 30) : [];
  const passata = data !== "" && data < oggi;
  const valido = (titolo.trim() !== "" || èApp) && data !== "";

  const salva = () => {
    if (!valido) return;
    const nome = CATEGORIE.find((c) => c.id === icona)?.nome ?? "Appuntamento";
    const evento: Evento = {
      id: iniziale?.id ?? nuovoId(),
      tipo,
      titolo: titolo.trim() || nome,
      icona,
      data,
      ora: senzaOra ? null : ora || null,
      durataMin: durata,
      priorita,
      luogo: luogo.trim(),
      avvisi,
      spostamentoMin: èApp ? spostamento : 0,
      fatto: iniziale?.fatto ?? false,
      creato: iniziale?.creato ?? Date.now(),
    };
    salvaEvento(evento);
    if (èApp) salvaScelta(suApple);
    if (èApp && suApple) apriInCalendarioApple(evento);
    onClose();
  };

  return (
    <Schermo titolo={iniziale ? (èApp ? "Modifica appuntamento" : "Modifica promemoria") : èApp ? "Nuovo appuntamento" : "Nuovo promemoria"} onClose={onClose}>
      {èApp && (
        <div>
          <Etichetta>Che appuntamento è?</Etichetta>
          <div className="grid grid-cols-3 gap-2">
            {CATEGORIE.map((c) => (
              <Riquadro key={c.id} attivo={icona === c.id} nome={c.nome} onClick={() => scegliCategoria(c.id, c.nome)}
                icona={<AreaIcona nome={c.id} colore="currentColor" size={22} badge={false} />} />
            ))}
          </div>
        </div>
      )}

      <label className="block text-sm text-muted">
        {èApp ? "Titolo (se vuoto, il tipo)" : "Cosa devi ricordare"}
        <input value={titolo} onChange={(e) => setTitolo(e.target.value)} placeholder={èApp ? "Es. Controllo dal dentista" : "Es. Pagare la bolletta"} className={campo} />
      </label>

      <div>
        <Etichetta>Quando</Etichetta>
        <div className="mb-2 flex flex-wrap gap-2">
          <Chip attivo={data === oggi} onClick={() => setData(oggi)}>Oggi</Chip>
          <Chip attivo={data === dataPiù(oggi, 1)} onClick={() => setData(dataPiù(oggi, 1))}>Domani</Chip>
          <Chip attivo={data === dataPiù(oggi, 7)} onClick={() => setData(dataPiù(oggi, 7))}>Tra 1 settimana</Chip>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <input type="date" value={data} onChange={(e) => setData(e.target.value)} className={campo} aria-label="Giorno" />
          <input type="time" value={ora} onChange={(e) => setOra(e.target.value)} disabled={senzaOra} className={`${campo} disabled:opacity-40`} aria-label="Ora" />
        </div>
        {!èApp && (
          <div className="mt-2">
            <Chip attivo={senzaOra} onClick={() => setSenzaOra((v) => !v)}>Senza ora (ti avviso alle 9:00)</Chip>
          </div>
        )}
      </div>

      {èApp && (
        <div>
          <Etichetta>Quanto dura</Etichetta>
          <div className="flex flex-wrap gap-2">
            {[30, 60, 90, 120].map((m) => (
              <Chip key={m} attivo={durata === m} onClick={() => setDurata(m)}>{m < 60 ? `${m} min` : m === 60 ? "1 ora" : `${String(m / 60).replace(".", ",")} ore`}</Chip>
            ))}
          </div>
          <div className="mt-3">
            <Etichetta>Spostamento (andata, e altrettanto per il ritorno)</Etichetta>
            <div className="flex flex-wrap gap-2">
              {[0, 10, 20, 30, 45].map((m) => (
                <Chip key={m} attivo={spostamento === m} onClick={() => setSpostamento(m)}>{m === 0 ? "Nessuno" : `${m} min`}</Chip>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Controlli automatici */}
      {passata && (
        <div className="flex items-start gap-2 rounded-2xl border border-amber-500/50 bg-amber-500/15 p-3 text-sm">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-300" /> Questa data è già passata.
        </div>
      )}
      {conflitti.length > 0 && (
        <div className="space-y-1.5 rounded-2xl border border-amber-500/50 bg-amber-500/15 p-3 text-sm">
          {conflitti.map((t) => (
            <div key={t} className="flex items-start gap-2">
              <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-300" /> {t}
            </div>
          ))}
          {liberi.length > 0 && (
            <div className="pt-1 text-muted">
              Liberi il {dataBreve(data)}: {liberi.map((f) => `${hhmm(f.da)}–${hhmm(f.a)}`).join(", ")}
            </div>
          )}
        </div>
      )}
      {conflitti.length === 0 && inizio !== null && data && (
        <div className="flex items-center gap-2 rounded-2xl bg-emerald-500/10 p-3 text-sm text-emerald-300">
          <Check size={18} /> Nessun conflitto con turni, sonno e altri appuntamenti.
        </div>
      )}
      {inizio === null && liberi.length > 0 && data && !passata && (
        <p className="text-sm text-muted">Momenti liberi il {dataBreve(data)}: {liberi.map((f) => `${hhmm(f.da)}–${hhmm(f.a)}`).join(", ")}</p>
      )}

      <div>
        <Etichetta>Priorità</Etichetta>
        <div className="grid grid-cols-3 gap-2">
          {PRIORITA.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPriorita(p.id)}
              className={`rounded-2xl border py-3 text-sm font-bold ${priorita === p.id ? "" : "border-transparent bg-white/10 text-muted"}`}
              style={priorita === p.id ? { borderColor: p.colore, background: `${p.colore}26`, color: p.colore } : undefined}
            >
              {p.nome}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Etichetta>Avvisami prima (puoi sceglierne più di uno)</Etichetta>
        <div className="flex flex-wrap gap-2">
          <Chip attivo={avvisi.length === 0} onClick={() => setAvvisi([])}>Nessuno</Chip>
          {[{ v: 1, n: "1 giorno" }, { v: 3, n: "3 giorni" }, { v: 7, n: "1 settimana" }, { v: 14, n: "2 settimane" }].map((a) => (
            <Chip key={a.v} attivo={avvisi.includes(a.v)} onClick={() => attivaAvviso(a.v)}>{a.n}</Chip>
          ))}
        </div>
        <p className="mt-1 text-xs text-muted">Compaiono in «In arrivo» in Oggi e ti arriva una notifica per ognuno. La sera prima e poche ore prima ti avviso sempre.</p>
      </div>

      {èApp && (
        <label className="block text-sm text-muted">
          Dove (facoltativo)
          <input value={luogo} onChange={(e) => setLuogo(e.target.value)} placeholder="Es. Via Roma 12" className={campo} />
        </label>
      )}

      {èApp && (
        <button
          type="button"
          onClick={() => setSuApple((v) => !v)}
          aria-pressed={suApple}
          className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm ${suApple ? "bg-white text-black" : "bg-white/10"}`}
        >
          <Apple size={22} fill="currentColor" />
          <span className="flex-1">
            <span className="block font-semibold">Salva anche su Calendario Apple</span>
            <span className={`block text-xs ${suApple ? "text-black/60" : "text-muted"}`}>
              Dopo «Salva» si apre la conferma di iPhone: con un tocco finisce nel Calendario, con gli avvisi.
            </span>
          </span>
          <span className={`flex h-6 w-6 items-center justify-center rounded-full border ${suApple ? "border-black bg-black text-white" : "border-white/30"}`}>
            {suApple && <Check size={14} />}
          </span>
        </button>
      )}

      <button data-suono="via" onClick={salva} disabled={!valido} className="w-full rounded-2xl bg-accent py-3.5 text-lg font-bold text-black disabled:opacity-40">
        {conflitti.length > 0 ? "Salva comunque" : "Salva"}
      </button>
      {iniziale && (
        <button
          data-suono="indietro"
          onClick={() => confirm("Eliminare?") && (eliminaEvento(iniziale.id), onClose())}
          className="w-full rounded-2xl bg-red-500/15 py-3 text-red-300"
        >
          Elimina
        </button>
      )}
    </Schermo>
  );
}
