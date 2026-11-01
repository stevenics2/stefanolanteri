// Il sonno tra un turno e l'altro. Con i turni il sonno si spezza (riposino prima della notte, sonno dopo) e non sta in un solo giorno:
// il calendario non basta. Qui si divide il tempo in «cicli» che finiscono alla fine di ogni turno (e ogni 24 ore nei giorni senza turni),
// e per ognuno si confronta il sonno fatto con quello che serviva in proporzione alla sua durata (obiettivo × ore del ciclo / 24).
import { blocchiEffettivi } from "./calendario";
import type { SessioneSonno } from "./salute";
import { istanteDaMinutiAssoluti } from "./sonno";

const ORA = 3_600_000;
const GIORNO = 24 * ORA;

export type Ciclo = { da: number; a: number; sonnoMin: number; necessariMin: number; aperto: boolean };

function confini(adesso: number, giorni: number): number[] {
  const inizio = adesso - giorni * GIORNO;
  const fini = blocchiEffettivi().map((b) => istanteDaMinutiAssoluti(b.fine)).filter((e) => e > inizio && e <= adesso).sort((x, y) => x - y);
  const out = [inizio];
  const riempi = (fino: number) => {
    while (fino - out[out.length - 1] > 36 * ORA) out.push(out[out.length - 1] + GIORNO); // giorni senza turni: un ciclo ogni 24 ore
  };
  for (const e of fini) {
    riempi(e);
    if (e - out[out.length - 1] >= 6 * ORA) out.push(e);
  }
  riempi(adesso);
  return out;
}

const sovrapposto = (s: SessioneSonno, da: number, a: number) => {
  const o = Math.min(s.fine, a) - Math.max(s.inizio, da);
  return o > 0 ? (o / Math.max(1, s.fine - s.inizio)) * s.minuti : 0; // la parte di sessione dentro il ciclo
};

// I cicli degli ultimi `giorni` giorni, con il sonno fatto e quello che serviva. Si saltano i cicli senza dati (prima del primo dato o senza sonno).
export function cicliDiSonno(sessioni: SessioneSonno[], adesso: number, obiettivoMin: number, giorni = 30): Ciclo[] {
  if (!sessioni.length) return [];
  const primo = Math.min(...sessioni.map((s) => s.inizio));
  const b = confini(adesso, giorni);
  const out: Ciclo[] = [];
  for (let i = 0; i < b.length; i++) {
    const da = b[i];
    const aperto = i === b.length - 1;
    const a = aperto ? adesso : b[i + 1];
    if (a <= da || da < primo - 12 * ORA) continue;
    const sonnoMin = Math.round(sessioni.reduce((t, s) => t + sovrapposto(s, da, a), 0));
    if (!aperto && sonnoMin < 60) continue; // nessun dato in quel ciclo (probabilmente non sincronizzato)
    out.push({ da, a, sonnoMin, necessariMin: Math.round((obiettivoMin * (a - da)) / GIORNO), aperto });
  }
  return out;
}

export const RISERVA_MAX_MIN = 120; // la riserva (sonno in più quando sei già in pari) si ferma a 2 ore

// Un passo del conto: `manca` = minuti sotto il necessario (negativo = sonno in più).
// Sotto il necessario il debito sale (e prima si consuma la riserva); sopra scende solo della metà; quando il debito è finito, il sonno in più
// riempie la riserva per intero, fino a 2 ore.
export function passoDebito(s: { debito: number; riserva: number }, manca: number): { debito: number; riserva: number } {
  let { debito, riserva } = s;
  if (manca > 0) {
    const daRiserva = Math.min(riserva, manca);
    riserva -= daRiserva;
    debito += manca - daRiserva;
  } else if (manca < 0) {
    const inPiu = -manca;
    if (debito > 0) {
      if (inPiu / 2 >= debito) {
        riserva += inPiu - debito * 2; // il debito è finito: avanza sonno vero
        debito = 0;
      } else debito -= inPiu / 2;
    } else riserva += inPiu;
    riserva = Math.min(RISERVA_MAX_MIN, riserva);
  }
  return { debito, riserva };
}

// Il debito di sonno sui cicli: stesse regole di prima (sotto il necessario sale, sopra scende della metà), ma il ciclo ancora aperto può solo ridurlo.
export function debitoDaCicli(cicli: Ciclo[]): { debito: number; riserva: number; ultimo: Ciclo | null } {
  let conto = { debito: 0, riserva: 0 };
  let ultimo: Ciclo | null = null;
  for (const c of cicli) {
    const manca = c.necessariMin - c.sonnoMin;
    if (c.aperto && manca > 0) continue;
    conto = passoDebito(conto, manca);
    if (!c.aperto) ultimo = c;
  }
  return { debito: Math.round(conto.debito), riserva: Math.round(conto.riserva), ultimo };
}

// Il punteggio di sonno (0–100) sui cicli conclusi tra `da` e `a` (ms): quanto del necessario hai dormito, in media. null se i cicli sono meno di 3.
export function punteggioSonnoCicli(cicli: Ciclo[], da: number, a: number): number | null {
  const v = cicli.filter((c) => !c.aperto && c.a > da && c.a <= a);
  if (v.length < 3) return null;
  return Math.round((v.reduce((t, c) => t + Math.min(1, c.sonnoMin / c.necessariMin), 0) / v.length) * 100);
}
