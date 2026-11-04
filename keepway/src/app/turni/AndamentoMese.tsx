"use client";

import { useMemo } from "react";
import { punteggioMese } from "@/lib/punteggioMese";
import type { Modifica } from "@/lib/tipi";
import GraficoLinea from "../progressi/GraficoLinea";

// Il colore dal valore: verde «normale» sulla linea dello zero (paga base), sempre più acceso salendo; rosso sempre più acceso scendendo.
const mescola = (a: [number, number, number], b: [number, number, number], t: number) => {
  const c = a.map((x, i) => Math.round(x + (b[i] - x) * Math.max(0, Math.min(1, t))));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
};
const VERDE_BASE: [number, number, number] = [58, 140, 96];
const VERDE_ACCESO: [number, number, number] = [34, 255, 110];
const ROSSO_BASE: [number, number, number] = [160, 72, 68];
const ROSSO_ACCESO: [number, number, number] = [255, 31, 47];

export default function AndamentoMese({ modifiche, anno, mese0, oggi }: { modifiche: Modifica[]; anno: number; mese0: number; oggi: string }) {
  const r = useMemo(() => punteggioMese(modifiche, anno, mese0), [modifiche, anno, mese0]);
  // si disegna fino a oggi (mese in corso), tutto il mese se è passato, niente se è futuro
  const visibili = r.giorni.filter((g) => g.data <= oggi);
  const valori = visibili.map((g) => g.cumulato);
  const massimo = Math.max(0, ...valori);
  const minimo = Math.min(0, ...valori);
  const intervallo = massimo - minimo;
  const passo = intervallo <= 120 ? 25 : intervallo <= 300 ? 50 : 100;
  const yMax = Math.max(Math.ceil(massimo / passo) * passo, passo * 2);
  const yMin = Math.min(Math.floor(minimo / passo) * passo, -passo);
  const colore = (v: number) => (v >= 0 ? mescola(VERDE_BASE, VERDE_ACCESO, v / yMax) : mescola(ROSSO_BASE, ROSSO_ACCESO, v / yMin));
  const { dettaglio: d } = r;
  const totale = visibili.length ? visibili[visibili.length - 1].cumulato : 0;
  const segno = totale > 0 ? "+" : "";

  return (
    <GraficoLinea
      titolo="Andamento del mese"
      sotto="punti extra sulla paga base"
      grande={visibili.length ? `${segno}${totale} pt` : undefined}
      grandeEtichetta={visibili.length ? "da inizio mese" : undefined}
      grandeNota={`${d.cambi} cambi · ${d.doppi} doppi · ${d.straordinari} str. · ${d.assenze} ass.`}
      grandeColore={colore(totale)}
      colore="#22c55e"
      colorePerValore={colore}
      punti={r.giorni.map((g) => ({ etichetta: `${Number(g.data.slice(8))}/${Number(g.data.slice(5, 7))}`, v: g.data <= oggi ? g.cumulato : null }))}
      yMin={yMin}
      yMax={yMax}
      passo={passo}
      riferimento={{ v: 0, etichetta: "paga base" }}
    />
  );
}
