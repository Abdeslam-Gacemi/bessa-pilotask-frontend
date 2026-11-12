import { useI18n } from "vue-i18n";
import { ApiError } from "@/api/client";
import { useToast } from "./useToast";
import { isCancelled } from "@/services/requests";

/**
 * Turns a failed request into a message fit for people. Server texts are
 * only shown for validation errors (422: written for users, in their
 * language); everything else gets our own wording, so a stack trace, SQL or
 * an English framework message never reaches the screen.
 */
export function useApiError() {
  const { t } = useI18n();
  const toast = useToast();

  function message(error: unknown): string {
    if (!(error instanceof ApiError)) return t("common.unknownError");
    const firstField = Object.values(error.fields)[0]?.[0];

    switch (true) {
      case error.status === 0:
        return t("errors.network");
      case error.status === 422:
        return firstField ?? t("errors.invalid");
      case error.status === 401:
        return t("errors.session");
      case error.status === 403:
        return t("errors.forbiddenAction");
      case error.status === 404:
        return t("errors.missing");
      case error.status === 409 || error.status === 419:
        return t("errors.conflict");
      case error.status === 413:
        return t("errors.tooLarge");
      case error.status === 429:
        return t("errors.tooMany");
      default:
        return t("errors.server");
    }
  }

  return {
    message,
    report: (error: unknown) => {
      if (!isCancelled(error)) toast.error(message(error));
    },
  };
}
