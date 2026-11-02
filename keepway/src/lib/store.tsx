"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { pianifica } from "./allenamento";
import { impostaModifiche } from "./calendario";
import { confermaCambio, rilevaCambi } from "./cambiPiano";
import { èPianificata, impostaPianoAuto } from "./pianoAuto";
import { dataPiù, inizioSettimana, oggiLocale } from "./date";
import { EVENTO_GIORNO, oggiLogico } from "./giornoLogico";
import { bossSettimana, giornata, livello, puntiMinima, xpTotali } from "./regole";
import { nuovoId, statoIniziale, statoVuoto, taskStanza } from "./seed";
import { stanzaDelGiorno } from "./stanze";
import type { Bonus, Completamento, Evento, Impostazioni, Modifica, Momento, Settimana, SpecSeguito, Stato, Task, Vacanza } from "./tipi";

const CHIAVE = "keepway.v1";
const CHIAVE_VECCHIA = "binario.v1"; // il nome precedente: se ci sono dati salvati lì li si recupera

export type Ricompensa = {
  id: string;
  completamentoId: string;
  titolo: string;
  punti: number;
  bonus: number;
  frase: string;
  nuovoLivello: string | null;
  daTimer: boolean; // finita con il timer: suona la fanfara
  moltiplicatore: number; // combo: 1 = nessuna
};

// Momenti "da festa": combo, record, forziere, boss. Compaiono in un popup, uno alla volta.
export type Festa = { id: string; tipo: "combo" | "record" | "forziere" | "boss" | "traguardo"; titolo: string; testo: string; xp: number };

const COMBO_PAUSA_MS = 60 * 60_000; // task di fila = tra una e l'altra meno di un'ora
const COMBO_MINIMO = 3;
const MOLTIPLICATORE_COMBO = 1.5;

// Cosa c'è nel forziere: a sorpresa. Quasi sempre un bonus, ogni tanto un jackpot.
function dentroForziere(aree: Stato["aree"]): { testo: string; xp: number } {
  const r = Math.random();
  if (r < 0.05) return { testo: "JACKPOT! Il forziere era pieno.", xp: 150 };
  if (r < 0.4) return { testo: `${aree[Math.floor(Math.random() * aree.length)].frase}. Oggi l'hai dimostrato.`, xp: 30 };
  if (r < 0.65) return { testo: "Titolo sbloccato: «Il Costante»", xp: 25 };
  return { testo: "Bonus giornata chiusa", xp: 30 + Math.floor(Math.random() * 31) };
}

// Avviso con "Annulla" dopo una modifica ai turni.
export type Avviso = { id: string; testo: string; data: string; rimuovi: string[]; ripristina: Modifica[] };

type Contesto = {
  pronto: boolean;
  stato: Stato;
  oggi: string;
  adesso: number; // ora corrente (ms), aggiornata ogni 30 secondi; 0 finché i dati non sono pronti
  xp: number;
  completa: (taskId: string, opzioni: { minima: boolean; minuti?: number; daTimer?: boolean; punti?: number; data?: string }) => void; // `data`: il giorno a cui segnarla (solo ieri; di solito è oggi)
  annulla: (completamentoId: string) => void;
  salvaTask: (t: Task) => void;
  eliminaTask: (id: string) => void;
  impostazioni: (p: Partial<Impostazioni>) => void;
  setFrase: (areaId: string, frase: string) => void;
  apriTimer: (taskId: string, minima: boolean, durataMin: number) => void; // apre la schermata, senza far partire
  partiTimer: () => void;
  pausaTimer: () => void;
  riprendiTimer: () => void;
  fermaTimer: () => void;
  resettaTimer: () => void;
  ignoraOggi: (taskId: string) => void;
  ripristina: (taskId: string) => void;
  rimanda: (taskId: string, alle: number) => void;
  annullaRinvio: (taskId: string) => void;
  sistemaGiornoAuto: (taskId: string, data: string, attivo: boolean) => void;
  ricalcolaPiano: (taskId: string) => void;
  fissaGiorniAuto: (taskId: string, date: string[]) => void;
  impostaMomento: (taskId: string, momento: { da: number; a: number } | null) => void;
  setStanze: (stanze: string[]) => void;
  setVacanza: (v: Vacanza | null) => void;
  salvaEvento: (e: Evento) => void;
  eliminaEvento: (id: string) => void;
  segnaEvento: (id: string, fatto: boolean) => void;
  salvaModifiche: (nuove: Modifica[], testo: string) => void;
  annullaModifiche: (ids: string[]) => void; // toglie le modifiche (e le collegate dello stesso gruppo)
  avviso: Avviso | null;
  festa: Festa[];
  chiudiFesta: () => void;
  sbloccaTraguardi: (livelli: Record<string, number>, feste: Festa[]) => void; // salva i livelli raggiunti e festeggia i nuovi
  impostaSettimana: (p: Partial<Settimana>) => void; // obiettivi e rito della domenica
  confermaCambioPiano: (id: string) => void;
  tieniGiornoPiano: (id: string) => void;
  annullaAvviso: () => void;
  chiudiAvviso: () => void;
  azzera: () => void;
  ricompensa: Ricompensa | null;
  chiudiRicompensa: () => void;
};

const Ctx = createContext<Contesto | null>(null);

export function useStore(): Contesto {
  const c = useContext(Ctx);
  if (!c) throw new Error("useStore fuori da StoreProvider");
  return c;
}

// Icone: prima erano emoji, ora sono chiavi di icone vere.
const ICONE_VECCHIE: Record<string, string> = { "💪": "dumbbell", "🎯": "target", "🏠": "casa", "🔁": "alba", ripeti: "alba" }; // l'icona delle Abitudini è ora il sole che sorge

// Legge i dati dal telefono e li porta all'ultima forma (aggiunge i campi nuovi senza perdere nulla).
function carica(): Stato {
  try {
    const raw = localStorage.getItem(CHIAVE) ?? localStorage.getItem(CHIAVE_VECCHIA);
    if (raw) {
      const s = JSON.parse(raw) as Partial<Stato> & { versione?: number };
      if (s.versione === 1) {
        const base = statoIniziale();
        // I dati salvati prima di questa versione non hanno i campi nuovi: li aggiungo.
        const task: Task[] = (s.task ?? base.task).map((t) => ({
          ...t,
          soloACasa: (t as Partial<Task>).soloACasa ?? t.areaId === "casa",
          promemoria: (t as Partial<Task>).promemoria ?? [],
          adattaATurni: (t as Partial<Task>).adattaATurni ?? t.tipo === "stanza",
        }));
        // Punti nuovi per le task precaricate (la stanza vale di più), solo se non li hai già cambiati tu.
        const VECCHI_E_NUOVI: Record<string, [number, number]> = { stanza: [15, 50], meditazione: [10, 20], piatti: [15, 20] };
        for (const t of task) {
          const v = VECCHI_E_NUOVI[t.id];
          if (v && t.punti === v[0]) t.punti = v[1];
        }
        if (!task.some((t) => t.id === "stanza")) task.push(taskStanza(oggiLogico()));
        return {
          ...base,
          ...s,
          impostazioni: { ...base.impostazioni, ...s.impostazioni }, // le opzioni nuove prendono il valore predefinito
          // le aree nuove (Self care, Commissioni) si aggiungono a chi aveva già l'app
          aree: [...(s.aree ?? base.aree), ...base.aree.filter((b) => !(s.aree ?? base.aree).some((a) => a.id === b.id))].map((a) => ({ ...a, icona: ICONE_VECCHIE[a.icona] ?? a.icona })),
          task,
          stanze: s.stanze ?? base.stanze,
          ignorati: s.ignorati ?? [],
          rinvii: s.rinvii ?? [],
          momenti: s.momenti ?? [],
          pianoAuto: s.pianoAuto ?? [],
          vacanza: s.vacanza ?? null,
          eventi: (s.eventi ?? []).map((e) => {
            // Vecchio formato: un solo anticipo (anticipoGiorni). Ora sono più avvisi e lo spostamento.
            const { anticipoGiorni, ...resto } = e as typeof e & { anticipoGiorni?: number };
            return { ...resto, avvisi: e.avvisi ?? (anticipoGiorni ? [anticipoGiorni] : []), spostamentoMin: e.spostamentoMin ?? (e.tipo === "appuntamento" ? 20 : 0) };
          }),
          modifiche: s.modifiche ?? [],
          bonus: s.bonus ?? [],
        } as Stato;
      }
    }
  } catch {
    // dati illeggibili: si riparte da zero
  }
  return statoIniziale();
}

const PROGRAMMAZIONE_ID = "programmazione-allenamenti";

// Il seguito di una task: una task di un giorno solo che compare dopo `dopoMin` minuti, con il suo momento e la sua notifica.
// Dopo «Stendi il bucato» (anche quelle create prima di questa regola): il bucato asciutto va ritirato e lo stendino svuotato, dopo 30 ore, con un promemoria ogni 12.
const STENDINO: SpecSeguito = { dopoMin: 30 * 60, titolo: "Ritira e svuota lo stendino", testo: "Il bucato è asciutto: ritira e svuota lo stendino.", punti: 15, ripetiMin: 12 * 60 };
const specSeguito = (t: Task): SpecSeguito | undefined => t.seguito ?? (t.seguitoDi && /stend/i.test(t.titolo) ? STENDINO : undefined);

function creaSeguito(t: Task, spec: SpecSeguito, completamentoId: string, ts: number): { task: Task; momento: Momento } {
  const dopoMin = spec.dopoMin;
  const quando = ts + dopoMin * 60_000;
  const d = new Date(quando);
  const data = oggiLocale(d);
  const da = d.getHours() * 60 + d.getMinutes();
  const id = nuovoId();
  return {
    task: {
      id, titolo: spec.titolo, areaId: t.areaId, icona: "bucato", durataMin: null, minimaMin: null,
      ricorrenza: { tipo: "una_volta", data }, fascia: "qualsiasi", solo: "sempre", punti: spec.punti, essenziale: true, soloACasa: false,
      promemoria: [], attiva: true, creatoIl: oggiLocale(new Date(ts)), seguitoDi: t.id, seguitoDa: completamentoId, visibileDa: quando, notificaTesto: spec.testo,
      ripetiMin: spec.ripetiMin, seguito: spec.poi ?? (/stend/i.test(spec.titolo) ? STENDINO : undefined),
    },
    momento: { taskId: id, data, da, a: da + 15 },
  };
}

// I seguiti vecchi (di ieri e prima) si ripuliscono; la vecchia task della programmazione degli allenamenti sparisce.
function sistemaTaskAutomatiche(s: Stato, oggi: string): Stato {
  let task = s.task;
  // La vecchia task «Programmazione Allenamenti Settimanali» non serve più: c'è il rito della domenica («Prepara la settimana»).
  if (task.some((t) => t.id === PROGRAMMAZIONE_ID)) task = task.filter((t) => t.id !== PROGRAMMAZIONE_ID);
  // I seguiti: quelli fatti si ripuliscono dopo un giorno; quelli ancora da fare restano e si riportano a oggi (non devono sparire se non li fai subito).
  const limite = dataPiù(oggi, -1);
  const fatta = (id: string) => s.completamenti.some((c) => c.taskId === id);
  const pulite = task.filter((t) => !(t.seguitoDi && t.ricorrenza.tipo === "una_volta" && t.ricorrenza.data < limite && fatta(t.id)));
  if (pulite.length !== task.length) task = pulite;
  // Le task di una sola volta non fatte (non solo i seguiti) si riportano a oggi, fino a due settimane indietro: non spariscono se salti il giorno.
  const daRiportare = (t: Task) => t.attiva && t.ricorrenza.tipo === "una_volta" && t.ricorrenza.data < oggi && t.ricorrenza.data >= dataPiù(oggi, -14) && !fatta(t.id);
  if (task.some(daRiportare)) {
    task = task.map((t) => (daRiportare(t) ? { ...t, riportataDa: t.riportataDa ?? (t.ricorrenza.tipo === "una_volta" ? t.ricorrenza.data : undefined), ricorrenza: { tipo: "una_volta" as const, data: oggi } } : t));
  }
  return task === s.task ? s : { ...s, task };
}

// Ricalcola il piano automatico delle task "N volte a settimana" (e lo mette a disposizione di chi lo legge).
function conPiano(stato: Stato): Stato {
  const s = sistemaTaskAutomatiche(stato, oggiLogico());
  if (!s.task.some(èPianificata)) {
    impostaPianoAuto([]);
    return s.pianoAuto.length ? { ...s, pianoAuto: [] } : s;
  }
  const piano = pianifica(s, oggiLogico());
  impostaPianoAuto(piano);
  return { ...s, pianoAuto: piano };
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [stato, setStato] = useState<Stato>(statoVuoto);
  const [pronto, setPronto] = useState(false);
  const [adesso, setAdesso] = useState(0);
  const [oggi, setOggi] = useState(""); // si imposta nel browser: sul server la data sarebbe quella della build
  const [ricompensa, setRicompensa] = useState<Ricompensa | null>(null);
  const [avviso, setAvviso] = useState<Avviso | null>(null);
  const [festa, setFesta] = useState<Festa[]>([]);
  const ref = useRef(stato); // sempre l'ultimo stato, anche dentro timer e callback

  // `conferma` = è una scelta dell'utente sul piano (nuova task, giorno acceso o spento...): il piano nuovo è quello che ha visto, nessun avviso.
  // Se invece il piano cambia da solo (turni, appuntamenti...), `rilevaCambi` prepara un cambio da confermare.
  const aggiorna = useCallback((fn: (s: Stato) => Stato, conferma = false) => {
    const prima = ref.current;
    const dopo = fn(prima);
    if (dopo.modifiche !== prima.modifiche) impostaModifiche(dopo.modifiche); // sonno, conflitti e carico leggono il calendario aggiornato
    ref.current = rilevaCambi(conPiano(dopo), oggiLogico(), conferma, nuovoId, Date.now());
    setStato(ref.current);
  }, []);

  // Carico dal telefono solo dopo l'avvio (sul server non esiste localStorage).
  useEffect(() => {
    const caricato = carica();
    impostaModifiche(caricato.modifiche);
    ref.current = rilevaCambi(conPiano(caricato), oggiLogico(), false, nuovoId, Date.now());
    setStato(ref.current);
    setOggi(oggiLogico());
    setAdesso(Date.now());
    setPronto(true);
  }, []);

  useEffect(() => {
    if (!pronto) return;
    try {
      localStorage.setItem(CHIAVE, JSON.stringify(stato));
    } catch {
      // memoria piena o bloccata: l'app continua a funzionare
    }
  }, [stato, pronto]);

  // Il piano automatico si ricalcola quando cambia il giorno
  useEffect(() => {
    if (pronto && oggi) aggiorna((x) => x);
  }, [pronto, oggi, aggiorna]);

  // «Oggi» cambia da solo: dopo la mezzanotte solo quando dormi, comincia un turno o chiudi la giornata (vedi giornoLogico).
  useEffect(() => {
    const ricalcola = () => {
      setOggi(oggiLogico());
      setAdesso(Date.now());
    };
    const id = setInterval(ricalcola, 30_000);
    window.addEventListener(EVENTO_GIORNO, ricalcola);
    return () => {
      clearInterval(id);
      window.removeEventListener(EVENTO_GIORNO, ricalcola);
    };
  }, []);

  const completa: Contesto["completa"] = useCallback(
    (taskId, { minima, minuti, daTimer, punti: puntiBase, data: giornoScelto }) => {
      const s = ref.current;
      const t = s.task.find((x) => x.id === taskId);
      if (!t) return;
      const data = giornoScelto ?? oggiLogico();
      if (s.completamenti.some((c) => c.taskId === taskId && c.data === data)) return; // una volta al giorno

      // Combo: task fatte di fila oggi, con meno di un'ora tra l'una e l'altra. Dalla terza i punti valgono di più.
      const ts = Date.now();
      const oggiC = s.completamenti.filter((c) => c.data === data).sort((a, b) => a.ts - b.ts);
      let catena = 1;
      let riferimento = ts;
      for (let i = oggiC.length - 1; i >= 0; i--) {
        if (riferimento - oggiC[i].ts > COMBO_PAUSA_MS) break;
        catena++;
        riferimento = oggiC[i].ts;
      }
      const moltiplicatore = catena >= COMBO_MINIMO ? MOLTIPLICATORE_COMBO : 1;
      const punti = Math.round((puntiBase ?? (minima ? puntiMinima(t.punti) : t.punti)) * moltiplicatore);
      const bonus = Math.random() < 0.1 ? 5 + Math.floor(Math.random() * 11) : 0; // colpo di fortuna
      const durata = minuti ?? (minima ? t.minimaMin : t.durataMin) ?? 0;
      const stanza = t.tipo === "stanza" ? stanzaDelGiorno(s.stanze, s.completamenti, t.id, data).stanza : null;
      const id = nuovoId();
      const nuova: Completamento = { id, taskId, data, minuti: durata, minima, punti, bonus, combo: catena, ts, ...(stanza ? { nota: stanza } : {}) };
      const completamenti = [...s.completamenti, nuova];
      const dopoS = { ...s, completamenti };

      const feste: Festa[] = [];
      const nuoviBonus: Bonus[] = [];
      if (catena === 3 || catena === 5 || catena === 7) {
        feste.push({ id: nuovoId(), tipo: "combo", titolo: `${catena} Task completate!`, testo: "Stai andando a razzo!", xp: 0 });
      }
      // Record personale di task fatte in un giorno
      const perGiorno = new Map<string, number>();
      for (const c of completamenti) perGiorno.set(c.data, (perGiorno.get(c.data) ?? 0) + 1);
      const oggiN = perGiorno.get(data) ?? 0;
      let maxPrima = 0;
      for (const [d, n] of perGiorno) if (d !== data && n > maxPrima) maxPrima = n;
      if (oggiN >= 3 && maxPrima > 0 && oggiN > maxPrima) {
        feste.push({ id: nuovoId(), tipo: "record", titolo: "NUOVO RECORD", testo: `${oggiN} task in un giorno: mai così tante.`, xp: 0 });
      }
      // Forziere: l'ultima task del giorno lo apre (una volta al giorno), con una ricompensa a sorpresa
      const g = giornata(dopoS, data);
      if (g.previste.length > 0 && g.fatte.length === g.previste.length && !s.bonus.some((b) => b.tipo === "forziere" && b.data === data)) {
        const dentro = dentroForziere(s.aree);
        nuoviBonus.push({ id: nuovoId(), data, xp: dentro.xp, tipo: "forziere", testo: dentro.testo, da: id });
        feste.push({ id: nuovoId(), tipo: "forziere", titolo: "ECCELLENTE!!", testo: dentro.testo, xp: dentro.xp });
      }
      // Boss della settimana: sconfitto quando le task fatte arrivano a quelle previste
      const boss = bossSettimana(dopoS, data);
      if (boss.sconfitto && !s.bonus.some((b) => b.tipo === "boss" && b.data >= inizioSettimana(data))) {
        nuoviBonus.push({ id: nuovoId(), data, xp: 100, tipo: "boss", testo: "Boss della settimana sconfitto", da: id });
        feste.push({ id: nuovoId(), tipo: "boss", titolo: "BOSS SCONFITTO", testo: "Hai fatto tutte le task della settimana. +100 XP", xp: 100 });
      }

      const prima = livello(xpTotali(s.completamenti, s.bonus));
      const dopo = livello(xpTotali(completamenti, [...s.bonus, ...nuoviBonus]));

      // Il seguito (es. lavatrice -> «stendi il bucato» dopo 4 ore): si apre da solo, con la sua notifica
      const spec = specSeguito(t);
      const seguito = spec ? creaSeguito(t, spec, id, ts) : null;
      aggiorna((x) => ({
        ...x,
        completamenti: [...x.completamenti, nuova],
        bonus: [...x.bonus, ...nuoviBonus],
        timer: x.timer?.taskId === taskId ? null : x.timer,
        ...(seguito ? { task: [...x.task, seguito.task], momenti: [...x.momenti, seguito.momento] } : {}),
      }));
      if (feste.length) setFesta((f) => [...f, ...feste]);
      setRicompensa({
        id: nuovoId(),
        completamentoId: id,
        titolo: stanza ? `Sistema ${stanza}` : t.titolo,
        punti,
        bonus,
        frase: s.aree.find((a) => a.id === t.areaId)?.frase ?? "",
        nuovoLivello: dopo.indice > prima.indice ? dopo.nome : null,
        daTimer: !!daTimer,
        moltiplicatore,
      });
    },
    [aggiorna],
  );

  const valore = useMemo<Contesto>(
    () => ({
      pronto,
      stato,
      oggi,
      adesso,
      xp: xpTotali(stato.completamenti, stato.bonus),
      completa,
      annulla: (cid) => {
        // si tolgono anche i bonus (forziere, boss) che quella task aveva fatto scattare
        aggiorna((x) => {
          const seguiti = x.task.filter((t) => t.seguitoDa === cid).map((t) => t.id); // anche il seguito aperto da quel completamento sparisce
          return {
            ...x,
            completamenti: x.completamenti.filter((c) => c.id !== cid),
            bonus: x.bonus.filter((b) => b.da !== cid),
            task: x.task.filter((t) => t.seguitoDa !== cid),
            momenti: x.momenti.filter((m) => !seguiti.includes(m.taskId)),
          };
        });
        setRicompensa(null);
        setFesta([]);
      },
      salvaTask: (t) =>
        aggiorna((x) => ({
          ...x,
          task: x.task.some((y) => y.id === t.id) ? x.task.map((y) => (y.id === t.id ? t : y)) : [...x.task, t],
        }), true),
      eliminaTask: (id) => aggiorna((x) => ({ ...x, task: x.task.filter((t) => t.id !== id) }), true),
      impostazioni: (p) => aggiorna((x) => ({ ...x, impostazioni: { ...x.impostazioni, ...p } })),
      setFrase: (areaId, frase) =>
        aggiorna((x) => ({ ...x, aree: x.aree.map((a) => (a.id === areaId ? { ...a, frase } : a)) })),
      apriTimer: (taskId, minima, durataMin) =>
        aggiorna((x) => ({
          ...x,
          timer: { taskId, minima, inizio: null, durataSec: durataMin * 60, pausaInizio: null, pausaTotale: 0 },
        })),
      partiTimer: () =>
        aggiorna((x) => (x.timer && x.timer.inizio === null ? { ...x, timer: { ...x.timer, inizio: Date.now() } } : x)),
      pausaTimer: () =>
        aggiorna((x) => (x.timer && x.timer.inizio !== null && !x.timer.pausaInizio ? { ...x, timer: { ...x.timer, pausaInizio: Date.now() } } : x)),
      riprendiTimer: () =>
        aggiorna((x) =>
          x.timer?.pausaInizio
            ? { ...x, timer: { ...x.timer, pausaTotale: x.timer.pausaTotale + (Date.now() - x.timer.pausaInizio), pausaInizio: null } }
            : x,
        ),
      fermaTimer: () => aggiorna((x) => ({ ...x, timer: null })),
      // Reset: tempo pieno e timer fermo, pronto a ripartire con Start.
      resettaTimer: () =>
        aggiorna((x) => (x.timer ? { ...x, timer: { ...x.timer, inizio: null, pausaInizio: null, pausaTotale: 0 } } : x)),
      ignoraOggi: (taskId) =>
        aggiorna((x) => ({
          ...x,
          ignorati: [...x.ignorati.filter((i) => !(i.taskId === taskId && i.data === oggiLogico())), { taskId, data: oggiLogico() }],
          rinvii: x.rinvii.filter((r) => !(r.taskId === taskId && r.data === oggiLogico())),
        })),
      ripristina: (taskId) =>
        aggiorna((x) => ({ ...x, ignorati: x.ignorati.filter((i) => !(i.taskId === taskId && i.data === oggiLogico())) })),
      rimanda: (taskId, alle) =>
        aggiorna((x) => ({
          ...x,
          rinvii: [...x.rinvii.filter((r) => !(r.taskId === taskId && r.data === oggiLogico())), { taskId, data: oggiLogico(), alle }],
        })),
      annullaRinvio: (taskId) =>
        aggiorna((x) => ({ ...x, rinvii: x.rinvii.filter((r) => !(r.taskId === taskId && r.data === oggiLogico())) })),
      impostaMomento: (taskId, momento) =>
        aggiorna((x) => ({
          ...x,
          momenti: [...x.momenti.filter((m) => !(m.taskId === taskId && m.data === oggiLogico())), ...(momento ? [{ taskId, data: oggiLogico(), ...momento }] : [])],
        })),
      // Un giorno del piano automatico: acceso = lo fissi tu; spento = lo togli (l'app non lo propone più)
      sistemaGiornoAuto: (taskId, data, attivo) =>
        aggiorna((x) => ({
          ...x,
          pianoAuto: [
            ...x.pianoAuto.filter((v) => !(v.taskId === taskId && v.data === data && v.tipo !== "auto")),
            { taskId, data, tipo: attivo ? "fissato" : "escluso" },
          ],
        }), true),
      // Torna tutto automatico: si dimenticano i giorni fissati e tolti da oggi in poi
      ricalcolaPiano: (taskId) =>
        aggiorna((x) => ({ ...x, pianoAuto: x.pianoAuto.filter((v) => !(v.taskId === taskId && v.tipo !== "auto" && v.data >= oggiLogico())) }), true),
      // La proposta scelta nel popup: quei giorni diventano «fissati» (restano come li hai scelti); il resto lo continua a decidere l'app
      fissaGiorniAuto: (taskId, date) =>
        aggiorna((x) => ({
          ...x,
          pianoAuto: [
            ...x.pianoAuto.filter((v) => !(v.taskId === taskId && v.tipo !== "auto" && v.data >= oggiLogico())),
            ...date.map((data) => ({ taskId, data, tipo: "fissato" as const })),
          ],
        }), true),
      // Un cambio di piano fatto da solo: lo confermi (il piano nuovo resta) oppure tieni il giorno di prima, se si può (diventa un giorno fissato)
      confermaCambioPiano: (id) => aggiorna((x) => confermaCambio(x, id, oggiLogico())),
      tieniGiornoPiano: (id) => {
        const c = ref.current.cambiPiano?.find((x) => x.id === id);
        if (!c || !c.tieniPossibile) return;
        const oggi0 = oggiLogico();
        const date = [...new Set([...ref.current.pianoAuto.filter((v) => v.taskId === c.taskId && v.tipo !== "escluso" && v.data >= oggi0 && v.data !== c.a).map((v) => v.data), c.da])];
        aggiorna((x) => ({
          ...x,
          pianoAuto: [...x.pianoAuto.filter((v) => !(v.taskId === c.taskId && v.tipo !== "auto" && v.data >= oggi0)), ...date.map((data) => ({ taskId: c.taskId, data, tipo: "fissato" as const }))],
        })); // senza «conferma»: gli altri cambi ancora da confermare restano
      },
      setStanze: (stanze) => aggiorna((x) => ({ ...x, stanze })),
      setVacanza: (vacanza) => aggiorna((x) => ({ ...x, vacanza })),
      salvaEvento: (e) =>
        aggiorna((x) => ({ ...x, eventi: x.eventi.some((y) => y.id === e.id) ? x.eventi.map((y) => (y.id === e.id ? e : y)) : [...x.eventi, e] })),
      eliminaEvento: (id) => aggiorna((x) => ({ ...x, eventi: x.eventi.filter((e) => e.id !== id) })),
      salvaModifiche: (nuove, testo) => {
        const sostituite = ref.current.modifiche.filter((m) => nuove.some((n) => n.data === m.data));
        aggiorna((x) => ({ ...x, modifiche: [...x.modifiche.filter((m) => !nuove.some((n) => n.data === m.data)), ...nuove] }));
        setAvviso({ id: Date.now().toString(36), testo, data: nuove[0]?.data ?? oggiLogico(), rimuovi: nuove.map((n) => n.id), ripristina: sostituite });
      },
      annullaModifiche: (ids) =>
        aggiorna((x) => {
          const gruppi = new Set(x.modifiche.filter((m) => ids.includes(m.id) && m.gruppo).map((m) => m.gruppo));
          return { ...x, modifiche: x.modifiche.filter((m) => !ids.includes(m.id) && !(m.gruppo && gruppi.has(m.gruppo))) };
        }),
      avviso,
      annullaAvviso: () => {
        if (!avviso) return;
        aggiorna((x) => ({ ...x, modifiche: [...x.modifiche.filter((m) => !avviso.rimuovi.includes(m.id)), ...avviso.ripristina] }));
        setAvviso(null);
      },
      chiudiAvviso: () => setAvviso(null),
      festa,
      chiudiFesta: () => setFesta((f) => f.slice(1)),
      impostaSettimana: (p) => aggiorna((x) => ({ ...x, settimana: { programmata: null, obiettivi: [], liberoFatto: null, ...x.settimana, ...p } })),
      sbloccaTraguardi: (livelli, feste) => {
        aggiorna((x) => ({ ...x, traguardi: livelli }));
        if (feste.length) setFesta((f) => [...f, ...feste]);
      },
      segnaEvento: (id, fatto) => aggiorna((x) => ({ ...x, eventi: x.eventi.map((e) => (e.id === id ? { ...e, fatto } : e)) })),
      azzera: () => {
        aggiorna(() => statoIniziale());
        setRicompensa(null);
      },
      ricompensa,
      chiudiRicompensa: () => setRicompensa(null),
    }),
    [stato, pronto, oggi, adesso, ricompensa, avviso, festa, completa, aggiorna],
  );

  return <Ctx.Provider value={valore}>{children}</Ctx.Provider>;
}
