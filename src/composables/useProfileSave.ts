import { watch } from "vue";
import { useDebounceFn } from "@vueuse/core";
import { authApi } from "@/api/endpoints";
import { isOffline } from "@/offline/connectivity";
import { useApiError } from "./useApiError";
import { useSessionStore } from "@/stores/session";

/**
 * Personal choices changed offline (theme, language): already applied on this
 * device, saved to the account as soon as the network is back. Later values
 * win, so only the last choice of each is sent.
 */
let pending: Record<string, unknown> = {};
let watching = false;

/** Saves profile fields in the background (theme, language, alert switches). */
export function useProfileSave() {
  const session = useSessionStore();
  const errors = useApiError();

  const send = async (payload: Record<string, unknown> | FormData) => {
    try {
      session.setUser(await authApi.updateProfile(payload));
      return true;
    } catch (error) {
      errors.report(error);
      return false;
    }
  };

  const save = async (payload: Record<string, unknown> | FormData) => {
    if (isOffline.value && !(payload instanceof FormData)) {
      Object.assign(pending, payload);
      return true;
    }
    return send(payload);
  };

  if (!watching) {
    watching = true;
    watch(isOffline, (offline) => {
      if (offline || !Object.keys(pending).length || !session.user) return;
      const payload = pending;
      pending = {};
      void send(payload);
    });
  }

  return { save, saveSoon: useDebounceFn(save, 400) };
}
