"use client";

import { RefreshCw } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { segnaPresenza } from "@/lib/presenza";
import { linkSincronizza, ultimoDatoRicevuto } from "@/lib/salute";
import { ORA_CONTROLLO_SALUTE } from "@/lib/piano";
import { useStore } from "@/lib/store";
import { useDatiSalute } from "@/lib/useSalute";
import Presenza from "./Presenza";

const CHIAVE = "keepway.salute.avviso";
const giornoLocale = (ms: number) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const lettoChiuso = () => {
  try {
    return localStorage.getItem(CHIAVE);
  } catch {
    return null;
  }
};

// La sera, dopo le 22:30, se oggi non è arrivato niente dall'iPhone (e almeno una volta era arrivato qualcosa), un popup propone di sincronizzare.
// «Sincronizza» fa partire il Comando Rapido. Si può chiudere: per oggi non ricompare. (Il mattino ora c'è il benvenuto.)
export default function AvvisoSalute() {
  const { pronto, oggi, adesso } = useStore();
  const dati = useDatiSalute(3);
  const percorso = usePathname();
  const [chiusoOggi, setChiusoOggi] = useState<string | null>(lettoChiuso);
  const [daNotifica] = useState(() => typeof location !== "undefined" && location.search.includes("sincronizza"));

  useEffect(() => {
    segnaPresenza();
    const battito = setInterval(() => document.visibilityState === "visible" && segnaPresenza(), 60_000);
    const cambio = () => {
      if (document.visibilityState === "hidden") return segnaPresenza();
      segnaPresenza();
    };
    document.addEventListener("visibilitychange", cambio);
    return () => {
      clearInterval(battito);
      document.removeEventListener("visibilitychange", cambio);
    };
  }, []);

  const [h, m] = ORA_CONTROLLO_SALUTE.split(":").map(Number);
  const d = new Date(adesso);
  const passata = d.getHours() * 60 + d.getMinutes() >= h * 60 + m;
  const ultimo = dati?.ultimo ?? ultimoDatoRicevuto();
  const mancano = !!oggi && ultimo !== null && giornoLocale(ultimo) !== oggi;
  const sera = pronto && mancano && (passata || daNotifica) && chiusoOggi !== oggi && percorso.startsWith("/oggi");
  const modo: "sera" | null = sera ? "sera" : null; // il popup del mattino non c'è più: lo sostituisce il benvenuto

  const chiudi = () => {
    try {
      localStorage.setItem(CHIAVE, oggi);
    } catch {
      // pazienza
    }
    setChiusoOggi(oggi);
  };

  return (
    <Presenza dato={modo} ms={300}>
      {(_m, uscendo) => (
        <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6 ${uscendo ? "dissolve" : "entra"}`} role="dialog" aria-label="Nessuna attività ricevuta oggi">
          <div className="w-full max-w-xs rounded-3xl bg-card p-5 text-center shadow-2xl ring-1 ring-ov/10">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent/15 text-accent">
              <RefreshCw size={22} />
            </div>
            <h2 className="text-lg font-bold">Nessuna attività ricevuta oggi</h2>
            <p className="mt-1 text-sm text-muted">Sincronizza per portare qui sonno, passi e allenamenti di oggi.</p>
            <a href={linkSincronizza()} onClick={chiudi} data-suono="nessuno" className="mt-4 block rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white">
              Sincronizza
            </a>
            <button onClick={chiudi} className="mt-2 w-full rounded-2xl px-4 py-2 text-sm text-muted">
              Non ora
            </button>
          </div>
        </div>
      )}
    </Presenza>
  );
}
