"use client";

import { ArrowLeftRight, CalendarOff, ChevronLeft, PlusCircle, Undo2 } from "lucide-react";
import { useState } from "react";
import { CODICI_TURNO, etichettaBase, etichettaCodici, giornoEffettivo } from "@/lib/calendario";
import { dataLunga, dataPiù } from "@/lib/date";
import { adessoMs, nuovoId } from "@/lib/seed";
import { useStore } from "@/lib/store";
import type { Assenza, Modifica } from "@/lib/tipi";
import { Chip, campo, Etichetta, Interruttore, Schermo } from "../task/ui";
import { Banda } from "./banda";

type Vista = "menu" | "cambio" | "straordinario" | "assenza";

const ASSENZE: { id: Assenza; nome: string }[] = [
  { id: "ferie", nome: "Ferie" },
  { id: "malattia", nome: "Malattia" },
  { id: "permesso", nome: "Permesso" },
  { id: "altro", nome: "Altro" },
];

const unisci = (c: string[]) => [...c].sort();

// Il menu che si apre toccando un giorno: cambio turno, straordinario, assenza. Tutto si può annullare.
export default function MenuTurno({ data, onClose }: { data: string; onClose: () => void }) {
  const { salvaModifiche, annullaModifiche } = useStore();
  const ge = giornoEffettivo(data);
  const [vista, setVista] = useState<Vista>("menu");

  // cambio turno
  const [pagato, setPagato] = useState(true);
  const [nuovi, setNuovi] = useState<string[]>([]);
  const [riposo, setRiposo] = useState(false);
  const [sposta, setSposta] = useState(false);
  const [altroGiorno, setAltroGiorno] = useState(dataPiù(data, 1));
  // straordinario
  const [extra, setExtra] = useState<string[]>([]);
  // assenza
  const [assenza, setAssenza] = useState<Assenza>("ferie");

  if (!ge) {
    return (
      <Schermo titolo="Turni" onClose={onClose}>
        <p className="text-muted">Per questo giorno non ho i turni importati, quindi non posso modificarlo.</p>
      </Schermo>
    );
  }

  const base = etichettaBase(data);
  const attivaCodice = (lista: string[], setLista: (l: string[]) => void, c: string) =>
    setLista(lista.includes(c) ? lista.filter((x) => x !== c) : [...lista, c]);
  const fine = (testo: string) => {
    onClose();
    return testo;
  };

  const salvaCambio = () => {
    const tipo = pagato ? "cambio_azienda" : "cambio_personale";
    const spostato = ge.baseCodici; // i turni di questo giorno
    const gruppo = nuovoId(); // collega le due modifiche: si annullano e si contano insieme
    if (sposta) {
      const altro = giornoEffettivo(altroGiorno);
      if (!altro) return;
      const mods: Modifica[] = [
        { id: nuovoId(), data, tipo, codici: [], ex: base, mostraEx: true, gruppo, creato: adessoMs() },
        { id: nuovoId(), data: altroGiorno, tipo, codici: unisci([...new Set([...altro.codici, ...spostato])]), ex: etichettaCodici(altro.codici), mostraEx: false, gruppo, creato: adessoMs() },
      ];
      salvaModifiche(mods, fine(`Turno ${base} spostato al ${altroGiorno.split("-").reverse().join("/")}.`));
      return;
    }
    const codici = riposo ? [] : unisci(nuovi);
    salvaModifiche(
      [{ id: nuovoId(), data, tipo, codici, ex: base, mostraEx: true, creato: adessoMs() }],
      fine(`Cambio turno salvato: ${etichettaCodici(codici)} (ex ${base}).`),
    );
  };

  const salvaStraordinario = () => {
    const codici = unisci([...new Set([...ge.codici, ...extra])]);
    salvaModifiche(
      [{ id: nuovoId(), data, tipo: "straordinario", codici, ex: base, mostraEx: false, extra: unisci(extra), creato: adessoMs() }],
      fine(`Straordinario salvato: ${etichettaCodici(codici)}.`),
    );
  };

  const salvaAssenza = () => {
    salvaModifiche(
      [{ id: nuovoId(), data, tipo: "assenza", codici: [], ex: base, mostraEx: true, assenza, creato: adessoMs() }],
      fine(`${ASSENZE.find((a) => a.id === assenza)?.nome} registrata.`),
    );
  };

  const anteprimaCambio = sposta
    ? `${etichettaBase(data)} → R - (ex ${base}); ${altroGiorno.split("-").reverse().join("/")} riceve il turno ${base}`
    : riposo
      ? `Diventa: R - (ex ${base})`
      : nuovi.length
        ? `Diventa: ${etichettaCodici(unisci(nuovi))} - (ex ${base})`
        : "Scegli il nuovo turno";
  const cambioValido = sposta ? !ge.riposo : riposo || nuovi.length > 0;
  const disponibiliExtra = CODICI_TURNO.filter((c) => !ge.codici.includes(c));

  return (
    <Schermo titolo={dataLunga(data).replace(/^./, (c) => c.toUpperCase())} onClose={onClose}>
      {/* Il turno com'è ora */}
      <div className="overflow-hidden rounded-2xl bg-card">
        <div className="p-4">
          <div className="text-sm text-muted">Turno di questo giorno</div>
          <div className="text-2xl font-extrabold">{ge.etichetta}</div>
          {ge.orario && <div className="text-muted">{ge.orario}</div>}
        </div>
        <Banda m={ge.modifica} />
      </div>

      {vista === "menu" && (
        <>
          {ge.modifica && (
            <button
              data-suono="indietro"
              onClick={() => {
                annullaModifiche([ge.modifica!.id]);
                onClose();
              }}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-red-500/15 py-3 font-semibold text-red-300"
            >
              <Undo2 size={18} /> Annulla la modifica
            </button>
          )}
          <div className="grid gap-3">
            {[
              { v: "cambio" as const, nome: "Cambio turno", sotto: "richiesto dall'azienda o personale", Icona: ArrowLeftRight, classe: "bg-emerald-500/20 text-emerald-200" },
              { v: "straordinario" as const, nome: "Straordinario", sotto: "un turno in più, es. 2+3", Icona: PlusCircle, classe: "bg-violet-500/20 text-violet-200" },
              { v: "assenza" as const, nome: "Assenza", sotto: "ferie, malattia, permesso…", Icona: CalendarOff, classe: "bg-amber-500/20 text-amber-200" },
            ].map(({ v, nome, sotto, Icona, classe }) => (
              <button key={v} data-suono="via" onClick={() => setVista(v)} className={`flex items-center gap-4 rounded-2xl p-4 text-left ${classe}`}>
                <Icona size={28} strokeWidth={1.8} />
                <span>
                  <span className="block text-lg font-bold">{nome}</span>
                  <span className="block text-xs opacity-80">{sotto}</span>
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {vista !== "menu" && (
        <button data-suono="indietro" onClick={() => setVista("menu")} className="inline-flex items-center gap-1 text-sm text-muted">
          <ChevronLeft size={16} /> Indietro
        </button>
      )}

      {vista === "cambio" && (
        <div className="space-y-4">
          <div>
            <Etichetta>Che cambio è?</Etichetta>
            <div className="flex flex-wrap gap-2">
              <Chip attivo={pagato} onClick={() => setPagato(true)}>Richiesto dall&apos;azienda</Chip>
              <Chip attivo={!pagato} onClick={() => setPagato(false)}>Personale</Chip>
            </div>
          </div>

          <Interruttore valore={sposta} onChange={setSposta}>Salto questo turno e lo faccio un altro giorno</Interruttore>

          {sposta ? (
            <label className="block text-sm text-muted">
              Quale giorno?
              <input type="date" value={altroGiorno} onChange={(e) => setAltroGiorno(e.target.value)} className={campo} />
            </label>
          ) : (
            <div>
              <Etichetta>Nuovo turno (puoi sceglierne più di uno, es. 2 e 3)</Etichetta>
              <div className="flex flex-wrap gap-2">
                <Chip attivo={riposo} onClick={() => { setRiposo(!riposo); setNuovi([]); }}>Riposo</Chip>
                {CODICI_TURNO.map((c) => (
                  <Chip key={c} attivo={nuovi.includes(c)} onClick={() => { setRiposo(false); attivaCodice(nuovi, setNuovi, c); }}>{c}</Chip>
                ))}
              </div>
            </div>
          )}

          <p className="text-sm text-muted">{anteprimaCambio}</p>
          <button data-suono="via" disabled={!cambioValido} onClick={salvaCambio} className="w-full rounded-2xl bg-accent py-3.5 text-lg font-bold text-black disabled:opacity-40">
            Salva cambio turno
          </button>
        </div>
      )}

      {vista === "straordinario" && (
        <div className="space-y-4">
          <div>
            <Etichetta>Quale turno ti chiedono in più?</Etichetta>
            <div className="flex flex-wrap gap-2">
              {disponibiliExtra.map((c) => (
                <Chip key={c} attivo={extra.includes(c)} onClick={() => attivaCodice(extra, setExtra, c)}>{c}</Chip>
              ))}
            </div>
          </div>
          <p className="text-sm text-muted">
            {extra.length ? `Diventa: ${etichettaCodici(unisci([...ge.codici, ...extra]))} · ${extra.length * 6} ore di straordinario` : "Scegli il turno da aggiungere"}
          </p>
          <button data-suono="via" disabled={extra.length === 0} onClick={salvaStraordinario} className="w-full rounded-2xl bg-accent py-3.5 text-lg font-bold text-black disabled:opacity-40">
            Salva straordinario
          </button>
        </div>
      )}

      {vista === "assenza" && (
        <div className="space-y-4">
          <div>
            <Etichetta>Che assenza?</Etichetta>
            <div className="flex flex-wrap gap-2">
              {ASSENZE.map((a) => <Chip key={a.id} attivo={assenza === a.id} onClick={() => setAssenza(a.id)}>{a.nome}</Chip>)}
            </div>
          </div>
          <button data-suono="via" onClick={salvaAssenza} className="w-full rounded-2xl bg-accent py-3.5 text-lg font-bold text-black">
            Salva assenza
          </button>
        </div>
      )}
    </Schermo>
  );
}
