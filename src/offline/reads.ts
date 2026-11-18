import { ref } from "vue";
import { ApiError } from "@/api/client";
import { i18n } from "@/plugins/i18n";
import type { Comment, Task } from "@/types/models";
import { isOffline, keepsOfflineCopy, markUnreachable } from "./connectivity";
import { OfflineSync, type OfflineScope } from "./OfflineSync";

/** True once a screen shows data from the phone's copy instead of the API. */
export const servedFromCopy = ref(false);

/**
 * Reads through the API, or from the phone's copy when there is no network:
 * at once when the phone knows it is offline (no 20-second wait for a
 * timeout), or after a request failed for lack of network.
 */
export async function readThrough<T>(online: () => Promise<T>, offline: () => Promise<T | null>): Promise<T> {
  if (!keepsOfflineCopy) return online();
  if (!isOffline.value) {
    try {
      const value = await online();
      servedFromCopy.value = false;
      return value;
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 0 || error.cancelled) throw error;
      markUnreachable();
    }
  }
  const copy = await offline().catch(() => null);
  if (copy === null) throw new ApiError(i18n.global.t("offline.notKept"), 0);
  servedFromCopy.value = true;
  return copy;
}

const parse = <T>(result: { json?: string }): T | null => (result.json ? (JSON.parse(result.json) as T) : null);

/** Nothing can be changed from the copy: the screens hide their actions on their own. */
const READ_ONLY_TASK: NonNullable<Task["can"]> = { update: false, move: false, delete: false, comment: false, observers: false };
const readOnlyTask = (task: Task): Task => ({ ...task, can: READ_ONLY_TASK });
const readOnlyComment = (comment: Comment): Comment => ({ ...comment, can: { update: false, delete: false } });

export const offlineCopy = {
  async tasks(scope: OfflineScope, search?: string): Promise<Task[] | null> {
    return parse<Task[]>(await OfflineSync.listTasks({ scope, search }))?.map(readOnlyTask) ?? null;
  },
  async task(id: number): Promise<Task | null> {
    const task = parse<Task>(await OfflineSync.getTask({ id }));
    return task && readOnlyTask(task);
  },
  async comments(taskId: number): Promise<Comment[] | null> {
    // A task the copy holds always has a (maybe empty) comment list.
    return (parse<Comment[]>(await OfflineSync.listComments({ taskId })) ?? []).map(readOnlyComment);
  },
  async document<T>(key: "me" | "meta" | "labels" | "projects"): Promise<T | null> {
    return parse<T>(await OfflineSync.getDocument({ key }));
  },
};
