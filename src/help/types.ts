/**
 * Help content, one file per language (fr, en, ar) with the same ids, so
 * links (#tasks-assign) work in every language. Text is plain: `**bold**`
 * is the only markup (rendered without v-html).
 */

/**
 * Who an article is for. Readers see the articles of their role (and the
 * untagged ones); "show everything" lifts the filter.
 * - managers: admins and super admins;
 * - superAdmin: super admins only;
 * - projectManagers: admins and project managers (people who create and run tasks);
 * - workspace: admins and viewers (whole-entity readers);
 * - overview: anyone with analytics (admins, viewers, project managers).
 */
export type HelpAudience = "managers" | "superAdmin" | "projectManagers" | "workspace" | "overview";

export type HelpIconKey =
  | "start"
  | "projects"
  | "tasks"
  | "comments"
  | "calendar"
  | "analytics"
  | "admin"
  | "account"
  | "faq";

export type HelpBlock =
  | { type: "p"; text: string }
  | { type: "steps"; items: string[] }
  | { type: "list"; items: string[] }
  | { type: "tip"; text: string }
  | { type: "warning"; text: string };

export interface HelpArticle {
  /** Stable anchor, the same in every language. */
  id: string;
  title: string;
  audience?: HelpAudience;
  blocks: HelpBlock[];
}

export interface HelpSection {
  id: string;
  icon: HelpIconKey;
  title: string;
  summary: string;
  articles: HelpArticle[];
}

export type HelpContent = HelpSection[];
