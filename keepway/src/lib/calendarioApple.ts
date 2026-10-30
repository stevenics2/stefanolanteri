import type { Evento } from "./tipi";

// Il file .ics di un appuntamento. L'orario è "fluttuante" (senza fuso): il telefono lo legge come l'hai scritto.
// Lo stesso evento (stesso id) aggiorna quello già nel Calendario, invece di duplicarlo.
const esc = (t: string) => t.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const p2 = (n: number) => String(n).padStart(2, "0");

function fine(data: string, ora: string | null, minuti: number): [string, string] {
  const [a, m, g] = data.split("-").map(Number);
  const [h, mi] = ora ? ora.split(":").map(Number) : [0, 0];
  const x = new Date(Date.UTC(a, m - 1, g, h, mi) + minuti * 60000);
  return [`${x.getUTCFullYear()}${p2(x.getUTCMonth() + 1)}${p2(x.getUTCDate())}`, `${p2(x.getUTCHours())}${p2(x.getUTCMinutes())}00`];
}

export function costruisciIcs(e: Evento): string {
  const giorno = e.data.replace(/-/g, "");
  const righe = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Keepway//IT", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "BEGIN:VEVENT", `UID:keepway-${e.id}@keepway`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`];
  if (e.ora) {
    const [dfine, hfine] = fine(e.data, e.ora, e.durataMin);
    righe.push(`DTSTART:${giorno}T${e.ora.replace(":", "")}00`, `DTEND:${dfine}T${hfine}`);
  } else {
    righe.push(`DTSTART;VALUE=DATE:${giorno}`, `DTEND;VALUE=DATE:${fine(e.data, null, 24 * 60)[0]}`);
  }
  righe.push(`SUMMARY:${esc(e.titolo)}`);
  if (e.luogo) righe.push(`LOCATION:${esc(e.luogo)}`);
  // Due avvisi del Calendario: il giorno prima e due ore prima (tutto il giorno: la sera prima)
  for (const trigger of e.ora ? ["-P1D", "-PT2H"] : ["-PT6H"]) righe.push("BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${esc(e.titolo)}`, `TRIGGER:${trigger}`, "END:VALARM");
  righe.push("END:VEVENT", "END:VCALENDAR");
  return righe.join("\r\n") + "\r\n";
}

// Apre il foglio di condivisione di iPhone con il file dell'appuntamento: si sceglie «Calendario» e si conferma.
// Si resta dentro Keepway (niente Safari). Se la condivisione dei file non c'è (computer), scarica il file.
export async function apriInCalendarioApple(e: Evento) {
  const file = new File([costruisciIcs(e)], "appuntamento.ics", { type: "text/calendar" });
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: e.titolo });
      return;
    }
  } catch {
    return; // annullato dall'utente
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = "appuntamento.ics";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

const CHIAVE = "keepway-salva-su-apple";
export const leggiScelta = () => {
  try {
    return localStorage.getItem(CHIAVE) === "1";
  } catch {
    return false;
  }
};
export const salvaScelta = (v: boolean) => {
  try {
    localStorage.setItem(CHIAVE, v ? "1" : "0");
  } catch {
    // pazienza
  }
};
