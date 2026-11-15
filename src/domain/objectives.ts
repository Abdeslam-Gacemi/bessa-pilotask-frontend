import { dayjs } from "@/plugins/dayjs";
import type { Health, KeyResult, Signal } from "@/types/models";

/** Objectives: periods, health tones and the wording of figures and signals. */

export type PeriodKey = "q1" | "q2" | "q3" | "q4" | "s1" | "s2" | "year";

export interface Period {
  key: PeriodKey;
  year: number;
  from: string;
  to: string;
}

export function period(key: PeriodKey, year: number): Period {
  const start = dayjs(`${year}-01-01`);
  const [from, months] = {
    q1: [0, 3],
    q2: [3, 3],
    q3: [6, 3],
    q4: [9, 3],
    s1: [0, 6],
    s2: [6, 6],
    year: [0, 12],
  }[key] as [number, number];
  return {
    key,
    year,
    from: start.add(from, "month").format("YYYY-MM-DD"),
    to: start.add(from + months, "month").subtract(1, "day").format("YYYY-MM-DD"),
  };
}

export function currentQuarter(): Period {
  const now = dayjs();
  return period(`q${Math.floor(now.month() / 3) + 1}` as PeriodKey, now.year());
}

/** Semantic tone of a health, for chips, dots and bars. */
export const HEALTH_TONE: Record<Health, { text: string; bg: string; soft: string; color: string }> = {
  on_track: { text: "text-success", bg: "bg-success", soft: "bg-success-soft", color: "var(--pt-success)" },
  at_risk: { text: "text-warning", bg: "bg-warning", soft: "bg-warning-soft", color: "var(--pt-warning)" },
  off_track: { text: "text-danger", bg: "bg-danger", soft: "bg-danger-soft", color: "var(--pt-danger)" },
};

export const HEALTHS: Health[] = ["on_track", "at_risk", "off_track"];

type T = (key: string, named?: Record<string, unknown> | number, plural?: number) => string;

const number = (value: number | null | undefined) =>
  value === null || value === undefined ? "—" : Number.isInteger(value) ? String(value) : value.toFixed(1);

/** "18 / 24 tâches", "7 → 2 inc.", "Fait" — the measure in words. */
export function measure(kr: KeyResult, t: T): string {
  if (kr.type === "tasks") {
    const s = kr.insight?.tasks;
    return s ? t("objectives.measure.tasks", { done: s.done, total: s.total }) : "—";
  }
  if (kr.type === "milestone") return (kr.current_value ?? 0) >= 1 ? t("objectives.measure.done") : t("objectives.measure.pending");
  const unit = kr.unit ? ` ${kr.unit}` : "";
  return `${number(kr.current_value ?? kr.start_value)}${unit} → ${number(kr.target_value)}${unit}`;
}

export function signalText(signal: Signal, t: T): string {
  return t(`objectives.signals.${signal.code}`, { n: signal.value ?? 0 });
}

/** Pace gap in points: positive = ahead of plan. */
export function gap(progress: number, expected: number): number {
  return Math.round(progress - expected);
}
