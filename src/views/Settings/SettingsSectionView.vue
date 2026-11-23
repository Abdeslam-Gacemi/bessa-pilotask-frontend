<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import NotificationSettings from "@/components/Settings/NotificationSettings.vue";
import SecuritySettings from "@/components/Settings/SecuritySettings.vue";
import ReportSettings from "@/components/Settings/ReportSettings.vue";
import AccessSettings from "@/components/Settings/AccessSettings.vue";
import MentionSettings from "@/components/Settings/MentionSettings.vue";
import ApiKeySettings from "@/components/Settings/ApiKeySettings.vue";
import PtBackButton from "@/components/ui/PtBackButton.vue";

export type SettingsSection = "notifications" | "security" | "reports" | "access" | "mentions" | "apikeys";

/** One settings section on its own screen, with a back button to the hub. */
const props = defineProps<{ section: SettingsSection }>();
const { t } = useI18n();

const VIEWS = {
  notifications: NotificationSettings,
  security: SecuritySettings,
  reports: ReportSettings,
  access: AccessSettings,
  mentions: MentionSettings,
  apikeys: ApiKeySettings,
};
// Section keys don't all match a plain string ("settings.reports" holds the frequency labels).
const TITLES: Record<SettingsSection, string> = {
  notifications: "settings.notifications",
  security: "settings.security",
  reports: "settings.reportsTitle",
  access: "settings.access",
  mentions: "settings.mentionsTitle",
  apikeys: "apiKeys.title",
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
