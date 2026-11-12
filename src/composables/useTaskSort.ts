import { computed } from "vue";
import { useLocalStorage } from "@vueuse/core";
import type { SortKey, TaskSort } from "@/domain/sort";

/** Remembered order for one screen (per device). Priority defaults to "most urgent first". */
export function useTaskSort(storageKey: string) {
  const sort = useLocalStorage<TaskSort>(`pt.sort.${storageKey}`, { key: "manual", desc: false }, { mergeDefaults: true });
  const active = computed(() => sort.value.key !== "manual");

  function pick(key: SortKey): void {
    // Sensible first direction: urgent first for priority, soonest first for dates.
    sort.value = { key, desc: key === "priority" ? true : key === sort.value.key ? sort.value.desc : false };
  }

  return { sort, active, pick };
}
