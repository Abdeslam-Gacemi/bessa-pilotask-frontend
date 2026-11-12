<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { ComputerIcon, Moon02Icon, Settings02Icon, Sun03Icon } from "@hugeicons/core-free-icons";
import LocaleSwitch from "@/components/brand/LocaleSwitch.vue";
import PtIcon from "@/components/ui/PtIcon.vue";
import { usePreferencesStore } from "@/stores/preferences";
import type { ThemePreference } from "@/types/models";

/** Bottom of the desktop sidebar: settings link, theme (light / dark / system) and language. */
const prefs = usePreferencesStore();
const { t } = useI18n();

const themes = computed(() => [
  { value: "light" as ThemePreference, label: t("settings.themes.light"), icon: Sun03Icon },
  { value: "dark" as ThemePreference, label: t("settings.themes.dark"), icon: Moon02Icon },
  { value: "system" as ThemePreference, label: t("settings.themes.system"), icon: ComputerIcon },
]);
</script>

<template>
  <div class="flex flex-col gap-2">
    <RouterLink
      to="/settings"
      class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted transition hover:bg-surface-3 hover:text-fg"
      active-class="!bg-ink !text-on-ink"
    >
      <PtIcon :icon="Settings02Icon" :size="19" />
      {{ $t("nav.settings") }}
    </RouterLink>
    <div class="flex items-center gap-2 px-1">
      <div class="flex flex-1 rounded-full border border-line bg-surface-2 p-0.5" role="radiogroup" :aria-label="$t('settings.theme')">
        <button
          v-for="theme in themes"
          :key="theme.value"
          type="button"
          role="radio"
          :aria-checked="prefs.theme === theme.value"
          :aria-label="theme.label"
          :title="theme.label"
          class="grid h-8 flex-1 place-items-center rounded-full transition active:scale-95"
          :class="prefs.theme === theme.value ? 'bg-ink text-on-ink shadow-soft' : 'text-muted hover:text-fg'"
          @click="prefs.theme = theme.value"
        >
          <PtIcon :icon="theme.icon" :size="16" />
        </button>
      </div>
      <LocaleSwitch compact />
    </div>
  </div>
</template>
