// L'«andamento del mese» dei turni: i punti extra rispetto alla paga base (0), giorno dopo giorno e sommati.
//  - turno lineare: 0
//  - cambio turno pagato dall'azienda: +25 (un turno spostato da un giorno a un altro è un cambio solo; se cambi il giorno prima per fare il doppio il giorno dopo, vale anche il doppio)
//  - doppio turno consecutivo (2+3, 3+4): +25, qualunque ne sia l'origine (nel calendario di base non ci sono mai)
//  - 1+4 (non consecutivo): +25 solo se nato da uno straordinario o da un cambio pagato; quello del calendario di base non è pagato
//  - straordinario: +75 per ogni turno aggiunto (+25 se ne nasce un doppio)
//  - assenza: −15 per ogni giorno
import type { Modifica } from "./tipi";

export const PUNTI = { cambio: 25, doppio: 25, straordinario: 75, assenza: -15 } as const;

export type GiornoPunti = { data: string; punti: number; cumulato: number; voci: string[] };
export type PunteggioMese = { giorni: GiornoPunti[]; totale: number; dettaglio: { cambi: number; doppi: number; straordinari: number; assenze: number } };

const consecutivo = (codici: string[]) => {
  const c = [...codici].sort().join("+");
  return c === "2+3" || c === "3+4";
};
const unoEQuattro = (codici: string[]) => [...codici].sort().join("+") === "1+4";

export function punteggioMese(lista: Modifica[], anno: number, mese0: number): PunteggioMese {
  const prefisso = `${anno}-${String(mese0 + 1).padStart(2, "0")}`;
  const del = lista.filter((m) => m.data.startsWith(prefisso));
  const perData = new Map<string, { punti: number; voci: string[] }>();
  const aggiungi = (data: string, punti: number, voce: string) => {
    const x = perData.get(data) ?? { punti: 0, voci: [] };
    x.punti += punti;
    x.voci.push(voce);
    perData.set(data, x);
  };
  const dettaglio = { cambi: 0, doppi: 0, straordinari: 0, assenze: 0 };

  // il cambio pagato vale una volta per gruppo, nell'ultimo giorno del gruppo (quando il cambio si compie)
  const gruppiCambio = new Map<string, string>();
  for (const m of del) if (m.tipo === "cambio_azienda") {
    const k = m.gruppo ?? m.id;
    if (!gruppiCambio.has(k) || m.data > gruppiCambio.get(k)!) gruppiCambio.set(k, m.data);
  }
  for (const data of gruppiCambio.values()) {
    aggiungi(data, PUNTI.cambio, "cambio turno");
    dettaglio.cambi++;
  }

  for (const m of del) {
    if (m.tipo === "assenza") {
      aggiungi(m.data, PUNTI.assenza, "assenza");
      dettaglio.assenze++;
      continue;
    }
    if (m.tipo === "straordinario" && m.extra?.length) {
      aggiungi(m.data, PUNTI.straordinario * m.extra.length, m.extra.length > 1 ? `${m.extra.length} straordinari` : "straordinario");
      dettaglio.straordinari += m.extra.length;
    }
    const pagato = m.tipo === "straordinario" || m.tipo === "cambio_azienda";
    if (consecutivo(m.codici) || (pagato && unoEQuattro(m.codici))) {
      aggiungi(m.data, PUNTI.doppio, "doppio turno");
      dettaglio.doppi++;
    }
  }

  // il mese giorno per giorno, con il totale che cresce
  const giorniNelMese = new Date(anno, mese0 + 1, 0).getDate();
  const giorni: GiornoPunti[] = [];
  let somma = 0;
  for (let g = 1; g <= giorniNelMese; g++) {
    const data = `${prefisso}-${String(g).padStart(2, "0")}`;
    const x = perData.get(data);
    somma += x?.punti ?? 0;
    giorni.push({ data, punti: x?.punti ?? 0, cumulato: somma, voci: x?.voci ?? [] });
  }
  return { giorni, totale: somma, dettaglio };
}
