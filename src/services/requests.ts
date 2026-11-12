import axios from "axios";

/**
 * Every request a view starts is tracked here, so signing out (or a 401)
 * can abort whatever is still in flight.
 */
const inFlight = new Set<AbortController>();

export function trackController(controller: AbortController): () => void {
  inFlight.add(controller);
  return () => inFlight.delete(controller);
}

export function cancelAllRequests(): void {
  inFlight.forEach((controller) => controller.abort());
  inFlight.clear();
}

export const isCancelled = (error: unknown): boolean =>
  axios.isCancel(error) || (error instanceof Error && (error.name === "CanceledError" || error.name === "AbortError")) ||
  (typeof error === "object" && error !== null && (error as { cancelled?: boolean }).cancelled === true);
