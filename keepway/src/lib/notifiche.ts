// Notifiche push: iscrizione del telefono e invio del piano al server (Cloudflare).
import type { Notifica } from "./piano";

const CHIAVE_DEVICE = "keepway.device";

// Un identificativo casuale per questo telefono: collega iscrizione e notifiche, senza account.
export function deviceId(): string {
  try {
    let id = localStorage.getItem(CHIAVE_DEVICE);
    if (!id) {
      id = crypto.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2, 12) + "-keepway";
      localStorage.setItem(CHIAVE_DEVICE, id);
    }
    return id;
  } catch {
    return "";
  }
}

export type StatoPush = "non_supportato" | "serve_home" | "bloccate" | "spente" | "attive";

const supportato = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
const èIphone = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const èInstallata = () => matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;

const keyInByte = (b64: string) => {
  const t = (b64 + "=".repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(t), (c) => c.charCodeAt(0));
};

async function chiama(path: string, method: string, body?: unknown) {
  const r = await fetch(path, { method, headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const dati = await r.json().catch(() => null);
  if (!r.ok) throw new Error(dati?.error ?? `Errore ${r.status}`);
  return dati;
}

export async function registraSW() {
  if (!("serviceWorker" in navigator)) return;
  try {
    await navigator.serviceWorker.register("/sw.js");
  } catch {
    // senza service worker niente notifiche, ma l'app funziona
  }
}

export async function statoPush(): Promise<StatoPush> {
  if (!supportato()) return èIphone() && !èInstallata() ? "serve_home" : "non_supportato";
  if (èIphone() && !èInstallata()) return "serve_home"; // su iPhone funzionano solo dall'app sulla Home
  if (Notification.permission === "denied") return "bloccate";
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (Notification.permission === "granted" && sub) return "attive";
  } catch {
    return "non_supportato";
  }
  return "spente";
}

// Chiede il permesso (il telefono mostra la sua domanda) e iscrive il telefono. Va chiamata da un tocco.
export async function attivaPush(): Promise<"ok" | "negato"> {
  const permesso = await Notification.requestPermission();
  if (permesso !== "granted") return "negato";
  const reg = await navigator.serviceWorker.ready;
  const { key } = await chiama("/api/push/key", "GET");
  const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyInByte(key) });
  await chiama("/api/push/subscribe", "POST", { deviceId: deviceId(), subscription: sub.toJSON() });
  return "ok";
}

export async function disattivaPush() {
  try {
    const reg = await navigator.serviceWorker.ready;
    await (await reg.pushManager.getSubscription())?.unsubscribe();
  } catch {
    // niente da togliere
  }
  await chiama("/api/push/unsubscribe", "POST", { deviceId: deviceId() }).catch(() => {});
}

export type EsitoProva = { ok: boolean; stato: number; dettaglio?: string };

export async function inviaProva(): Promise<EsitoProva> {
  return chiama("/api/push/test", "POST", { deviceId: deviceId() });
}

// Rimanda l'iscrizione al server (a volte il server la perde, o cambia): si fa una volta al giorno.
export async function riallineaIscrizione() {
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (sub) await chiama("/api/push/subscribe", "POST", { deviceId: deviceId(), subscription: sub.toJSON() });
}

export async function inviaPiano(items: Notifica[]) {
  await chiama("/api/piano", "PUT", { deviceId: deviceId(), items });
}
