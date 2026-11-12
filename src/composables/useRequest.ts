import { ref } from "vue";
import { tryOnScopeDispose } from "@vueuse/core";
import { isCancelled, trackController } from "@/services/requests";

/**
 * Runs a request the "latest wins" way: a new call aborts the previous one,
 * and leaving the component aborts whatever is still running. Cancelled
 * requests resolve to `undefined` and never reach error handling.
 */
export function useRequest() {
  const loading = ref(false);
  let controller: AbortController | null = null;
  let untrack: (() => void) | null = null;

  function cancel(): void {
    controller?.abort();
    untrack?.();
    controller = null;
  }

  async function run<T>(fn: (signal: AbortSignal) => Promise<T>): Promise<T | undefined> {
    cancel();
    const current = new AbortController();
    controller = current;
    untrack = trackController(current);
    loading.value = true;
    try {
      return await fn(current.signal);
    } catch (error) {
      if (isCancelled(error)) return undefined;
      throw error;
    } finally {
      if (controller === current) {
        loading.value = false;
        untrack?.();
        controller = null;
      }
    }
  }

  tryOnScopeDispose(cancel);

  return { run, loading, cancel };
}
