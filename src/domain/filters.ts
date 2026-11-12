import { reactive } from "vue";
import { dayjs } from "@/plugins/dayjs";
import type { Priority, Project, Task } from "@/types/models";

/** Inclusive day range, as `YYYY-MM-DD` strings ("" = open end). */
export interface DayRange {
  from: string;
  to: string;
}

export interface TaskFilters {
  start: DayRange;
  due: DayRange;
  priorities: Priority[];
  labelIds: number[];
  userIds: number[];
  projectIds: number[];
  entityIds: number[];
}

export type ProjectState = "notStarted" | "inProgress" | "completed";

export interface ProjectFilters {
  archived: boolean;
  start: DayRange;
  end: DayRange;
  states: ProjectState[];
  memberIds: number[];
  entityIds: number[];
}

const emptyRange = (): DayRange => ({ from: "", to: "" });

export const emptyTaskFilters = (): TaskFilters => ({
  start: emptyRange(),
  due: emptyRange(),
  priorities: [],
  labelIds: [],
  userIds: [],
  projectIds: [],
  entityIds: [],
});

export const emptyProjectFilters = (): ProjectFilters => ({
  archived: false,
  start: emptyRange(),
  end: emptyRange(),
  states: [],
  memberIds: [],
  entityIds: [],
});

/** Reactive filters plus a reset that keeps the same object (bindings stay live). */
export function useFilters<T extends object>(make: () => T) {
  const filters = reactive(make()) as T;
  const reset = () => Object.assign(filters, make());
  return { filters, reset };
}

const rangeSet = (r: DayRange) => Boolean(r.from || r.to);

/** A dated value inside the range; with a range set, undated values never match. */
export function inRange(value: string | null | undefined, range: DayRange): boolean {
  if (!rangeSet(range)) return true;
  if (!value) return false;
  const day = dayjs(value).format("YYYY-MM-DD");
  return (!range.from || day >= range.from) && (!range.to || day <= range.to);
}

/** How many filter groups are active (for the button badge). */
export function countTaskFilters(f: TaskFilters): number {
  return [rangeSet(f.start), rangeSet(f.due), f.priorities.length, f.labelIds.length, f.userIds.length, f.projectIds.length, f.entityIds.length].filter(Boolean).length;
}

export function countProjectFilters(f: ProjectFilters): number {
  return [f.archived, rangeSet(f.start), rangeSet(f.end), f.states.length, f.memberIds.length, f.entityIds.length].filter(Boolean).length;
}

/**
 * `boardProject` maps a table id to its project id (project filter);
 * `projectEntity` maps a project id to its entity id (entity filter, null = global).
 */
export function matchTask(
  task: Task,
  f: TaskFilters,
  boardProject?: (boardId: number) => number | undefined,
  projectEntity?: (projectId: number) => number | null | undefined,
): boolean {
  if (!inRange(task.start_at, f.start) || !inRange(task.due_at, f.due)) return false;
  if (f.priorities.length && !f.priorities.includes(task.priority)) return false;
  if (f.labelIds.length && !task.labels?.some((l) => f.labelIds.includes(l.id))) return false;
  if (f.userIds.length && !task.assignees?.some((u) => f.userIds.includes(u.id))) return false;
  if (f.projectIds.length) {
    const projectId = task.board?.project_id ?? boardProject?.(task.board_id);
    if (projectId === undefined || !f.projectIds.includes(projectId)) return false;
  }
  if (f.entityIds.length) {
    const projectId = task.board?.project_id ?? boardProject?.(task.board_id);
    const entityId = projectId === undefined ? undefined : projectEntity?.(projectId);
    if (entityId === undefined || entityId === null || !f.entityIds.includes(entityId)) return false;
  }
  return true;
}

export function projectState(p: Project): ProjectState {
  const total = p.tasks_count ?? 0;
  const done = p.done_count ?? 0;
  if (total > 0 && done >= total) return "completed";
  return done > 0 ? "inProgress" : "notStarted";
}

export function matchProject(p: Project, f: ProjectFilters): boolean {
  if (!inRange(p.starts_on, f.start) || !inRange(p.ends_on, f.end)) return false;
  if (f.states.length && !f.states.includes(projectState(p))) return false;
  if (f.memberIds.length && !p.members?.some((m) => f.memberIds.includes(m.id))) return false;
  if (f.entityIds.length && (p.entity_id == null || !f.entityIds.includes(p.entity_id))) return false;
  return true;
}

/** Distinct people, by id, sorted by name. */
export function uniqueUsers<U extends { id: number; name: string }>(lists: (U[] | undefined)[]): U[] {
  const map = new Map<number, U>();
  for (const list of lists) for (const u of list ?? []) map.set(u.id, u);
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}
