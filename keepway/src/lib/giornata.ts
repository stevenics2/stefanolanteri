import { giornoEffettivo } from "./calendario";
import { finestreLibere, hhmm, impegniGiorno } from "./sonno";

// Il riassunto di un giorno: che turno, quando ci si sveglia e si va a letto, quanto tempo libero resta.
export type RiepilogoGiorno = {
  etichetta: string; // "Turno 3", "Doppio turno 2+3", "Riposo", "Ferie"
  orario: string; // "13:00–19:00" (vuoto se riposo)
  riposo: boolean;
  codici: string[];
  noto: boolean; // false = fuori dal calendario importato
  sveglia: string | null;
  aLetto: string | null;
  liberoMin: number;
  straordinario?: { orari: string[] }; // doppio turno per straordinario: gli orari uno sotto l'altro, in ordine
};

export function riepilogoGiorno(data: string): RiepilogoGiorno {
  const g = giornoEffettivo(data);
  const impegni = impegniGiorno(data);
  const sonni = impegni.filter((i) => i.tipo === "sonno");
  const svegliaItem = sonni.find((s) => s.a < 1440);
  const lettoItem = [...sonni].reverse().find((s) => !s.daIeri && s.da > 0);
  const liberoMin = finestreLibere(data, 8 * 60, 22 * 60 + 30, 30).reduce((t, f) => t + (f.a - f.da), 0);

  let etichetta = "Giorno senza turni noti";
  if (g) {
    if (g.modifica?.tipo === "assenza") etichetta = g.etichetta.split(" ")[0].charAt(0) + g.etichetta.split(" ")[0].slice(1).toLowerCase();
    else if (g.riposo) etichetta = "Riposo";
    else etichetta = g.codici.length > 1 ? `Doppio turno ${g.codici.join("+")}` : `Turno ${g.codici[0]}`;
  }
  return {
    etichetta,
    orario: g?.orario ?? "",
    riposo: !g || g.riposo,
    codici: g?.codici ?? [],
    noto: !!g,
    sveglia: svegliaItem ? hhmm(svegliaItem.a) : null,
    aLetto: lettoItem ? hhmm(lettoItem.da) : null,
    liberoMin,
    straordinario: g?.straordinario,
  };
}

// Il colore del giorno (il puntino nella striscia dei giorni).
export function coloreGiorno(r: RiepilogoGiorno): string {
  if (!r.noto) return "#64748b";
  if (r.riposo) return "#94a3b8";
  const c = r.codici;
  if (c.length > 1) return "#f43f5e";
  return ({ "1": "#6366f1", "2": "#eab308", "3": "#f97316", "4": "#a855f7" } as Record<string, string>)[c[0]] ?? "#64748b";
}

export const oreMin = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? ` ${String(m % 60).padStart(2, "0")}m` : ""}` : `${m} min`);
