import { dayjs } from "@/plugins/dayjs";
import type { Dayjs } from "dayjs";
import type { Task } from "@/types/models";

/** The 6×7 grid of days shown for a month (weeks start on Monday). */
export function monthGrid(month: Dayjs): Dayjs[] {
  const start = month.startOf("month").startOf("isoWeek");
  return Array.from({ length: 42 }, (_, i) => start.add(i, "day"));
}

export function weekDays(anchor: Dayjs): Dayjs[] {
  const start = anchor.startOf("isoWeek");
  return Array.from({ length: 7 }, (_, i) => start.add(i, "day"));
}

/** A task appears on every day its [start, due] span covers (or on its single date). */
export function tasksOnDay(tasks: Task[], day: Dayjs): Task[] {
  return tasks.filter((task) => {
    const start = task.start_at ? dayjs(task.start_at) : null;
    const due = task.due_at ? dayjs(task.due_at) : null;
    if (start && due) return day.isBetween(start, due, "day", "[]");
    return (start ?? due)?.isSame(day, "day") ?? false;
  });
}
