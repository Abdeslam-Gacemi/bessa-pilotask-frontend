import { defineStore } from "pinia";
import { computed, ref, watch } from "vue";
import { usePreferredDark } from "@vueuse/core";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import { i18n } from "@/plugins/i18n";
import { dayjs } from "@/plugins/dayjs";
import type { Locale, ThemePreference } from "@/types/models";

function read<T extends string>(key: string, fallback: T): T {
  try {
    return (localStorage.getItem(key) as T | null) ?? fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage unavailable */
  }
}

/** Theme and language, applied to the document and remembered on this device. */
export const usePreferencesStore = defineStore("preferences", () => {
  const theme = ref<ThemePreference>(read("pt.theme", "system"));
  const locale = ref<Locale>(read("pt.locale", "fr"));
  const systemDark = usePreferredDark();

  const isDark = computed(() => theme.value === "dark" || (theme.value === "system" && systemDark.value));
  const isRtl = computed(() => locale.value === "ar");

  watch(
    isDark,
    (dark) => {
      // Swap all colours in one frame: without this every transition animates and the switch flickers.
      const root = document.documentElement;
      root.classList.add("pt-theme-switching");
      root.classList.toggle("dark", dark);
      requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove("pt-theme-switching")));
      document.querySelector('meta[name="theme-color"]:not([media])')?.setAttribute("content", dark ? "#0E1215" : "#F3F2EE");
      if (Capacitor.isNativePlatform()) {
        StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light }).catch(() => undefined);
        StatusBar.setBackgroundColor({ color: dark ? "#0E1215" : "#F3F2EE" }).catch(() => undefined);
      }
    },
    { immediate: true },
  );

  watch(
    locale,
    (value) => {
      i18n.global.locale.value = value;
      dayjs.locale(value);
      document.documentElement.lang = value;
      document.documentElement.dir = value === "ar" ? "rtl" : "ltr";
      write("pt.locale", value);
    },
    { immediate: true },
  );

  watch(theme, (value) => write("pt.theme", value));

  return { theme, locale, isDark, isRtl };
});
