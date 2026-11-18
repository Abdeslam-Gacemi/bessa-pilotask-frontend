import axios, { AxiosError } from "axios";
import { beginWrite } from "@/services/pendingWrites";
import { markReachable, markUnreachable } from "@/offline/connectivity";
import { i18n } from "@/plugins/i18n";
import { tokenStore } from "@/services/tokenStore";

/**
 * The one HTTP client. Adds the bearer token and language, and turns Laravel
 * errors into ApiError so views only deal with a message and field errors.
 */
export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:8000/api",
  headers: { Accept: "application/json" },
  timeout: 20_000,
});

http.interceptors.request.use((config) => {
  const write = !["get", "head", "options"].includes((config.method ?? "get").toLowerCase());
  // No network at all: say so at once instead of waiting for a timeout.
  if (write && typeof navigator !== "undefined" && !navigator.onLine) {
    return Promise.reject(new ApiError(i18n.global.t("offline.readOnly"), 0));
  }
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers["Accept-Language"] = document.documentElement.lang || "fr";
  // Writes keep open sheets and dialogs from being dismissed until they settle.
  if (write) {
    (config as WriteConfig).ptRelease = beginWrite();
  }
  return config;
});

type WriteConfig = { ptRelease?: () => void };

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly fields: Record<string, string[]> = {},
    /** The request was aborted on purpose (view left, newer request, sign-out). */
    public readonly cancelled = false,
  ) {
    super(message);
  }

  firstFieldError(field: string): string | undefined {
    return this.fields[field]?.[0];
  }
}

type Listener = (error: ApiError) => void;
const unauthorizedListeners = new Set<Listener>();

/** Lets the session store sign out when the token is rejected. */
export function onUnauthorized(listener: Listener): () => void {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
}

http.interceptors.response.use(
  (response) => {
    (response.config as WriteConfig).ptRelease?.();
    markReachable();
    return response;
  },
  (error: AxiosError<{ message?: string; errors?: Record<string, string[]> }>) => {
    (error.config as WriteConfig | undefined)?.ptRelease?.();
    if (axios.isCancel(error)) return Promise.reject(new ApiError("cancelled", 0, {}, true));
    const status = error.response?.status ?? 0;
    // No answer at all (not even an error page): the network, not the API.
    if (status === 0) markUnreachable();
    else markReachable();
    const apiError = new ApiError(error.response?.data?.message ?? error.message, status, error.response?.data?.errors ?? {});
    if (status === 401) unauthorizedListeners.forEach((listener) => listener(apiError));
    return Promise.reject(apiError);
  },
);
