// Funzioni sulle date. Le date dell'app sono stringhe locali "AAAA-MM-GG" (mai toISOString: sposta il giorno per il fuso).

const p = (x: number) => String(x).padStart(2, "0");

export const GIORNI_LUNGHI = ["domenica", "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato"];
export const MESI_LUNGHI = [
  "gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno",
  "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre",
];

export const GIORNI_BREVI = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"];
export const MESI_BREVI = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];

export function oggiLocale(d: Date = new Date()): string {
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function daStringa(s: string): Date {
  const [a, m, g] = s.split("-").map(Number);
  return new Date(a, m - 1, g);
}

export function dataPiù(s: string, giorni: number): string {
  const d = daStringa(s);
  d.setDate(d.getDate() + giorni);
  return oggiLocale(d);
}

// 0 = domenica ... 6 = sabato
export const giornoSettimana = (s: string) => daStringa(s).getDay();

// Il lunedì della settimana in cui cade la data: serve per "1 salvataggio a settimana" delle serie.
export const inizioSettimana = (s: string) => dataPiù(s, -((giornoSettimana(s) + 6) % 7));

export function dataLunga(s: string): string {
  const d = daStringa(s);
  return `${GIORNI_LUNGHI[d.getDay()]} ${d.getDate()} ${MESI_LUNGHI[d.getMonth()]}`;
}
