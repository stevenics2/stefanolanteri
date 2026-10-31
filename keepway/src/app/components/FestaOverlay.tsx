"use client";

import { Gift, PackageOpen, Swords, Trophy, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { coriandoli, monete, suono } from "@/lib/effetti";
import { useStore } from "@/lib/store";
import Presenza from "./Presenza";

export const EVENTO_FIAMMATA = "keepway-fiammata";
export const EVENTO_COMBO = "keepway-combo"; // la combo compare nel riquadro di avanzamento
const DURATA_COMBO_BOX_MS = 2400;
const ANTICIPO_FLASH_MS = 300; // il flash oro (picco dopo ~0,2 s) coincide con la chiusura del popup
const ATTESA_ANELLI_MS = 1500; // il tempo dell'animazione degli anelli, che parte per prima
const ICONE = { forziere: Gift, record: Trophy, boss: Swords, combo: Zap } as const;
const COLORI = { forziere: "#fcd34d", record: "#fcd34d", boss: "#fca5a5", combo: "#7dd3fc" } as const;

// I momenti "da festa": combo, record, forziere, boss. Un popup al centro, uno alla volta; si chiude da solo o con un tocco.
export default function FestaOverlay() {
  const { festa, chiudiFesta, stato } = useStore();
  const f = festa[0];
  const [apertoId, setApertoId] = useState<string | null>(null);
  const [visibileId, setVisibileId] = useState<string | null>(null);
  const [nelBoxId, setNelBoxId] = useState<string | null>(null); // la combo si mostra dentro il riquadro di avanzamento, se c'è
  const { suoni, animazioni } = stato.impostazioni;

  // Le cose che cambiano a ogni aggiornamento dello stato stanno in un ref: così l'effetto parte UNA volta per festa
  // (altrimenti si rilanciava e la fanfara suonava due volte, con il popup che durava il doppio).
  const ultimo = useRef({ f, chiudiFesta, suoni, animazioni });
  useEffect(() => {
    ultimo.current = { f, chiudiFesta, suoni, animazioni };
  });

  const id = f?.id;
  const tipo = f?.tipo;
  useEffect(() => {
    if (!id || !tipo) return;
    // prima gli anelli (tremito e scintille), poi il popup; il forziere prima trema (chiuso), poi si apre
    const nelBox = tipo === "combo" && !!document.querySelector("[data-box-avanzamento]");
    const attesa = tipo === "forziere" ? 900 : 150;
    const durata = nelBox ? DURATA_COMBO_BOX_MS : attesa + 3600;
    const t0 = setTimeout(() => {
      const { f: festa } = ultimo.current;
      if (nelBox && festa) {
        setNelBoxId(id);
        window.dispatchEvent(new CustomEvent(EVENTO_COMBO, { detail: { id, titolo: festa.titolo, testo: festa.testo, durata: DURATA_COMBO_BOX_MS } }));
      }
      setVisibileId(id);
    }, ATTESA_ANELLI_MS);
    const t1 = setTimeout(() => {
      const { suoni: s, animazioni: anim } = ultimo.current;
      setApertoId(id);
      if (s) suono(tipo === "combo" || tipo === "boss" ? "vittoria" : "livello");
      if (anim) void (tipo === "forziere" ? monete() : tipo === "combo" ? Promise.resolve() : coriandoli(true));
    }, ATTESA_ANELLI_MS + (nelBox ? 0 : attesa));
    // il flash oro su tutto il riquadro parte un attimo prima della chiusura: il picco cade proprio mentre il popup sparisce
    const tFlash = setTimeout(() => {
      if (tipo === "combo" && ultimo.current.animazioni) window.dispatchEvent(new Event(EVENTO_FIAMMATA));
    }, ATTESA_ANELLI_MS + durata - ANTICIPO_FLASH_MS);
    const t2 = setTimeout(() => ultimo.current.chiudiFesta(), ATTESA_ANELLI_MS + durata);
    return () => {
      clearTimeout(t0);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(tFlash);
    };
  }, [id, tipo]);

  const daMostrare = f && visibileId === f.id && nelBoxId !== f.id ? f : null;
  return (
    <Presenza dato={daMostrare} ms={300}>
      {(fe, uscendo) => {
        const aperto = apertoId === fe.id;
        const Icona = fe.tipo === "forziere" && aperto ? PackageOpen : ICONE[fe.tipo];
        const colore = COLORI[fe.tipo];
        return (
          <div onClick={chiudiFesta} className={`fixed inset-0 z-[60] flex items-center justify-center bg-black/65 px-6 backdrop-blur-sm ${uscendo ? "vela-fuori" : "vela-dentro"}`}>
            <div className={`w-full max-w-xs rounded-3xl border bg-card p-6 text-center ${uscendo ? "carta-fuori" : "carta-dentro"}`} style={{ borderColor: colore, boxShadow: `0 0 60px -8px ${colore}` }}>
              <Icona key={`${fe.id}-${aperto}`} size={64} strokeWidth={1.6} className={`mx-auto ${fe.tipo === "forziere" && !aperto ? "scuoti" : "icona-pop"}`} style={{ color: colore }} />
              <div key={aperto ? "aperto" : "chiuso"} className="dissolve mt-3 text-2xl font-black tracking-wide" style={{ color: colore }}>
                {fe.tipo === "forziere" && !aperto ? "COMPLETATO!" : fe.titolo}
              </div>
              {(fe.tipo !== "forziere" || aperto) && (
                <>
                  <p className="entra mt-2 text-sm" style={{ animationDelay: "0.08s" }}>{fe.testo}</p>
                  {fe.xp > 0 && <div className="xp-pop mt-3 text-4xl font-black text-accent" style={{ animationDelay: "0.16s" }}>+{fe.xp} XP</div>}
                </>
              )}
            </div>
          </div>
        );
      }}
    </Presenza>
  );
}
