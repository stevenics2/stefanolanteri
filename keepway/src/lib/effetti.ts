// Coriandoli e suoni. Tutto opzionale: si spegne dalle Impostazioni.

export async function coriandoli(grande: boolean) {
  const confetti = (await import("canvas-confetti")).default;
  const colori = ["#f5a524", "#29a3f0", "#22c55e", "#ef4444", "#8b5cf6"];
  if (!grande) {
    confetti({ particleCount: 70, spread: 70, origin: { y: 0.7 }, colors: colori });
    return;
  }
  // Livello nuovo: tre esplosioni
  for (const [x, ritardo] of [[0.2, 0], [0.8, 200], [0.5, 400]] as const) {
    setTimeout(() => confetti({ particleCount: 140, spread: 100, startVelocity: 45, origin: { x, y: 0.65 }, colors: colori }), ritardo);
  }
}

let ctx: AudioContext | null = null;

function nota(freq: number, inizio: number, durata: number, volume = 0.15) {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.frequency.value = freq;
  osc.type = "triangle";
  g.gain.setValueAtTime(volume, ctx.currentTime + inizio);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + inizio + durata);
  osc.connect(g).connect(ctx.destination);
  osc.start(ctx.currentTime + inizio);
  osc.stop(ctx.currentTime + inizio + durata);
}

function avviaAudio() {
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  ctx ??= new AC();
  if (ctx.state === "suspended") void ctx.resume();
}

// Un "tic" brevissimo per ogni tocco.
export function tic() {
  try {
    avviaAudio();
    nota(1500, 0, 0.04, 0.06);
  } catch {
    // niente audio disponibile
  }
}

// Vocabolario dei suoni: lo stesso schema in tutta l'app.
//   via      = parte qualcosa / conferma   (3 note che salgono)
//   indietro = annulla / chiudi / torna    (un bip basso)
//   pausa    = si ferma                    (2 note che scendono)
//   riprendi = riparte                     (2 note che salgono)
//   ok       = task fatta                  (2 note brillanti)
//   livello  = livello nuovo               (arpeggio)
//   vittoria = fine timer                  (fanfara)
export type Suono = "via" | "indietro" | "pausa" | "riprendi" | "ok" | "livello" | "vittoria";

const NOTE: Record<Suono, [freq: number, inizio: number, durata: number, volume?: number][]> = {
  via: [[587, 0, 0.09], [740, 0.1, 0.09], [880, 0.2, 0.18]],
  indietro: [[294, 0, 0.14, 0.18]],
  pausa: [[587, 0, 0.1], [440, 0.11, 0.16]],
  riprendi: [[440, 0, 0.1], [587, 0.11, 0.16]],
  ok: [[659, 0, 0.12], [880, 0.1, 0.2]],
  livello: [[523, 0, 0.3], [659, 0.12, 0.3], [784, 0.24, 0.3], [1047, 0.36, 0.5]],
  vittoria: [
    [523, 0, 0.14, 0.18], [523, 0.16, 0.14, 0.18], [523, 0.32, 0.14, 0.18],
    [659, 0.5, 0.3, 0.18], [784, 0.82, 0.2, 0.18],
    [1047, 1.04, 0.8, 0.18], [784, 1.04, 0.8, 0.1], [659, 1.04, 0.8, 0.1],
  ],
};

export function suono(tipo: Suono) {
  try {
    avviaAudio();
    for (const [freq, inizio, durata, volume] of NOTE[tipo]) nota(freq, inizio, durata, volume);
  } catch {
    // niente audio disponibile: pazienza
  }
}
