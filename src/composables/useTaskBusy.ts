import { reactive } from "vue";

/**
 * Tasks with a save in flight (status change by drag & drop, checkbox, menu).
 * Shared by every screen, so the card or row shows a loading state wherever
 * the change started, and can't be changed again until it lands.
 */
const busy = reactive(new Set<number>());

export function isTaskBusy(id: number): boolean {
  return busy.has(id);
}

/** Marks the task busy while `work` runs (errors still reach the caller). */
export async function whileTaskBusy<T>(id: number, work: () => Promise<T>): Promise<T> {
  busy.add(id);
  try {
    return await work();
  } finally {
    busy.delete(id);
  }
}
