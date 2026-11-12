import { dayjs } from "@/plugins/dayjs";
import type { Dayjs } from "dayjs";
import type { Task } from "@/types/models";

export interface TimelineBar {
  task: Task;
  /** Offset from the window start, in days (can be fractional). */
  offset: number;
  /** Length in days, at least half a day so single-date tasks stay visible. */
  span: number;
  clippedStart: boolean;
  clippedEnd: boolean;
}

/** Positions dated tasks inside a [from, from + days) window. */
export function timelineBars(tasks: Task[], from: Dayjs, days: number): TimelineBar[] {
  const windowEnd = from.add(days, "day");

  return tasks
    .filter((t) => t.start_at || t.due_at)
    .map((task) => {
      const start = dayjs(task.start_at ?? task.due_at);
      const end = dayjs(task.due_at ?? task.start_at);
      const s = start.isBefore(from) ? from : start;
      const e = end.isAfter(windowEnd) ? windowEnd : end;
      return {
        task,
        offset: s.diff(from, "hour") / 24,
        span: Math.max(0.5, e.diff(s, "hour") / 24),
        clippedStart: start.isBefore(from),
        clippedEnd: end.isAfter(windowEnd),
      };
    })
    .filter((bar) => bar.offset < days && bar.offset + bar.span > 0)
    .sort((a, b) => a.offset - b.offset);
}
