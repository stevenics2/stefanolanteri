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

function nota(freq: number, inizio: number, durata: number, volume = 0.15, onda: OscillatorType = "triangle") {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.frequency.value = freq;
  osc.type = onda;
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
//   incasso  = straordinario confermato    (cassa da negozio: "ka-ching")
export type Suono = "via" | "indietro" | "pausa" | "riprendi" | "ok" | "livello" | "vittoria" | "incasso";

const NOTE: Record<Exclude<Suono, "incasso">, [freq: number, inizio: number, durata: number, volume?: number][]> = {
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

// Un breve fruscio filtrato: lo scatto meccanico e il cassetto della cassa.
function rumore(inizio: number, durata: number, freq: number, volume: number) {
  if (!ctx) return;
  const n = Math.floor(ctx.sampleRate * durata);
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const dati = buf.getChannelData(0);
  for (let i = 0; i < n; i++) dati[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filtro = ctx.createBiquadFilter();
  filtro.type = "bandpass";
  filtro.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.value = volume;
  src.connect(filtro).connect(g).connect(ctx.destination);
  src.start(ctx.currentTime + inizio);
}

// Il campanello metallico: più note NON armoniche insieme (è quello che lo fa suonare "d'ottone") che si spengono piano.
function campanello(inizio: number, base: number, volume: number) {
  for (const [rapporto, v, durata] of [[1, 1, 1.1], [2.76, 0.55, 0.8], [5.4, 0.3, 0.5], [1.5, 0.35, 0.9]] as const) {
    nota(base * rapporto, inizio, durata, volume * v, "sine");
  }
}

// Una vecchia cassa da negozio: scatto del tasto, "ching" del campanello, cassetto che scorre.
function incasso() {
  rumore(0, 0.07, 2200, 0.4); // clack
  nota(120, 0, 0.1, 0.35, "square"); // colpo grave
  campanello(0.07, 2093, 0.16); // ching!
  rumore(0.18, 0.28, 700, 0.18); // il cassetto scorre
  campanello(0.5, 3136, 0.06); // ting finale, più piano
}

export function suono(tipo: Suono) {
  try {
    avviaAudio();
    if (tipo === "incasso") {
      incasso();
      return;
    }
    for (const [freq, inizio, durata, volume] of NOTE[tipo]) nota(freq, inizio, durata, volume);
  } catch {
    // niente audio disponibile: pazienza
  }
}

// Una piccola esplosione di monetine d'oro (al posto dei coriandoli): tonde, che girano mentre cadono.
export async function monete() {
  const confetti = (await import("canvas-confetti")).default;
  const oro = ["#ffd700", "#f5c518", "#e6b800", "#fff1a8", "#c99700"];
  const base = { shapes: ["circle" as const], colors: oro, gravity: 1.3, decay: 0.9, ticks: 110, scalar: 1.15 };
  confetti({ ...base, particleCount: 26, spread: 70, startVelocity: 40, origin: { x: 0.5, y: 0.75 } });
  setTimeout(() => confetti({ ...base, particleCount: 14, spread: 110, startVelocity: 30, origin: { x: 0.5, y: 0.72 } }), 130);
}
