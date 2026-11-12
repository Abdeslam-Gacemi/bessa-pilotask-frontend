import { computed, ref, shallowRef, watch, type Ref } from "vue";
import { tryOnScopeDispose } from "@vueuse/core";
import { Capacitor } from "@capacitor/core";

/**
 * One stack for every sheet, dialog and popover.
 *
 * - The last opened sits on top (its z-index grows with the stack), so a
 *   confirmation opened from a sheet always shows above that sheet.
 * - Back (Android button or browser back) closes the top overlay instead of
 *   leaving the screen. In browsers each open overlay adds a history entry;
 *   closing it another way consumes that entry again.
 */
interface Entry {
  id: number;
  close: () => void;
  pushed: boolean;
}

// shallowRef + new arrays: entries stay plain objects, so identity checks work
// (a deep ref would hand back proxies, and `proxy !== entry` left closed overlays in the stack).
const stack = shallowRef<Entry[]>([]);
const BASE_Z = 1000;
const native = Capacitor.isNativePlatform();
let nextId = 1;
let ignoredPops = 0;
let listening = false;

function listen(): void {
  if (listening || native || typeof window === "undefined") return;
  listening = true;
  window.addEventListener("popstate", () => {
    if (ignoredPops > 0) {
      ignoredPops--;
      return;
    }
    const top = stack.value[stack.value.length - 1];
    if (top && (window.history.state as { ptOverlay?: number } | null)?.ptOverlay !== top.id) {
      top.pushed = false;
      top.close();
    }
  });
}

export function useOverlay(open: Ref<boolean>, close: () => void = () => (open.value = false)) {
  listen();
  let entry: Entry | null = null;
  const depth = ref(0);

  function push(): void {
    entry = { id: nextId++, close, pushed: false };
    stack.value = [...stack.value, entry];
    depth.value = stack.value.length;
    if (!native) {
      window.history.pushState({ ...(window.history.state ?? {}), ptOverlay: entry.id }, "");
      entry.pushed = true;
    }
  }

  function pop(): void {
    if (!entry) return;
    const id = entry.id;
    stack.value = stack.value.filter((e) => e.id !== id);
    if (entry.pushed && (window.history.state as { ptOverlay?: number } | null)?.ptOverlay === entry.id) {
      ignoredPops++;
      window.history.back();
    }
    entry = null;
  }

  watch(open, (value) => (value ? push() : pop()), { immediate: true });
  tryOnScopeDispose(pop);

  return {
    /** Backdrop z-index; the panel uses zIndex + 1. */
    zIndex: computed(() => BASE_Z + depth.value * 10),
    isTop: computed(() => {
      const top = stack.value[stack.value.length - 1];
      return open.value && top !== undefined && top.id === entry?.id;
    }),
  };
}

/** Closes the top overlay; false when none is open. */
export function closeTopmostOverlay(): boolean {
  const top = stack.value[stack.value.length - 1];
  if (!top) return false;
  top.close();
  // Never keep a dead entry: if close() did not flip the open ref, back must still move on next time.
  stack.value = stack.value.filter((e) => e.id !== top.id);
  return true;
}

/** Closes everything (used when the route changes). History entries are left alone. */
export function closeAllOverlays(): void {
  [...stack.value].reverse().forEach((entry) => {
    entry.pushed = false;
    entry.close();
  });
  stack.value = [];
}

export const hasOpenOverlay = computed(() => stack.value.length > 0);
