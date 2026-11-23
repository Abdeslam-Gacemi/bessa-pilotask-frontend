<script setup lang="ts">
import { computed } from "vue";
import PtPopover from "@/components/ui/PtPopover.vue";
import PtMenuItem from "@/components/ui/PtMenuItem.vue";
import FlagIcon from "./FlagIcon.vue";
import { usePreferencesStore } from "@/stores/preferences";
import type { Locale } from "@/types/models";

/** Language picker with flags: a pill (or just the flag, `compact`) that opens the three choices. */
defineProps<{ compact?: boolean }>();
const prefs = usePreferencesStore();
const LANGUAGES: { value: Locale; label: string }[] = [
  { value: "fr", label: "Français" },
  { value: "en", label: "English" },
  { value: "ar", label: "العربية" },
];
const current = computed(() => LANGUAGES.find((l) => l.value === prefs.locale) ?? LANGUAGES[0]!);
</script>

<template>
  <PtPopover align="end" width="12rem">
    <template #trigger="{ toggle }">
      <button
        type="button"
        class="pt-chip shadow-soft"
        :class="compact ? 'size-9 justify-center p-0' : 'h-10 gap-2 ps-1.5 pe-3.5'"
        :aria-label="current.label"
        :title="current.label"
        @click="toggle"
      >
        <FlagIcon :locale="current.value" :size="compact ? 22 : 26" />
        <span v-if="!compact">{{ current.label }}</span>
      </button>
    </template>
    <template #default="{ close }">
      <PtMenuItem v-for="lang in LANGUAGES" :key="lang.value" :active="prefs.locale === lang.value" @click="(prefs.locale = lang.value), close()">
        <span class="flex items-center gap-2.5"><FlagIcon :locale="lang.value" :size="22" />{{ lang.label }}</span>
      </PtMenuItem>
    </template>
  </PtPopover>
</template>
