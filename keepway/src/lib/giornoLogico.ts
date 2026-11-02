// Il «giorno» di Keepway non finisce a mezzanotte ma quando vai a dormire: se stacchi all'1:00 sei ancora nella stessa giornata
// e puoi segnare le task di ieri (lettura, meditazione...) prima di andare a letto.
//
// Dopo la mezzanotte si resta nel giorno di ieri finché NON succede una di queste cose:
//  - ti sei messo a dormire (una sessione di sonno che tocca il periodo dopo la mezzanotte, dai dati di Salute);
//  - comincia un turno (il turno 1 alle 01:00: da lì è il giorno nuovo);
//  - sono le 05:00 (limite massimo, se i dati del sonno non sono ancora arrivati);
//  - tocchi «Chiudi la giornata».
import { blocchiEffettivi } from "./calendario";
import { dataPiù, oggiLocale } from "./date";
import { datiInCache } from "./salute";
import { istanteDaMinutiAssoluti } from "./sonno";

const LIMITE_MAX_MIN = 5 * 60;
const SONNO_VALIDO_MIN = 20; // sotto i 20 minuti non è un sonno ma una pausa
export const EVENTO_GIORNO = "keepway:giorno";
const CHIAVE_CHIUSA = "keepway.giornoChiuso";

export function chiudiGiornata(adessoMs = Date.now()): void {
  try {
    localStorage.setItem(CHIAVE_CHIUSA, oggiLocale(new Date(adessoMs)));
  } catch {
    // pazienza
  }
  window.dispatchEvent(new Event(EVENTO_GIORNO)); // lo store ricalcola subito il giorno
}

export function oggiLogico(adessoMs = Date.now()): string {
  const d = new Date(adessoMs);
  const cal = oggiLocale(d);
  const mezzanotte = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  let limite = mezzanotte + LIMITE_MAX_MIN * 60_000;
  if (adessoMs >= limite) return cal;
  // un turno che comincia nelle prime ore: da lì è il giorno nuovo
  for (const b of blocchiEffettivi()) {
    const inizio = istanteDaMinutiAssoluti(b.inizio);
    if (inizio >= mezzanotte && inizio < limite) limite = inizio;
  }
  if (adessoMs >= limite) return cal;
  try {
    if (localStorage.getItem(CHIAVE_CHIUSA) === cal) return cal;
  } catch {
    // pazienza
  }
  const dormito = (datiInCache().sonni ?? []).some((s) => s.minuti >= SONNO_VALIDO_MIN && s.inizio <= adessoMs && s.fine > mezzanotte);
  return dormito ? cal : dataPiù(cal, -1);
}

// I minuti dalla mezzanotte del giorno di lavoro: dopo la mezzanotte superano 1440 (00:30 = 1470).
export function minutiNelGiorno(adessoMs: number, giorno: string): number {
  const [a, m, g] = giorno.split("-").map(Number);
  return Math.round((adessoMs - new Date(a, m - 1, g).getTime()) / 60_000);
}
