import { suono } from "./effetti";

// Chiede conferma prima di annullare una modifica ai turni; se si conferma, suona la scala che scende.
// Restituisce true solo se si deve annullare davvero.
export function confermaAnnulla(testo: string, suoni: boolean): boolean {
  if (!confirm(testo)) return false;
  if (suoni) suono("scalaGiu");
  return true;
}
