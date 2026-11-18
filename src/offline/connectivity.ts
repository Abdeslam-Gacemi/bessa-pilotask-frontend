import { computed, ref } from "vue";
import { Capacitor } from "@capacitor/core";

/**
 * Whether the API can be reached. The browser's own flag catches a phone in
 * airplane mode at once; a request failing for lack of network catches the
 * rest (Wi-Fi without internet, a dead zone on site). The first answer from
 * the API clears it.
 */
const deviceOnline = ref(typeof navigator === "undefined" ? true : navigator.onLine);
const apiReachable = ref(true);

if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    deviceOnline.value = true;
    apiReachable.value = true; // worth a try again
  });
  window.addEventListener("offline", () => (deviceOnline.value = false));
}

export const isOffline = computed(() => !deviceOnline.value || !apiReachable.value);

/** Only the Android app keeps a copy to read without network. */
export const keepsOfflineCopy = Capacitor.getPlatform() === "android";

export function markReachable(): void {
  apiReachable.value = true;
}

export function markUnreachable(): void {
  apiReachable.value = false;
}
