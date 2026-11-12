import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { dayjs } from "@/plugins/dayjs";

/** Locale-aware date helpers; recomputes when the language changes. */
export function useDates() {
  const { t, locale } = useI18n();

  const fmt = computed(() => {
    void locale.value; // re-evaluate on language change
    return {
      day: (value: string | Date) => dayjs(value).format("D MMM"),
      dayLong: (value: string | Date) => dayjs(value).format("dddd D MMMM"),
      dateTime: (value: string | Date) => dayjs(value).format("D MMM YYYY · HH:mm"),
      time: (value: string | Date) => dayjs(value).format("HH:mm"),
      relative: (value: string | Date) => dayjs(value).fromNow(),
      monthYear: (value: string | Date) => dayjs(value).format("MMMM YYYY"),
    };
  });

  /** "Today", "Tomorrow", "12 Mar"… for a deadline chip. */
  function dueLabel(value: string | null): string {
    if (!value) return t("tasks.noDue");
    const due = dayjs(value);
    if (due.isSame(dayjs(), "day")) return `${t("dates.dueToday")} · ${due.format("HH:mm")}`;
    if (due.isSame(dayjs().add(1, "day"), "day")) return `${t("dates.dueTomorrow")} · ${due.format("HH:mm")}`;
    return due.format(due.isSame(dayjs(), "year") ? "D MMM" : "D MMM YYYY");
  }

  /** Converts an ISO value to the `datetime-local` input format and back. */
  const toInput = (value: string | null) => (value ? dayjs(value).format("YYYY-MM-DDTHH:mm") : "");
  const fromInput = (value: string) => (value ? dayjs(value).toISOString() : null);

  return { fmt, dueLabel, toInput, fromInput, dayjs };
}
