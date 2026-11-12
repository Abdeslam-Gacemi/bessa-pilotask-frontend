import { ref } from "vue";

/**
 * Tracks a pending request and scrolls to the first field error.
 * Pass `busy` to disable form/sheet while a request runs.
 */
export function useFormLock() {
  const busy = ref(false);

  async function run<T>(fn: () => Promise<T>): Promise<T | undefined> {
    if (busy.value) return;
    busy.value = true;
    try {
      return await fn();
    } finally {
      busy.value = false;
    }
  }

  /**
   * After field errors are set, call this to scroll the first one into view.
   * Pass the form/sheet element ref or leave undefined to search the document.
   */
  function scrollToFirstError(container?: HTMLElement | null): void {
    const root = container ?? document;
    requestAnimationFrame(() => {
      const el = (root as Document | HTMLElement).querySelector?.("[data-pt-field-error]") as HTMLElement | null;
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  return { busy, run, scrollToFirstError };
}
