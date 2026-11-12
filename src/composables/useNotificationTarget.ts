import { useRouter } from "vue-router";
import { useTaskUi } from "@/composables/useTaskUi";

/** What a notification (inbox row or tapped push) points at. */
export interface NotificationTarget {
  task_id?: number | string | null;
  path?: string | null;
}

/** Opens a notification's target: the task sheet when there is a task, else the screen it names. */
export function useNotificationTarget() {
  const router = useRouter();
  const taskUi = useTaskUi();

  return (target: NotificationTarget): void => {
    const taskId = Number(target.task_id);
    if (Number.isFinite(taskId) && taskId > 0) {
      taskUi.openTask(taskId);
      return;
    }
    if (target.path && target.path.startsWith("/")) void router.push(target.path);
  };
}
