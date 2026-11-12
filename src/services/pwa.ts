import { reactive } from "vue";
import { Capacitor } from "@capacitor/core";

/**
 * Installable web app (PWA): registers /sw.js in production builds and keeps
 * track of whether the browser can install Pilotask, so Settings can offer it.
 * Never active inside the Android / iOS app (Capacitor).
 */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const native = Capacitor.isNativePlatform();
const standalone =
  typeof window !== "undefined" &&
  (window.matchMedia?.("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);
const ios = typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);

export const install = reactive({
  /** The browser offered the install prompt (Chrome, Edge, Android). */
  canPrompt: false,
  /** Already running as an installed app. */
  installed: native || standalone,
  /** iOS Safari: installing is done by hand (Share → Add to Home Screen). */
  manualIos: !native && !standalone && ios,
});

let deferred: BeforeInstallPromptEvent | null = null;

if (typeof window !== "undefined" && !native) {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault(); // shown from Settings instead of the browser's mini bar
    deferred = event as BeforeInstallPromptEvent;
    install.canPrompt = true;
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    install.canPrompt = false;
    install.installed = true;
  });
}

/** Opens the browser's install dialog. Resolves true when the person accepted. */
export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  const event = deferred;
  deferred = null;
  install.canPrompt = false;
  await event.prompt();
  const { outcome } = await event.userChoice;
  return outcome === "accepted";
}

export function registerServiceWorker(): void {
  if (native || !import.meta.env.PROD || !("serviceWorker" in navigator) || !window.isSecureContext) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((error) => console.warn("Service worker registration failed", error));
  });
}
