import { reactive } from "vue";
import { createEventHook } from "@vueuse/core";
import type { Board, Task } from "@/types/models";

/**
 * One task drawer and one task form for the whole app, opened from any view.
 * Views subscribe to `onChanged` to patch their lists without refetching.
 */
const state = reactive({
  drawerOpen: false,
  taskId: null as number | null,
  formOpen: false,
  formBoard: null as Board | null,
  formStatusId: null as number | null,
  formDue: null as string | null,
  chooserOpen: false,
  projectFormOpen: false,
  boardFormOpen: false,
});

const changed = createEventHook<{ type: "saved"; task: Task } | { type: "deleted"; id: number }>();

export function useTaskUi() {
  return {
    state,
    openTask(id: number): void {
      state.taskId = id;
      state.drawerOpen = true;
    },
    createTask(options: { board?: Board | null; statusId?: number | null; due?: string | null } = {}): void {
      state.formBoard = options.board ?? null;
      state.formStatusId = options.statusId ?? null;
      state.formDue = options.due ?? null;
      state.formOpen = true;
    },
    /** The "+" menu: task, table or project. */
    openCreate(): void {
      state.chooserOpen = true;
    },
    createProject(): void {
      state.projectFormOpen = true;
    },
    createBoard(): void {
      state.boardFormOpen = true;
    },
    onChanged: changed.on,
    notifySaved: (task: Task) => changed.trigger({ type: "saved", task }),
    notifyDeleted: (id: number) => changed.trigger({ type: "deleted", id }),
  };
}
