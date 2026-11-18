<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import NotificationSettings from "@/components/settings/NotificationSettings.vue";
import SecuritySettings from "@/components/settings/SecuritySettings.vue";
import ReportSettings from "@/components/settings/ReportSettings.vue";
import AccessSettings from "@/components/settings/AccessSettings.vue";
import OfflineSettings from "@/components/settings/OfflineSettings.vue";
import PtBackButton from "@/components/ui/PtBackButton.vue";

export type SettingsSection = "notifications" | "security" | "reports" | "access" | "offline";

/** One settings section on its own screen, with a back button to the hub. */
const props = defineProps<{ section: SettingsSection }>();
const { t } = useI18n();

const VIEWS = {
  notifications: NotificationSettings,
  security: SecuritySettings,
  reports: ReportSettings,
  access: AccessSettings,
  offline: OfflineSettings,
};
// Section keys don't all match a plain string ("settings.reports" holds the frequency labels).
const TITLES: Record<SettingsSection, string> = {
  notifications: "settings.notifications",
  security: "settings.security",
  reports: "settings.reportsTitle",
  access: "settings.access",
  offline: "offline.settingsTitle",
};
const title = computed(() => t(TITLES[props.section]));
</script>

<template>
  <div class="mx-auto flex w-full max-w-2xl flex-col gap-6">
    <header v-stagger="0" class="flex items-center gap-3">
      <PtBackButton />
      <h1 class="text-2xl font-bold">{{ title }}</h1>
    </header>
    <component :is="VIEWS[section]" />
  </div>
</template>
