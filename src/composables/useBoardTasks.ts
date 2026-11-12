import { computed, ref, type Ref } from "vue";
import { useRequest } from "./useRequest";
import { cloneDeep } from "lodash-es";
import { tasksApi } from "@/api/endpoints";
import { byPosition } from "@/domain/tasks";
import type { Status, Task } from "@/types/models";

/**
 * The tasks of one table, grouped by status. Moves are optimistic: the board
 * updates at once and rolls back if the server refuses.
 */
export function useBoardTasks(boardId: Ref<number>, statuses: Ref<Status[]>) {
  const tasks = ref<Task[]>([]);
  const request = useRequest();
  const loading = request.loading;

  /** Loads the table's tasks; a newer call (or leaving the screen) cancels the previous one. */
  async function load(filters: Record<string, unknown> = {}): Promise<void> {
    const result = await request.run((signal) => tasksApi.list({ board_id: boardId.value, ...filters }, { signal }));
    if (result) tasks.value = result;
  }

  /** Column contents, in display order. Arrays are fresh copies for the drag library. */
  const columns = computed(() =>
    statuses.value.map((status) => ({
      status,
      tasks: tasks.value.filter((t) => t.status_id === status.id).sort(byPosition),
    })),
  );

  /** Applies a column's new order locally (positions 0…n) for a given status. */
  function applyColumn(statusId: number, ordered: Task[]): void {
    const status = statuses.value.find((s) => s.id === statusId);
    ordered.forEach((task, index) => {
      const local = tasks.value.find((t) => t.id === task.id);
      if (!local) return;
      local.position = index;
      local.status_id = statusId;
      if (status) local.status = status;
    });
  }

  /**
   * Moves a task to a column. With `index` null (a sorted or filtered view),
   * only the status changes: the task joins the end of the column's manual
   * order and nothing else is reordered.
   */
  async function move(task: Task, statusId: number, index: number | null, ordered: Task[]): Promise<Task> {
    const snapshot = cloneDeep(tasks.value);
    if (index === null) {
      const status = statuses.value.find((s) => s.id === statusId);
      tasks.value = tasks.value.map((t) =>
        t.id === task.id ? { ...t, status_id: statusId, status: status ?? t.status, position: Number.MAX_SAFE_INTEGER } : t,
      );
    } else {
      applyColumn(statusId, ordered);
    }
    try {
      const updated = await tasksApi.move(task.id, statusId, index ?? undefined);
      upsert(updated);
      return updated;
    } catch (error) {
      tasks.value = snapshot;
      throw error;
    }
  }

  function upsert(task: Task): void {
    const index = tasks.value.findIndex((t) => t.id === task.id);
    if (task.board_id !== boardId.value) {
      if (index !== -1) tasks.value.splice(index, 1);
      return;
    }
    if (index === -1) tasks.value.push(task);
    else tasks.value[index] = { ...tasks.value[index], ...task };
  }

  function remove(id: number): void {
    tasks.value = tasks.value.filter((t) => t.id !== id);
  }

  return { tasks, loading, columns, load, move, upsert, remove };
}
