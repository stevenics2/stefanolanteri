"use client";

import { CalendarCheck } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { dateConCalendario, giornoEffettivo, notaGiorno, violazioniDa, type GiornoEffettivo } from "@/lib/calendario";
import { GIORNI_BREVI, MESI_BREVI } from "@/lib/date";
import { useStore } from "@/lib/store";
import TurniDaSistemare from "../components/TurniDaSistemare";
import { Banda } from "./banda";
import CalendarioMese from "./CalendarioMese";
import MenuTurno from "./MenuTurno";
import RecapVista from "./RecapVista";

type Filtro = "tutti" | "lavoro" | "riposi";

export default function TurniLista() {
  const { pronto, stato, oggi } = useStore();
  const [filtro, setFiltro] = useState<Filtro>("tutti");
  const [vista, setVista] = useState<"lista" | "mese" | "recap">("lista");
  const [aperto, setAperto] = useState<string | null>(null);
  const rigaOggi = useRef<HTMLLIElement | null>(null);

  // I giorni con le modifiche già applicate (si ricalcolano quando cambiano).
  const visibili = useMemo(
    () =>
      dateConCalendario
        .map((d) => giornoEffettivo(d))
        .filter((g): g is GiornoEffettivo => !!g)
        .filter((g) => (filtro === "tutti" ? true : filtro === "riposi" ? g.riposo : !g.riposo)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filtro, stato.modifiche],
  );

  // Ogni volta che si entra in una scheda si riparte dal giorno di oggi: nel Roster si scorre fino alla riga di oggi,
  // nel Calendario e nel Recap si torna in cima (il mese mostrato è quello corrente, con oggi selezionato).
  useEffect(() => {
    if (!pronto || !oggi) return;
    if (vista === "lista") rigaOggi.current?.scrollIntoView({ block: "center" });
    else window.scrollTo({ top: 0 });
  }, [pronto, oggi, vista, filtro]);

  // Giorni con meno di 12 ore di riposo (o un doppio non consentito): si segnano in rosso.
  const problemi = new Map<string, string>();
  if (pronto) for (const v of violazioniDa(oggi)) for (const d of new Set([v.primo.data, v.secondo.data])) if (!problemi.has(d)) problemi.set(d, notaGiorno(v, d));

  const vaiAOggi = () => rigaOggi.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  if (!pronto) return null;

  return (
    <section className="-mx-4 -mt-[var(--pt-pagina)]">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-background px-4 pb-3 pt-[calc(env(safe-area-inset-top)+1.5rem)]">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Turni</h1>
          {vista === "lista" && (
            <button onClick={vaiAOggi} className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1.5 text-sm font-medium text-accent">
              <CalendarCheck size={16} /> Oggi
            </button>
          )}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-1 rounded-xl bg-white/10 p-1 text-sm font-medium">
          {([["lista", "Roster"], ["mese", "Calendario"], ["recap", "Recap"]] as const).map(([v, nome]) => (
            <button key={v} onClick={() => setVista(v)} className={`rounded-lg py-1.5 ${vista === v ? "bg-accent text-black" : "text-muted"}`}>
              {nome}
            </button>
          ))}
        </div>
        {vista === "lista" && (
          <div className="mt-3 flex gap-2 text-sm">
            {(["tutti", "lavoro", "riposi"] as Filtro[]).map((f) => (
              <button key={f} onClick={() => setFiltro(f)} className={`rounded-full px-3 py-1 capitalize ${filtro === f ? "bg-white/15 text-foreground" : "text-muted"}`}>
                {f}
              </button>
            ))}
          </div>
        )}
      </header>

      <TurniDaSistemare className="mx-4 mt-4" />

      {vista === "mese" ? (
        <CalendarioMese />
      ) : vista === "recap" ? (
        <RecapVista />
      ) : (
        <>
          <ul>
            {visibili.map((g) => {
              const [a, m, gg] = g.data.split("-").map(Number);
              const data = new Date(a, m - 1, gg);
              const èOggi = g.data === oggi;
              return (
                <li key={g.data} ref={èOggi ? rigaOggi : undefined} className="border-b border-white/10">
                  <button onClick={() => setAperto(g.data)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
                    <div className={`w-16 shrink-0 rounded-xl py-1.5 text-center leading-tight ${èOggi ? "bg-accent text-black" : "text-sky-300"}`}>
                      <div className="text-sm">{GIORNI_BREVI[data.getDay()]}</div>
                      <div className="text-3xl font-light">{gg}</div>
                      <div className="text-sm">{MESI_BREVI[m - 1]}</div>
                    </div>
                    <Blocco g={g} avviso={problemi.get(g.data)} />
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {aperto && <MenuTurno key={aperto} data={aperto} onClose={() => setAperto(null)} />}
    </section>
  );
}

// Il blocco colorato: blu = turno, viola = notte + sera, verde = riposo, ambra = assenza. Sotto, la striscia della modifica.
function Blocco({ g, avviso }: { g: GiornoEffettivo; avviso?: string }) {
  const assenza = g.modifica?.tipo === "assenza";
  let classe: string;
  if (assenza) classe = "border border-amber-500/60 bg-amber-500/15 text-amber-100";
  else if (g.riposo) classe = "border border-emerald-500/60 bg-emerald-500/15 text-emerald-100";
  else if (g.codici.includes("1") && g.codici.includes("4")) classe = "bg-violet-700 text-white";
  else classe = "bg-blue-700 text-white";

  // Con uno straordinario gli orari dei turni stanno uno sotto l'altro, nell'ordine del tempo (07:00–13:00, 13:00–19:00); sotto la striscia viola
  const orari = g.straordinario?.orari ?? (g.orario ? [g.orario] : []);
  return (
    <div className="flex-1 overflow-hidden rounded-xl">
      <div className={`px-3 py-3 text-center ${classe}`}>
        <div className="font-bold">{g.etichetta}</div>
        {orari.map((o) => <div key={o} className="text-sm opacity-90">{o}</div>)}
        {!g.riposo && g.unita && <div className="mt-0.5 text-xs opacity-75">{g.unita}</div>}
      </div>
      <Banda m={g.modifica} />
      {avviso && (
        <div className="bg-red-600 px-3 py-1.5 text-center text-white">
          <div className="text-[11px] font-extrabold uppercase tracking-wide">⚠ Attenzione: Conflitto turni</div>
          <div className="text-[11px] opacity-90">{avviso}</div>
        </div>
      )}
    </div>
  );
}
