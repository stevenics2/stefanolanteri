import roster from "@/data/roster.json";

// Quante task proporre in un dato giorno, in base al turno di quella data.
//   normale   -> tutte le task del giorno
//   essenziale-> solo le task essenziali (versione minima)
//   nessuna   -> nessuna task (giorno di recupero)
export type Carico = "normale" | "essenziale" | "nessuna";

const perData = new Map((roster as { d: string; t: string }[]).map((g) => [g.d, g.t]));

export function caricoGiorno(data: string): Carico {
  const turno = perData.get(data);
  if (turno === "1 + 4") return "nessuna"; // notte + sera
  if (turno === "1") return "essenziale"; // dopo la notte
  // Il turno 2 prima di una notte NON è pesante: dalle 18 all'1 sei in forma (palestra compresa).
  return "normale";
}

// "riposo" = RD o R; "lavoro" = tutti gli altri turni; "sconosciuto" = data fuori dal calendario importato.
export function tipoGiorno(data: string): "lavoro" | "riposo" | "sconosciuto" {
  const t = perData.get(data);
  if (t === undefined) return "sconosciuto";
  return t === "RD" || t === "R" ? "riposo" : "lavoro";
}
