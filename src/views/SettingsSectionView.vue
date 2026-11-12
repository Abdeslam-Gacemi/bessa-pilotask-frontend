<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import PtIconButton from "@/components/ui/PtIconButton.vue";
import NotificationSettings from "@/components/settings/NotificationSettings.vue";
import SecuritySettings from "@/components/settings/SecuritySettings.vue";
import ReportSettings from "@/components/settings/ReportSettings.vue";
import AccessSettings from "@/components/settings/AccessSettings.vue";

export type SettingsSection = "notifications" | "security" | "reports" | "access";

/** One settings section on its own screen, with a back button to the hub. */
const props = defineProps<{ section: SettingsSection }>();
const router = useRouter();
const { t } = useI18n();

const VIEWS = {
  notifications: NotificationSettings,
  security: SecuritySettings,
  reports: ReportSettings,
  access: AccessSettings,
};
// Section keys don't all match a plain string ("settings.reports" holds the frequency labels).
const TITLES: Record<SettingsSection, string> = {
  notifications: "settings.notifications",
  security: "settings.security",
  reports: "settings.reportsTitle",
  access: "settings.access",
};
const title = computed(() => t(TITLES[props.section]));

function back(): void {
  if (window.history.state?.back) router.back();
  else void router.replace("/settings");
}
</script>

<template>
  <div class="mx-auto flex w-full max-w-2xl flex-col gap-6">
    <header v-stagger="0" class="flex items-center gap-3">
      <PtIconButton :icon="ArrowLeft01Icon" :label="$t('common.back')" variant="surface" class="rtl:rotate-180" @click="back" />
      <h1 class="text-2xl font-bold">{{ title }}</h1>
    </header>
    <component :is="VIEWS[section]" />
  </div>
</template>
