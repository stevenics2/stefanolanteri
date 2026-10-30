import { dataPiù } from "./date";
import { giornata, serie } from "./regole";
import type { Stato } from "./tipi";

export type Tono = "bene" | "medio" | "male";
export type Feedback = { testo: string; tono: Tono };

const scegli = <T,>(lista: T[]): T => lista[Math.floor(Math.random() * lista.length)];
const TRAGUARDI = [3, 7, 14, 30, 60, 100];

// Il commento all'apertura dell'app: un giudizio sulla giornata, spiritoso. Cambia con l'ora e con come stai andando.
export function feedbackApertura(stato: Stato, oggi: string, ora: Date): Feedback {
  const { previste, fatte } = giornata(stato, oggi);
  const tot = previste.length;
  const f = fatte.length;
  const perc = tot > 0 ? f / tot : 0;
  const h = ora.getHours();
  const fatteIeri = stato.completamenti.filter((c) => c.data === dataPiù(oggi, -1)).length;
  const giorniSerie = Math.max(0, ...stato.task.map((t) => serie(t, stato.completamenti, oggi, { vacanza: stato.vacanza }, stato.ignorati)));

  if (tot === 0) return { tono: "medio", testo: scegli(["Giornata libera dalle task: goditela, te la sei guadagnata.", "Niente da fare oggi. Recupera le energie."]) };

  if (perc === 1) return { tono: "bene", testo: scegli(["Giornata chiusa! Sei un fenomeno.", "Tutto fatto. Sei una macchina.", "100%. Oggi hai vinto tu."]) };

  if (TRAGUARDI.includes(giorniSerie)) return { tono: "bene", testo: `${giorniSerie} giorni di fila! Sei una macchina. Non romperla oggi.` };

  if (perc >= 0.8 || (tot - f === 1 && f >= 2)) return { tono: "bene", testo: scegli(["Quasi! Ancora una e chiudi.", "Sei a un passo: non mollare adesso.", "Ci sei quasi, finisci il lavoro."]) };

  if (perc >= 0.4) return { tono: "medio", testo: scegli(["Sei a buon punto!", "Bel ritmo, continua così.", "Metà strada fatta. Avanti!"]) };

  if (f > 0) {
    if (h < 14) return { tono: "medio", testo: scegli(["Si parte bene. Non fermarti.", "Il primo passo è fatto: il più difficile."]) };
    if (h < 19) return { tono: "male", testo: scegli(["Poco, ma qualcosa. Spingi!", "Sei un po' indietro: è il momento di accelerare."]) };
    return { tono: "male", testo: scegli(["Sei messo maluccio... ma c'è ancora tempo.", "Poca roba per essere sera. Recupera!"]) };
  }

  // niente fatto
  if (fatteIeri === 0 && stato.completamenti.length > 0) return { tono: "male", testo: "Ieri zero, oggi zero: così non si costruisce niente." };
  if (h < 12) return { tono: "medio", testo: scegli(["Nuova giornata, zero task. Muoviti!", "Il divano ti chiama: ignoralo."]) };
  if (h < 18) return { tono: "male", testo: scegli(["Zero task e già pomeriggio. Sveglia!", "Ancora niente? Ma dai!"]) };
  return { tono: "male", testo: scegli(["Sei una pippa! Zero task e già sera.", "Zero task oggi. Una vera pippa.", "Ieri le promesse, oggi zero. Pippa!"]) };
}
