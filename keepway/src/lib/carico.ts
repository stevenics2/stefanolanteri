import { giornoEffettivo } from "./calendario";

// Quante task proporre in un dato giorno, in base ai turni di quella data (modifiche comprese).
//   normale   -> tutte le task del giorno
//   essenziale-> solo le task essenziali
//   nessuna   -> nessuna task (giorno di recupero)
export type Carico = "normale" | "essenziale" | "nessuna";

export function caricoGiorno(data: string): Carico {
  const g = giornoEffettivo(data);
  if (!g) return "normale";
  const c = g.codici;
  if (c.includes("1") && c.includes("4")) return "nessuna"; // notte + sera
  if (c.includes("1")) return "essenziale"; // dopo la notte
  if (c.length >= 2) return "essenziale"; // doppio turno (2+3, 3+4...): 12 ore di fila
  if (g.modifica?.tipo === "assenza" && g.modifica.assenza === "malattia") return "essenziale";
  // Il turno 2 prima di una notte NON è pesante: dalle 18 all'1 sei in forma (palestra compresa).
  return "normale";
}

// "riposo" = nessun turno (riposo, ferie, malattia...); "lavoro" = c'è almeno un turno; "sconosciuto" = fuori dal calendario importato.
export function tipoGiorno(data: string): "lavoro" | "riposo" | "sconosciuto" {
  const g = giornoEffettivo(data);
  if (!g) return "sconosciuto";
  return g.riposo ? "riposo" : "lavoro";
}
