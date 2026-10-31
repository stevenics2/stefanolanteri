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
  if (!ctx || ctx.state === "closed") ctx = new AC();
  // Su iPhone, dopo che l'app è stata in background (o lo schermo bloccato), l'audio passa a "interrupted" e resta muto
  // finché non lo si riattiva: quindi si riattiva ogni volta che non sta già suonando, non solo se è "suspended".
  if (ctx.state !== "running") void ctx.resume().catch(() => {});
}

// Si chiama al primo contatto con lo schermo, così l'audio è già pronto quando serve il suono.
export function riprendiAudio() {
  try {
    avviaAudio();
  } catch {
    // niente audio disponibile
  }
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
//   incasso  = straordinario / cambio turno (monete che cadono e tintinnano, poi il "ding" di moneta presa)
//   slot     = task completata: una scala in salita che arriva a un accordo brillante
//   calcolo  = apertura dell'app (un computer che elabora, poi un "ding" di approvazione)
export type Suono = "via" | "indietro" | "pausa" | "riprendi" | "ok" | "livello" | "vittoria" | "incasso" | "calcolo" | "slot";

const NOTE: Record<Exclude<Suono, "incasso" | "calcolo" | "slot">, [freq: number, inizio: number, durata: number, volume?: number][]> = {
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

// Una nota che scivola da una frequenza all'altra: il "tonf" sordo del tasto e del cassetto.
function scivola(f0: number, f1: number, inizio: number, durata: number, volume: number, onda: OscillatorType = "sine") {
  if (!ctx) return;
  const t = ctx.currentTime + inizio;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = onda;
  osc.frequency.setValueAtTime(f0, t);
  osc.frequency.exponentialRampToValueAtTime(f1, t + durata);
  g.gain.setValueAtTime(volume, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + durata);
  osc.connect(g).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + durata);
}

// La campana d'ottone: tante note NON armoniche insieme, ognuna con la sua durata (le acute si spengono prima),
// ognuna doppiata con una di pochissimo più alta: il "battimento" dà il luccichio metallico.
function campana(inizio: number, base: number, volume: number, scala = 1) {
  const parziali: [rapporto: number, peso: number, durata: number][] = [
    [1, 1, 1.7], [2, 0.5, 1.3], [2.76, 0.6, 1.0], [4.07, 0.35, 0.65], [5.4, 0.25, 0.45], [6.8, 0.12, 0.3],
  ];
  for (const [r, v, d] of parziali) {
    nota(base * r, inizio, d * scala, volume * v, "sine");
    nota(base * r * 1.004, inizio, d * scala * 0.9, volume * v * 0.5, "sine");
  }
}

// Un "tin" di moneta: poche note metalliche NON armoniche, acute e brevissime, con un luccichio (la nota doppiata di pochissimo).
function moneta(inizio: number, base: number, volume: number, durata = 0.22) {
  const parziali: [rapporto: number, peso: number, durata: number][] = [[1, 1, 1], [2.32, 0.55, 0.7], [3.87, 0.35, 0.5], [5.6, 0.18, 0.3]];
  for (const [r, v, d] of parziali) {
    nota(base * r, inizio, durata * d, volume * v, "sine");
    nota(base * r * 1.006, inizio, durata * d * 0.8, volume * v * 0.45, "sine");
  }
  rumore(inizio, 0.015, 7500, volume * 1.6); // il "clic" del metallo che si urta
}

// Monete che cadono e tintinnano (~1,3 s): una cascata di tin sempre più fitti e di altezze diverse, poi il "ding" di moneta presa
// (due note rapide, come nei giochi) e un ultimo tintinnio.
function incasso() {
  const altezze = [3520, 2960, 4186, 3135, 3951, 2794, 4435, 3322, 3729, 3136];
  let t = 0;
  altezze.forEach((f, i) => {
    moneta(t, f, 0.05 + (i % 3) * 0.012, 0.2 + (i % 4) * 0.03);
    t += 0.085 - i * 0.0045; // sempre più fitte, come una pioggia di monete
  });
  const fine = t + 0.05;
  nota(988, fine, 0.07, 0.07, "square");
  nota(1319, fine + 0.07, 0.5, 0.08, "square");
  nota(1319 * 2, fine + 0.07, 0.35, 0.03, "sine");
  moneta(fine + 0.12, 4200, 0.07, 0.45);
  moneta(fine + 0.2, 3300, 0.05, 0.4);
}

// Un computer che fa i conti: una raffica di bip brevi e secchi, sempre più fitti (~1 s), con un ronzio di fondo che sale.
// Poi, quando i numeri sono pronti, un "ding" pulito di approvazione. Il ding cade a 1,1 s, insieme al lampo del recap.
function calcolo() {
  const note = [523, 659, 784, 988, 1175, 1319, 1568, 1976, 2349];
  scivola(110, 260, 0, 1.05, 0.08, "sawtooth"); // il ronzio dell'elaborazione
  let t = 0;
  for (let i = 0; i < 18; i++) {
    nota(note[(i * 7 + 3) % note.length] * (i % 5 === 0 ? 2 : 1), t, 0.035, 0.075, "square");
    t += 0.075 - i * 0.0019; // sempre più veloci
  }
  // ding di approvazione
  nota(2637, 1.1, 1.1, 0.12, "sine");
  nota(2637 * 1.003, 1.1, 0.9, 0.06, "sine");
  nota(5274, 1.1, 0.5, 0.04, "sine");
  nota(7900, 1.1, 0.25, 0.02, "sine");
}

// Task completata (~1,2 s): una scala in salita (do maggiore, due ottave) sempre più veloce e più forte, che sfocia in un accordo brillante con la campanella.
function slot() {
  const scala = [523, 587, 659, 698, 784, 880, 988, 1047, 1175, 1319, 1397, 1568, 1760, 1976, 2093]; // do4 -> do6 (la scala sale di un gradino alla volta)
  let t = 0;
  scala.forEach((f, i) => {
    const volume = 0.07 + (i / scala.length) * 0.07; // cresce man mano che sale
    nota(f, t, 0.16, volume, "triangle");
    nota(f * 2, t, 0.08, volume * 0.35, "sine"); // un filo di brillantezza
    t += 0.075 - i * 0.0022; // accelera
  });
  // arrivo: accordo di do maggiore + campanella
  const fine = t + 0.04;
  [1047, 1319, 1568, 2093].forEach((f) => nota(f, fine, 0.6, 0.1, "triangle"));
  nota(4186, fine, 0.35, 0.04, "sine");
  campana(fine, 2093, 0.08, 0.7);
}

export function suono(tipo: Suono) {
  try {
    avviaAudio();
    if (tipo === "incasso") {
      incasso();
      return;
    }
    if (tipo === "slot") {
      slot();
      return;
    }
    if (tipo === "calcolo") {
      calcolo();
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
