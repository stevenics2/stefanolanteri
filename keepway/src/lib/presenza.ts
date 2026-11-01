// Quando l'app è stata usata l'ultima volta: serve a capire se è passata una notte (una lunga pausa) prima di questa apertura.
const CHIAVE = "keepway.presenza";
export const PAUSA_NOTTE_MS = 6 * 3_600_000;

export function ultimaPresenza(): number | null {
  try {
    return Number(localStorage.getItem(CHIAVE)) || null;
  } catch {
    return null;
  }
}

export function segnaPresenza(ms: number = Date.now()) {
  try {
    localStorage.setItem(CHIAVE, String(ms));
  } catch {
    // pazienza
  }
}

// Quanto tempo è passato dall'ultima volta che l'app era in uso (ms), o 0 se non si sa.
export function pausaDaUltimoUso(adesso: number = Date.now()): number {
  const u = ultimaPresenza();
  return u ? Math.max(0, adesso - u) : 0;
}
