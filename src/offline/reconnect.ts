import { watch } from "vue";
import { http } from "@/api/client";
import { isOffline } from "./connectivity";

const PROBE_EVERY_MS = 15_000;

/** One light request: any answer from the API puts the app back online (see the client's interceptors). */
export async function probeApi(): Promise<void> {
  await http.get("/meta", { timeout: 8_000 }).catch(() => undefined);
}

/**
 * While the API looks unreachable but the phone says it has a network (Wi-Fi
 * without internet, a weak signal), checks again now and then, so the app
 * comes back by itself. Nothing runs while the phone is plainly offline.
 */
export function watchReconnection(): () => void {
  let timer: number | undefined;
  const stop = watch(
    isOffline,
    (offline) => {
      window.clearInterval(timer);
      if (offline) timer = window.setInterval(() => navigator.onLine && void probeApi(), PROBE_EVERY_MS);
    },
    { immediate: true },
  );
  return () => {
    stop();
    window.clearInterval(timer);
  };
}
