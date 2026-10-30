"use client";

import { CalendarCheck, Clock } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import roster from "@/data/roster.json";
import CalendarioMese from "./CalendarioMese";

// Un giorno del calendario: d = data (AAAA-MM-GG), t = codice turno, o = orario, u = unità operativa.
type Giorno = { d: string; t: string; o: string; u: string };
type Filtro = "tutti" | "lavoro" | "riposi";

const giorni = roster as Giorno[];
const GIORNI_SETT = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"];
const MESI = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];
const CODICI_RIPOSO = ["RD", "R"];

const èRiposo = (g: Giorno) => CODICI_RIPOSO.includes(g.t);
const èDoppio = (g: Giorno) => g.t.includes("+");

// Data locale di oggi come "AAAA-MM-GG" (non usare toISOString: sposterebbe il giorno per via del fuso).
function oggiLocale(): string {
  const n = new Date();
  const p = (x: number) => String(x).padStart(2, "0");
  return `${n.getFullYear()}-${p(n.getMonth() + 1)}-${p(n.getDate())}`;
}

export default function TurniLista() {
  const [filtro, setFiltro] = useState<Filtro>("tutti");
  const [vista, setVista] = useState<"lista" | "mese">("lista");
  const [oggi, setOggi] = useState<string | null>(null);
  const [ora, setOra] = useState("");
  const rigaOggi = useRef<HTMLLIElement | null>(null);

  // "oggi" e l'ora si calcolano solo nel browser (sul server il fuso orario sarebbe diverso).
  useEffect(() => {
    const aggiorna = () => {
      setOggi(oggiLocale());
      const n = new Date();
      setOra(`${String(n.getHours()).padStart(2, "0")}:${String(n.getMinutes()).padStart(2, "0")}`);
    };
    aggiorna();
    const id = setInterval(aggiorna, 30_000);
    return () => clearInterval(id);
  }, []);

  const visibili = useMemo(
    () =>
      giorni.filter((g) =>
        filtro === "tutti" ? true : filtro === "riposi" ? èRiposo(g) : !èRiposo(g),
      ),
    [filtro],
  );

  // All'apertura scorre fino a oggi, come nel visualizzatore originale.
  const giàScorso = useRef(false);
  useEffect(() => {
    if (oggi && !giàScorso.current && rigaOggi.current) {
      rigaOggi.current.scrollIntoView({ block: "center" });
      giàScorso.current = true;
    }
  }, [oggi, visibili]);

  const vaiAOggi = () => rigaOggi.current?.scrollIntoView({ block: "center", behavior: "smooth" });

  return (
    <section className="-mx-4 -mt-[var(--pt-pagina)]">
      <header className="sticky top-0 z-10 bg-background px-4 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-3 border-b border-white/10">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Turni</h1>
          {vista === "lista" && (
            <button
              onClick={vaiAOggi}
              className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 text-accent px-3 py-1.5 text-sm font-medium"
            >
              <CalendarCheck size={16} /> Oggi
            </button>
          )}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-1 rounded-xl bg-white/10 p-1 text-sm font-medium">
          {(["lista", "mese"] as const).map((v) => (
            <button key={v} onClick={() => setVista(v)} className={`rounded-lg py-1.5 capitalize ${vista === v ? "bg-accent text-black" : "text-muted"}`}>
              {v === "lista" ? "Lista" : "Calendario"}
            </button>
          ))}
        </div>
        {vista === "lista" && (
        <div className="mt-3 flex gap-2 text-sm">
          {(["tutti", "lavoro", "riposi"] as Filtro[]).map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`rounded-full px-3 py-1 capitalize ${
                filtro === f ? "bg-white/15 text-foreground" : "text-muted"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        )}
      </header>

      {vista === "mese" ? (
        <CalendarioMese />
      ) : (
      <ul>
        {visibili.map((g) => {
          const [a, m, gg] = g.d.split("-").map(Number);
          const data = new Date(a, m - 1, gg);
          const èOggi = g.d === oggi;
          return (
            <li
              key={g.d}
              ref={èOggi ? rigaOggi : undefined}
              className="flex items-center gap-3 border-b border-white/10 px-4 py-3"
            >
              <div
                className={`w-16 shrink-0 rounded-xl py-1.5 text-center leading-tight ${
                  èOggi ? "bg-accent text-black" : "text-sky-300"
                }`}
              >
                <div className="text-sm">{GIORNI_SETT[data.getDay()]}</div>
                <div className="text-3xl font-light">{gg}</div>
                <div className="text-sm">{MESI[m - 1]}</div>
              </div>

              <Blocco g={g} />

              {èOggi && (
                <div className="shrink-0 text-center text-xs text-emerald-400">
                  <Clock size={22} className="mx-auto mb-0.5" />
                  {ora}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      )}
    </section>
  );
}

// Il blocco colorato: blu = turno, viola = doppio turno, verde = riposo.
function Blocco({ g }: { g: Giorno }) {
  if (èRiposo(g)) {
    return (
      <div className="flex-1 rounded-xl border border-emerald-500/60 bg-emerald-500/15 py-5 text-center font-bold text-emerald-200">
        {g.t}
      </div>
    );
  }
  const colore = èDoppio(g) ? "bg-violet-700" : "bg-blue-700";
  return (
    <div className={`flex-1 rounded-xl px-3 py-3 text-center text-white ${colore}`}>
      <div className="font-semibold">
        {g.t} <span className="font-normal">({g.o})</span>
      </div>
      {g.u && <div className="mt-0.5 text-sm text-white/80">{g.u}</div>}
    </div>
  );
}
