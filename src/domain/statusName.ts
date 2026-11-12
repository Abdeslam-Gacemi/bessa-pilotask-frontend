import fr from "@/locales/fr.json";
import en from "@/locales/en.json";
import ar from "@/locales/ar.json";
import { i18n } from "@/plugins/i18n";
import type { StatusCategory } from "@/types/models";

/**
 * Default statuses are created with stock names in their creator's language.
 * While a default status still has a stock name (in any language), show it in
 * the reader's language, so switching language updates it at once; a renamed
 * or custom status keeps its own name. Mirrors Status::displayName() on the API.
 */
const STOCK = new Set(
  [fr, en, ar].flatMap((messages) => Object.values(messages.statusCategory as Record<string, string>)).map((name) => name.trim().toLowerCase()),
);

export function statusName(status: { name: string; category?: StatusCategory | null; is_default?: boolean } | null | undefined): string {
  if (!status) return "";
  if (status.category && status.is_default !== false && STOCK.has(status.name.trim().toLowerCase())) {
    return i18n.global.t(`statusCategory.${status.category}`);
  }
  return status.name;
}
