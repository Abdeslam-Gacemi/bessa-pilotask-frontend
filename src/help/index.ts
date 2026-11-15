import type { Locale } from "@/types/models";
import type { HelpAudience, HelpBlock, HelpContent, HelpSection } from "./types";

/** Each language is its own chunk, loaded when the help page opens in it. */
const loaders: Record<Locale, () => Promise<{ default: HelpContent }>> = {
  fr: () => import("./fr"),
  en: () => import("./en"),
  ar: () => import("./ar"),
};

export async function loadHelp(locale: Locale): Promise<HelpContent> {
  return (await (loaders[locale] ?? loaders.fr)()).default;
}

/** Lower case, accents and Arabic diacritics removed: "Échéance" matches "echeance". */
export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ًͯ-ٰٟ]/g, "")
    .replace(/\*\*/g, "")
    .toLowerCase();
}

function blockText(block: HelpBlock): string {
  return "text" in block ? block.text : block.items.join(" ");
}

/** Which audiences the reader belongs to (from their role and the projects they manage). */
export type HelpReader = Record<HelpAudience, boolean>;

/** Articles for everyone plus those of the reader's audiences; sections left empty go. */
export function forReader(content: HelpContent, reader: HelpReader): HelpSection[] {
  return content
    .map((section) => ({ ...section, articles: section.articles.filter((a) => !a.audience || reader[a.audience]) }))
    .filter((section) => section.articles.length > 0);
}

export function articleCount(sections: HelpSection[]): number {
  return sections.reduce((n, s) => n + s.articles.length, 0);
}

/** Sections keeping only the articles matching every word of the query (all of them when it is empty). */
export function searchHelp(content: HelpContent, query: string): HelpSection[] {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (!words.length) return content;

  return content
    .map((section) => ({
      ...section,
      articles: section.articles.filter((article) => {
        const haystack = normalize([section.title, article.title, ...article.blocks.map(blockText)].join(" "));
        return words.every((word) => haystack.includes(word));
      }),
    }))
    .filter((section) => section.articles.length > 0);
}

/** "Plain **bold** text" → segments, rendered without v-html. */
export function segments(text: string): { text: string; bold: boolean }[] {
  return text
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((part) => (part.startsWith("**") && part.endsWith("**") ? { text: part.slice(2, -2), bold: true } : { text: part, bold: false }));
}
