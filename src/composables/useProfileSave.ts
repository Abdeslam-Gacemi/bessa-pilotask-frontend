import { ref } from "vue";
import { useDebounceFn } from "@vueuse/core";
import { authApi } from "@/api/endpoints";
import { useApiError } from "./useApiError";
import { useSessionStore } from "@/stores/session";

/**
 * Saves profile fields in the background (theme, language, alert switches).
 * `saving` stays true from the moment a (debounced) save is queued until the
 * request settles, so screens can show a "Saving…" indicator.
 */
export function useProfileSave() {
  const session = useSessionStore();
  const errors = useApiError();
  const saving = ref(false);

  const save = async (payload: Record<string, unknown> | FormData) => {
    saving.value = true;
    try {
      session.setUser(await authApi.updateProfile(payload));
      return true;
    } catch (error) {
      errors.report(error);
      return false;
    } finally {
      saving.value = false;
    }
  };

  const debounced = useDebounceFn(save, 400);
  const saveSoon = (payload: Record<string, unknown> | FormData) => {
    saving.value = true;
    return debounced(payload);
  };

  return { save, saveSoon, saving };
}
