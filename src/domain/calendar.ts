import { dayjs } from "@/plugins/dayjs";
import type { Dayjs } from "dayjs";
import type { Task } from "@/types/models";

/**
 * The Sunday that opens the week of `d`. day() is 0 (Sunday) … 6 (Saturday)
 * regardless of the active dayjs locale, so the week always starts on Sunday
 * (dayjs's own startOf("week") follows the locale: Monday in fr, Saturday in ar).
 */
export function startOfWeek(d: Dayjs): Dayjs {
  return d.subtract(d.day(), "day").startOf("day");
}

/** The Saturday that ends the week of `d`. */
export function endOfWeek(d: Dayjs): Dayjs {
  return startOfWeek(d).add(6, "day").endOf("day");
}

/** The 6×7 grid of days shown for a month (weeks start on Sunday). */
export function monthGrid(month: Dayjs): Dayjs[] {
  const start = startOfWeek(month.startOf("month"));
  return Array.from({ length: 42 }, (_, i) => start.add(i, "day"));
}

export function weekDays(anchor: Dayjs): Dayjs[] {
  const start = startOfWeek(anchor);
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
