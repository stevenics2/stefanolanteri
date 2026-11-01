// Quando il piano automatico cambia da solo (turno spostato, appuntamento nuovo...), non lo si fa in silenzio: si confronta con il piano
// che l'utente aveva già visto e, se un giorno è saltato, si crea un «cambio» con il motivo, da confermare. Le scelte dell'utente stesso
// (creare o modificare una task, accendere un giorno, fissare i giorni) aggiornano il piano visto senza avvisi.
import { analizzaGiorno } from "./allenamento";
import { dataPiù, GIORNI_LUNGHI, giornoSettimana, inizioSettimana } from "./date";
import type { CambioPiano, PianoVoce, Stato, Task } from "./tipi";

const nomeGiorno = (d: string) => `${GIORNI_LUNGHI[giornoSettimana(d)]} ${Number(d.slice(8))}`;
const maiuscola = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
export const giornoBreve = nomeGiorno;

// I giorni del piano: scelti dall'app o fissati dall'utente (quelli tolti non contano).
const soloAuto = (v: PianoVoce[], oggi: string): PianoVoce[] => v.filter((x) => x.tipo !== "escluso" && x.data >= oggi).map((x) => ({ taskId: x.taskId, data: x.data, tipo: x.tipo, da: x.da, a: x.a }));

function motivoDi(task: Task, giorno: string, stato: Stato): { motivo: string; tieniPossibile: boolean } {
  const a = analizzaGiorno(task, giorno, stato.eventi);
  if (a.slot === null) return { motivo: `${maiuscola(nomeGiorno(giorno))} non va più bene${a.motivo ? `: ${a.motivo}` : ""}.`, tieniPossibile: false };
  return { motivo: `Ora il piano preferisce un altro giorno (${nomeGiorno(giorno)} resta possibile, ma meno adatto).`, tieniPossibile: true };
}

// `conferma` = il cambiamento lo ha fatto l'utente: il piano nuovo diventa quello «visto».
export function rilevaCambi(s: Stato, oggi: string, conferma: boolean, nuovoId: () => string, adesso: number): Stato {
  const nuovo = soloAuto(s.pianoAuto, oggi);
  if (conferma || !s.pianoVisto) return { ...s, pianoVisto: nuovo, cambiPiano: conferma ? [] : (s.cambiPiano ?? []) };

  const visto = soloAuto(s.pianoVisto, oggi);
  const cambi: CambioPiano[] = [];
  const inSospeso = s.cambiPiano ?? [];
  let pianoVisto: PianoVoce[] = visto;

  for (const task of s.task) {
    if (!task.attiva) continue;
    const vecchi = visto.filter((v) => v.taskId === task.id).map((v) => v.data);
    const attuali = nuovo.filter((v) => v.taskId === task.id).map((v) => v.data);
    const fatti = new Set(s.completamenti.filter((c) => c.taskId === task.id).map((c) => c.data));
    const ignorati = new Set(s.ignorati.filter((i) => i.taskId === task.id).map((i) => i.data));
    const tolti = vecchi.filter((d) => !attuali.includes(d) && !fatti.has(d) && !ignorati.has(d));
    const aggiunti = attuali.filter((d) => !vecchi.includes(d));
    const ric = task.ricorrenza;

    // Cose che non sono un vero cambio: quota della settimana già raggiunta (auto), o task appena fatta (intervallo): il piano si rifà da solo.
    const silenzioso = (d: string) => {
      if (ric.tipo === "auto") {
        const lun = inizioSettimana(d);
        return [...fatti].filter((x) => inizioSettimana(x) === lun).length >= ric.volte; // la quota della settimana l'hai già fatta: gli altri giorni non servono più
      }
      if (ric.tipo === "intervallo") return fatti.has(oggi) || fatti.has(dataPiù(oggi, -1)); // l'hai appena fatta: le date successive si ricontano da lì
      return false;
    };

    const liberi = [...aggiunti];
    for (const d of tolti) {
      if (silenzioso(d)) continue;
      const nuovoGiorno = liberi.shift() ?? null;
      const { motivo, tieniPossibile } = motivoDi(task, d, s);
      const esistente = inSospeso.find((c) => c.taskId === task.id && c.da === d);
      cambi.push(esistente ? { ...esistente, a: nuovoGiorno, motivo, tieniPossibile } : { id: nuovoId(), taskId: task.id, da: d, a: nuovoGiorno, motivo, tieniPossibile, quando: adesso });
    }
    // i giorni senza un vero cambio si allineano in silenzio; quelli con un cambio restano come li hai visti finché non confermi
    const inCambio = new Set(cambi.filter((c) => c.taskId === task.id).map((c) => c.da));
    const mantenuti = vecchi.filter((d) => inCambio.has(d));
    const daAllineare = attuali.filter((d) => !cambi.some((c) => c.taskId === task.id && c.a === d));
    pianoVisto = [
      ...pianoVisto.filter((v) => v.taskId !== task.id),
      ...[...new Set([...mantenuti, ...daAllineare])].map((d): PianoVoce => ({ taskId: task.id, data: d, tipo: "auto" })),
    ];
  }
  return { ...s, pianoVisto, cambiPiano: cambi };
}

// L'utente conferma un cambio: il piano nuovo di quella task diventa quello visto.
export function confermaCambio(s: Stato, id: string, oggi: string): Stato {
  const c = (s.cambiPiano ?? []).find((x) => x.id === id);
  if (!c) return s;
  const nuovo = soloAuto(s.pianoAuto, oggi).filter((v) => v.taskId === c.taskId);
  return { ...s, cambiPiano: (s.cambiPiano ?? []).filter((x) => x.id !== id), pianoVisto: [...(s.pianoVisto ?? []).filter((v) => v.taskId !== c.taskId || (s.cambiPiano ?? []).some((x) => x.id !== id && x.taskId === c.taskId && x.da === v.data)), ...nuovo.filter((v) => !(s.cambiPiano ?? []).some((x) => x.id !== id && x.taskId === c.taskId && x.a === v.data))] };
}
