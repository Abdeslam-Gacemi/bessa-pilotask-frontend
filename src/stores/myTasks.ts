import { defineStore } from "pinia";
import { ref } from "vue";
import { tasksApi } from "@/api/endpoints";

/** Count of my open tasks (assigned + shared), shown as a badge on "My tasks". */
export const useMyTasksStore = defineStore("myTasks", () => {
  const count = ref(0);

  async function refresh(): Promise<void> {
    try {
      count.value = (await tasksApi.mineCount()).count;
    } catch {
      /* keep the last known count on a transient error */
    }
  }

  function reset(): void {
    count.value = 0;
  }

  return { count, refresh, reset };
});
