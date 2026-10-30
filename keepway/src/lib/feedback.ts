import { dataPiù, giornoSettimana } from "./date";
import { giornata, serie } from "./regole";
import { finestreLibere, èInSilenzio } from "./sonno";
import type { Stato } from "./tipi";

export type Tono = "bene" | "medio" | "male";
export type Feedback = { testo: string; tono: Tono };

const scegli = <T,>(lista: T[]): T => lista[Math.floor(Math.random() * lista.length)];
const TRAGUARDI = [3, 7, 14, 30, 60, 100];

// Quanta parte del tempo libero di oggi è già passata (0 = la giornata inizia, 1 = è finita).
// Non conta l'orologio ma i tuoi turni e il sonno: se lavori fino alle 19, alle 15 è ancora presto.
// Se oggi non hai tempo libero (giornata piena) restituisce null.
function trascorsoLibero(oggi: string, ora: Date): number | null {
  const m = ora.getHours() * 60 + ora.getMinutes();
  let totale = 0;
  let restante = 0;
  for (const f of finestreLibere(oggi, 8 * 60, 22 * 60 + 30, 15)) {
    totale += f.a - f.da;
    restante += Math.max(0, f.a - Math.max(f.da, m));
  }
  return totale > 0 ? 1 - restante / totale : null;
}

// Il commento all'apertura dell'app. Il giudizio dipende da quanto hai fatto RISPETTO a quanto tempo libero è passato:
// a inizio giornata (o a inizio settimana) con zero task è normale, e non ti dice mai "pippa". La sgridata arriva solo
// quando la giornata è quasi finita e non hai fatto niente.
export function feedbackApertura(stato: Stato, oggi: string, ora: Date): Feedback {
  const { previste, fatte } = giornata(stato, oggi);
  const tot = previste.length;
  const f = fatte.length;
  const perc = tot > 0 ? f / tot : 0;
  const trasc = trascorsoLibero(oggi, ora);
  const ieri = dataPiù(oggi, -1);
  const gIeri = giornata(stato, ieri);
  const fatteIeri = stato.completamenti.filter((c) => c.data === ieri).length;
  const giorniSerie = Math.max(0, ...stato.task.map((t) => serie(t, stato.completamenti, oggi, { vacanza: stato.vacanza }, stato.ignorati)));
  const lunedi = giornoSettimana(oggi) === 1;

  if (tot === 0) return { tono: "medio", testo: scegli(["Giornata libera dalle task: goditela, te la sei guadagnata.", "Niente da fare oggi. Recupera le energie."]) };
  if (trasc === null) return { tono: "medio", testo: scegli(["Giornata piena di impegni: anche una task piccola conta.", "Oggi hai poco tempo: fai il minimo e riposati."]) };

  if (perc === 1) return { tono: "bene", testo: scegli(["Giornata chiusa! Sei un fenomeno.", "Tutto fatto. Sei una macchina.", "100%. Oggi hai vinto tu."]) };
  if (TRAGUARDI.includes(giorniSerie)) return { tono: "bene", testo: `${giorniSerie} giorni di fila! Sei una macchina. Non romperla oggi.` };
  if (perc >= 0.8 || (tot - f === 1 && f >= 2)) return { tono: "bene", testo: scegli(["Quasi! Ancora una e chiudi.", "Sei a un passo: non mollare adesso.", "Ci sei quasi, finisci il lavoro."]) };

  // Con qualcosa di fatto: il giudizio è il tuo ritmo rispetto al tempo passato
  if (f > 0) {
    const ritmo = perc - trasc;
    if (ritmo >= 0.15) return { tono: "bene", testo: scegli(["Sei in anticipo sul programma!", "Parti col turbo: continua così.", "Bel ritmo, sei davanti al tempo."]) };
    if (ritmo >= -0.2) return { tono: "medio", testo: scegli(["Sei a buon punto!", "Sei in linea: continua così.", "Bel ritmo, avanti!"]) };
    if (trasc < 0.7) return { tono: "medio", testo: scegli(["Un po' lento, ma c'è tempo: ora una in più.", "Parti con calma, ma non fermarti."]) };
    return { tono: "male", testo: scegli(["Sei un po' indietro: è il momento di accelerare.", "Il tempo corre e tu no: spingi!"]) };
  }

  // Il lunedì il messaggio di inizio settimana ha la precedenza su tutto, anche se sei in turno (leggere si può fare anche al lavoro)
  if (lunedi && trasc < 0.7) return { tono: "bene", testo: scegli(["Nuova settimana: il boss è a vita piena. Attacca!", "Lunedì: tutto da fare e tutto da vincere."]) };

  // Niente di fatto. Se sei in turno o stai dormendo non ha senso dire "il tempo corre": sei impegnato
  if (èInSilenzio(ora.getTime()) && (trasc === null || trasc < 0.9)) {
    return { tono: "medio", testo: scegli(["Adesso sei impegnato: al prossimo momento libero, una task alla volta.", "Sei in turno: quando stacchi, parti dalla più facile.", "Ora tocca al lavoro. Le task ti aspettano dopo."]) };
  }

  // Niente di fatto: dipende da quanto è avanzata la giornata
  if (trasc < 0.35) return { tono: "bene", testo: scegli(["Si parte! Hai tutta la giornata davanti.", "Pagina bianca: dai il primo colpo, parti dalla più facile.", "Ancora niente, ed è giusto così. Comincia quando vuoi."]) };
  if (trasc < 0.7) return { tono: "medio", testo: scegli(["Ancora zero, ma c'è tempo: parti dalla più facile.", "Metà del tempo è andato: ora una, anche piccola."]) };
  if (trasc < 0.9) return { tono: "male", testo: scegli(["Zero task e il tempo stringe. Una piccola, adesso!", "Siamo agli sgoccioli: fanne almeno una."]) };

  // la giornata è praticamente finita
  if (fatteIeri === 0 && gIeri.previste.length > 0 && stato.completamenti.length > 0) return { tono: "male", testo: "Ieri zero, oggi zero: così non si costruisce niente." };
  return { tono: "male", testo: scegli(["Sei una pippa! Zero task e la giornata è finita.", "Zero task oggi. Una vera pippa.", "Ieri le promesse, oggi zero. Pippa!"]) };
}
