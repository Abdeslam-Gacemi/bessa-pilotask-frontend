import { ref } from "vue";
import { uniqueId } from "lodash-es";
import { haptics } from "@/services/haptics";

export interface Toast {
  id: string;
  message: string;
  tone: "neutral" | "success" | "danger";
  action?: { label: string; run: () => void };
}

const toasts = ref<Toast[]>([]);

/** Short, non-blocking feedback at the bottom of the screen. */
export function useToast() {
  function show(message: string, tone: Toast["tone"] = "neutral", action?: Toast["action"], duration = 3500): void {
    const toast: Toast = { id: uniqueId("toast-"), message, tone, action };
    toasts.value.push(toast);
    window.setTimeout(() => dismiss(toast.id), duration);
  }

  function dismiss(id: string): void {
    toasts.value = toasts.value.filter((t) => t.id !== id);
  }

  return {
    toasts,
    dismiss,
    show,
    success: (message: string, action?: Toast["action"]) => show(message, "success", action),
    error: (message: string) => {
      haptics.error();
      show(message, "danger", undefined, 5000);
    },
  };
}
