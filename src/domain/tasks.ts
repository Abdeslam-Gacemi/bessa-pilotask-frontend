import type { Priority, StatusCategory, Task } from "@/types/models";

export const PRIORITIES: Priority[] = ["low", "medium", "high", "urgent"];
export const CATEGORIES: StatusCategory[] = ["todo", "in_progress", "done", "canceled"];

/** Soft background + strong foreground per priority, for chips. */
export const PRIORITY_STYLE: Record<Priority, { dot: string; chip: string }> = {
  low: { dot: "#8BA36B", chip: "bg-success-soft text-success" },
  medium: { dot: "#53AEFF", chip: "bg-primary-soft text-primary" },
  high: { dot: "#E8962E", chip: "bg-warning-soft text-warning" },
  urgent: { dot: "#E04047", chip: "bg-danger-soft text-danger" },
};

export const PRIORITY_WEIGHT: Record<Priority, number> = { low: 1, medium: 2, high: 3, urgent: 4 };

export function isClosed(category: StatusCategory | null | undefined): boolean {
  return category === "done" || category === "canceled";
}

/** The colour a task wears: its own, else its table's, else its status's. */
export function taskAccent(task: Task): string {
  return task.color ?? task.board?.color ?? task.status?.color ?? "#53AEFF";
}

/** Sorts within a column the way the server stores it. */
export const byPosition = (a: Task, b: Task) => a.position - b.position || a.id - b.id;
