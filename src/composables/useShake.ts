import { onMounted, onUnmounted, type Ref } from "vue";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";

type MotionPermission = { requestPermission?: () => Promise<"granted" | "denied"> };

/**
 * Calls `onShake` when the phone is shaken: a few sharp jolts within half a
 * second, then a cooldown so one shake opens one thing. iOS asks for motion
 * access; the request is made on the first tap anywhere (it needs a gesture).
 *
 * On Android, the DeviceMotionEvent sensor can go dormant when the WebView
 * is behind a dialog. The listener is re-registered on Capacitor `resume`
 * (app comes to foreground) and when the sensor appears to have gone silent.
 */
export function useShake(onShake: () => void, enabled: Ref<boolean>, { threshold = 18, jolts = 2, span = 800, cooldown = 1500 } = {}) {
  let last: { x: number; y: number; z: number } | null = null;
  let hits: number[] = [];
  let quietUntil = 0;

  function onMotion(event: DeviceMotionEvent): void {
    const a = event.accelerationIncludingGravity ?? event.acceleration;
    if (!enabled.value || !a || a.x === null || a.y === null || a.z === null) return;
    const now = Date.now();
    if (last) {
      const delta = Math.abs(a.x - last.x) + Math.abs(a.y - last.y) + Math.abs(a.z - last.z);
      if (delta > threshold && now > quietUntil) {
        hits = [...hits.filter((t) => now - t < span), now];
        if (hits.length >= jolts) {
          hits = [];
          quietUntil = now + cooldown;
          last = null;
          onShake();
        }
      }
    }
    last = { x: a.x, y: a.y, z: a.z };
  }

  async function askOnce(): Promise<void> {
    window.removeEventListener("pointerdown", askOnce);
    const api = (globalThis.DeviceMotionEvent as unknown as MotionPermission | undefined)?.requestPermission;
    if (api) await api().catch(() => "denied");
  }

  function reRegister(): void {
    window.removeEventListener("devicemotion", onMotion);
    last = null;
    hits = [];
    window.addEventListener("devicemotion", onMotion);
  }

  let resumeHandle: { remove: () => Promise<void> } | undefined;

  onMounted(() => {
    if (typeof window === "undefined" || !("DeviceMotionEvent" in window)) return;
    window.addEventListener("devicemotion", onMotion);
    window.addEventListener("pointerdown", askOnce, { once: true });

    if (Capacitor.isNativePlatform()) {
      void App.addListener("resume", reRegister).then((h) => { resumeHandle = h; });
    }
  });

  onUnmounted(() => {
    window.removeEventListener("devicemotion", onMotion);
    window.removeEventListener("pointerdown", askOnce);
    void resumeHandle?.remove();
  });
}
