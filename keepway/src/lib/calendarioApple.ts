import type { Evento } from "./tipi";

// L'indirizzo che genera il file .ics di un appuntamento: Safari lo apre e propone "Aggiungi al calendario".
// Lo stesso evento (stesso id) aggiorna quello già nel Calendario, invece di duplicarlo.
export function indirizzoCalendarioApple(e: Evento): string {
  const q = new URLSearchParams({ id: e.id, t: e.titolo, d: e.data, m: String(e.durataMin) });
  if (e.ora) q.set("o", e.ora);
  if (e.luogo) q.set("l", e.luogo);
  return `/api/ics?${q.toString()}`;
}

export function apriInCalendarioApple(e: Evento) {
  const url = indirizzoCalendarioApple(e);
  if (!window.open(url, "_blank")) window.location.href = url;
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
