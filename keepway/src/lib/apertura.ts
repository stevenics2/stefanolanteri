// "Aperture" dell'app: la prima volta che si carica, e ogni volta che torna in primo piano dopo essere stata nascosta
// (si chiude e si riapre, o si torna da un'altra app). Serve a far partire l'animazione del recap una volta per apertura,
// non a ogni cambio di scheda.
let contatore = 1; // la prima apertura
let riprodotta = 0; // l'ultima per cui l'animazione è già partita
let attivo = false;
const ascoltatori = new Set<() => void>();

function avvia() {
  if (attivo || typeof document === "undefined") return;
  attivo = true;
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      contatore++;
      ascoltatori.forEach((f) => f());
    }
  });
}

export function aperturaCorrente() {
  avvia();
  return contatore;
}

export function iscriviApertura(f: () => void) {
  avvia();
  ascoltatori.add(f);
  return () => void ascoltatori.delete(f);
}

export const èDaRiprodurre = (n: number) => riprodotta < n;
export const segnaRiprodotta = (n: number) => {
  riprodotta = Math.max(riprodotta, n);
};
