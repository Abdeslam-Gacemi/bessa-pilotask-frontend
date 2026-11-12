import { PRIORITY_WEIGHT } from "@/domain/tasks";
import type { Task } from "@/types/models";

/** How a task list is ordered: "manual" keeps the board's own order (drag & drop). */
export type SortKey = "manual" | "priority" | "due_at" | "start_at";

export interface TaskSort {
  key: SortKey;
  desc: boolean;
}

export const SORT_KEYS: SortKey[] = ["manual", "priority", "due_at", "start_at"];

const value = (task: Task, key: SortKey): number | null => {
  switch (key) {
    case "priority":
      return PRIORITY_WEIGHT[task.priority];
    case "due_at":
      return task.due_at ? Date.parse(task.due_at) : null;
    case "start_at":
      return task.start_at ? Date.parse(task.start_at) : null;
    default:
      return null;
  }
};

/**
 * Sorted copy (stable). Tasks without the value (no date) always go last,
 * whatever the direction; ties keep the board order.
 */
export function sortTasks(tasks: Task[], sort: TaskSort): Task[] {
  if (sort.key === "manual") return tasks;
  const dir = sort.desc ? -1 : 1;
  return tasks
    .map((task, index) => ({ task, index, v: value(task, sort.key) }))
    .sort((a, b) => {
      if (a.v === null || b.v === null) return a.v === b.v ? a.index - b.index : a.v === null ? 1 : -1;
      return (a.v - b.v) * dir || a.index - b.index;
    })
    .map((x) => x.task);
}
