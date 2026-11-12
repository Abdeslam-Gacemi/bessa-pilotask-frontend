import { ref } from "vue";
import { i18n } from "@/plugins/i18n";
import { haptics } from "@/services/haptics";

export type ConfirmTone = "primary" | "danger" | "warning";

interface ConfirmRequest {
  title: string;
  message?: string;
  confirmLabel?: string;
  /** Shorthand for tone "danger" (kept for existing callers). */
  danger?: boolean;
  tone?: ConfirmTone;
  /** Which kind of action is confirmed; picks the dialog's icon. */
  action?: ConfirmAction;
  /**
   * Work to do once confirmed. The dialog stays open with a spinner on its
   * button until it finishes; a failure closes it and rejects the promise.
   */
  run?: () => Promise<unknown>;
  resolve: (ok: boolean) => void;
  reject?: (error: unknown) => void;
}

export type ConfirmAction = "create" | "update" | "delete" | "archive" | "unarchive" | "logout";
export type ConfirmEntity = "task" | "project" | "board" | "user" | "label" | "status" | "comment" | "password" | "entity";

const TONES: Record<ConfirmAction, ConfirmTone> = {
  create: "primary",
  update: "primary",
  delete: "danger",
  archive: "warning",
  unarchive: "primary",
  logout: "danger",
};

const pending = ref<ConfirmRequest | null>(null);
const busy = ref(false);

/** A promise-based confirmation dialog: `if (await confirm({...})) …`. */
export function useConfirm() {
  function confirm(options: Omit<ConfirmRequest, "resolve" | "reject">): Promise<boolean> {
    if (options.danger || options.tone === "danger") haptics.warning();
    return new Promise((resolve, reject) => {
      pending.value = { ...options, resolve, reject };
    });
  }

  /** The standard question for a create / update / delete / archive / sign-out action. */
  function confirmAction(action: ConfirmAction, entity?: ConfirmEntity, name?: string, run?: () => Promise<unknown>): Promise<boolean> {
    const t = i18n.global.t;
    const subject = entity ? t(`confirm.entities.${entity}`) : "";
    return confirm({
      title: t(`confirm.${action}.title`, { entity: subject }),
      message: name || action === "logout" ? t(`confirm.${action}.message`, { name: name ?? "" }) : undefined,
      confirmLabel: t(`confirm.${action}.button`),
      tone: TONES[action],
      action,
      run,
    });
  }

  async function settle(ok: boolean): Promise<void> {
    const request = pending.value;
    if (!request || busy.value) return;
    if (ok && request.run) {
      busy.value = true;
      try {
        await request.run();
      } catch (error) {
        pending.value = null;
        request.reject?.(error);
        return;
      } finally {
        busy.value = false;
      }
    }
    pending.value = null;
    request.resolve(ok);
  }

  return { pending, busy, confirm, confirmAction, settle };
}
