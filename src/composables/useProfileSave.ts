import { useDebounceFn } from "@vueuse/core";
import { authApi } from "@/api/endpoints";
import { useApiError } from "./useApiError";
import { useSessionStore } from "@/stores/session";

/** Saves profile fields in the background (theme, language, alert switches). */
export function useProfileSave() {
  const session = useSessionStore();
  const errors = useApiError();

  const save = async (payload: Record<string, unknown> | FormData) => {
    try {
      session.setUser(await authApi.updateProfile(payload));
      return true;
    } catch (error) {
      errors.report(error);
      return false;
    }
  };

  return { save, saveSoon: useDebounceFn(save, 400) };
}
