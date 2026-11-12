import { createI18n } from "vue-i18n";
import fr from "@/locales/fr.json";
import en from "@/locales/en.json";
import ar from "@/locales/ar.json";
import type { Locale } from "@/types/models";

export type MessageSchema = typeof fr;

export const SUPPORTED_LOCALES: Locale[] = ["fr", "en", "ar"];

function initialLocale(): Locale {
  try {
    const saved = localStorage.getItem("pt.locale") as Locale | null;
    if (saved && SUPPORTED_LOCALES.includes(saved)) return saved;
  } catch {
    /* storage unavailable */
  }
  return "fr";
}

export const i18n = createI18n<[MessageSchema], Locale, false>({
  legacy: false,
  locale: initialLocale(),
  fallbackLocale: "fr",
  messages: { fr, en, ar },
  // Arabic has no "one | many" split in our strings: always take the single form.
  pluralRules: { ar: () => 0 },
});

/** "→" in left-to-right languages, "←" in Arabic: for "from → to" text built in code. */
export function flowArrow(): string {
  return i18n.global.locale.value === "ar" ? "←" : "→";
}
