import axios, { AxiosError } from "axios";
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
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers["Accept-Language"] = document.documentElement.lang || "fr";
  return config;
});

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
  (response) => response,
  (error: AxiosError<{ message?: string; errors?: Record<string, string[]> }>) => {
    if (axios.isCancel(error)) return Promise.reject(new ApiError("cancelled", 0, {}, true));
    const status = error.response?.status ?? 0;
    const apiError = new ApiError(error.response?.data?.message ?? error.message, status, error.response?.data?.errors ?? {});
    if (status === 401) unauthorizedListeners.forEach((listener) => listener(apiError));
    return Promise.reject(apiError);
  },
);
