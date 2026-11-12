<script setup lang="ts">
import { ref } from "vue";
import { Calendar03Icon, Mail01Icon } from "@hugeicons/core-free-icons";
import PtIcon from "@/components/ui/PtIcon.vue";
import PtSwitch from "@/components/ui/PtSwitch.vue";
import { useProfileSave } from "@/composables/useProfileSave";
import { useSessionStore } from "@/stores/session";
import type { ReportFrequency, ReportPreferences } from "@/types/models";

/** Managers pick which summaries they get by email (sent at 17:00). */
const session = useSessionStore();
const { saveSoon } = useProfileSave();

const FREQUENCIES: ReportFrequency[] = ["daily", "weekly", "monthly"];
const preferences = ref<ReportPreferences>({ ...(session.user?.report_preferences ?? {}) });

function set(frequency: ReportFrequency, value: boolean): void {
  preferences.value = { ...preferences.value, [frequency]: value };
  void saveSoon({ report_preferences: preferences.value });
}
</script>

<template>
  <div v-stagger="0" class="pt-card flex items-start gap-3.5 p-4">
    <span class="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary"><PtIcon :icon="Mail01Icon" :size="20" /></span>
    <div class="min-w-0 flex-1">
      <p class="text-sm font-semibold">{{ $t("settings.reportsIntro") }}</p>
      <p class="mt-0.5 text-xs text-muted">{{ $t("settings.reportsHint", { email: session.user?.email ?? "" }) }}</p>
    </div>
  </div>

  <section class="pt-card divide-y divide-line/60 p-1.5">
    <div v-for="(frequency, i) in FREQUENCIES" :key="frequency" v-stagger="i + 1" class="flex items-center gap-3.5 px-3 py-3.5">
      <span class="grid size-10 shrink-0 place-items-center rounded-2xl bg-surface-3"><PtIcon :icon="Calendar03Icon" :size="18" /></span>
      <PtSwitch
        class="flex-1"
        :model-value="preferences[frequency] ?? false"
        :label="$t(`settings.reports.${frequency}`)"
        :hint="$t(`settings.reports.${frequency}Hint`)"
        @update:model-value="(v) => set(frequency, v)"
      />
    </div>
  </section>
</template>
