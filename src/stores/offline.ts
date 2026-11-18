import { defineStore } from "pinia";
import { computed, ref, watch } from "vue";
import { App } from "@capacitor/app";
import type { PluginListenerHandle } from "@capacitor/core";
import { http } from "@/api/client";
import { isOffline, keepsOfflineCopy } from "@/offline/connectivity";
import { OfflineSync, type OfflineStatus } from "@/offline/OfflineSync";
import { tokenStore } from "@/services/tokenStore";
import type { User } from "@/types/models";

/** A sync on start, resume or reconnection is skipped if the copy is fresher than this. */
const FRESH_MS = 5 * 60_000;

/**
 * The phone's read-only copy: hands the background sync what it needs at
 * sign-in, refreshes it when the app comes back to the front or the network
 * returns, forgets it at sign-out. Does nothing outside the Android app.
 */
export const useOfflineStore = defineStore("offline", () => {
  const status = ref<OfflineStatus | null>(null);
  const available = keepsOfflineCopy;
  const lastSyncAt = computed(() => (status.value?.lastSuccessAt ? new Date(status.value.lastSuccessAt) : null));
  const syncing = computed(() => status.value?.syncing ?? false);

  let handles: PluginListenerHandle[] = [];
  let stopWatch: (() => void) | null = null;

  async function start(user: User, options: { syncNow?: boolean } = {}): Promise<void> {
    if (!available) return;
    const token = tokenStore.get();
    if (!token) return;
    status.value = await OfflineSync.configure({
      baseUrl: new URL(http.defaults.baseURL ?? "/api", window.location.origin).href,
      token,
      userId: user.id,
      language: document.documentElement.lang || "fr",
    });
    if (!handles.length) {
      handles = await Promise.all([
        OfflineSync.addListener("stateChange", (next) => (status.value = next)),
        App.addListener("resume", () => void refresh()),
      ]);
      // Back online: catch up with what changed meanwhile.
      stopWatch = watch(isOffline, (offline) => !offline && void refresh());
    }
    if (options.syncNow !== false) void refresh();
  }

  /** Syncs unless the copy is recent, or the phone is offline. */
  async function refresh(): Promise<void> {
    if (!available || isOffline.value || syncing.value) return;
    const last = status.value?.lastSuccessAt ?? 0;
    if (Date.now() - last < FRESH_MS) return;
    await syncNow();
  }

  /** Asked from the settings: whatever the freshness or the Wi-Fi setting. */
  async function syncNow(): Promise<OfflineStatus | null> {
    if (!available) return null;
    status.value = await OfflineSync.syncNow();
    return status.value;
  }

  async function setWifiOnly(value: boolean): Promise<void> {
    if (available) status.value = await OfflineSync.setWifiOnly({ value });
  }

  /** Sign-out: no copy of anyone's tasks stays on the phone. */
  async function stop(): Promise<void> {
    if (!available) return;
    await Promise.all(handles.map((handle) => handle.remove()));
    handles = [];
    stopWatch?.();
    stopWatch = null;
    status.value = await OfflineSync.clear();
  }

  async function loadStatus(): Promise<void> {
    if (available) status.value = await OfflineSync.getStatus();
  }

  return { status, available, lastSyncAt, syncing, start, refresh, syncNow, setWifiOnly, stop, loadStatus };
});
