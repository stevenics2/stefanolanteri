// Vibrazione al tocco.
// Android: la vibrazione normale. iPhone: Safari non la permette, ma un interruttore (checkbox con
// attributo "switch") dà un leggero tocco quando viene premuto: lo si usa di nascosto.
let etichetta: HTMLLabelElement | null = null;

export function vibra(ms = 12) {
  try {
    if ("vibrate" in navigator && navigator.vibrate(ms)) return;
    if (!etichetta) {
      etichetta = document.createElement("label");
      etichetta.setAttribute("aria-hidden", "true");
      etichetta.style.display = "none";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.setAttribute("switch", "");
      etichetta.appendChild(input);
      document.head.appendChild(etichetta);
    }
    etichetta.click();
  } catch {
    // il telefono non lo supporta: pazienza
  }
}
