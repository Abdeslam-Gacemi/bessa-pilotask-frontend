<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { EyeIcon, SquareLock02Icon } from "@hugeicons/core-free-icons";
import PtIcon from "@/components/ui/PtIcon.vue";
import PtSkeleton from "@/components/ui/PtSkeleton.vue";
import PtSwitch from "@/components/ui/PtSwitch.vue";
import { settingsApi } from "@/api/endpoints";
import { useApiError } from "@/composables/useApiError";
import { useToast } from "@/composables/useToast";
import { useMetaStore } from "@/stores/meta";
import type { AccessSettings } from "@/types/models";

/** Super admins decide what simple users can see beyond their own tasks. */
const { t } = useI18n();
const errors = useApiError();
const toast = useToast();
const meta = useMetaStore();

const settings = ref<AccessSettings | null>(null);
const saving = ref(false);

async function set(key: keyof AccessSettings, value: boolean): Promise<void> {
  if (!settings.value) return;
  const previous = settings.value[key];
  settings.value = { ...settings.value, [key]: value };
  saving.value = true;
  try {
    settings.value = await settingsApi.updateAccess({ [key]: value });
    if (meta.meta) meta.meta.access = settings.value;
    toast.success(t("common.saved"));
  } catch (error) {
    settings.value = { ...settings.value, [key]: previous };
    errors.report(error);
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  try {
    settings.value = await settingsApi.access();
  } catch (error) {
    errors.report(error);
  }
});
</script>

<template>
  <div v-stagger="0" class="pt-card flex items-start gap-3.5 p-4">
    <span class="grid size-11 shrink-0 place-items-center rounded-2xl bg-danger-soft text-danger"><PtIcon :icon="SquareLock02Icon" :size="20" /></span>
    <div class="min-w-0 flex-1">
      <p class="text-sm font-semibold">{{ $t("settings.accessIntro") }}</p>
      <p class="mt-0.5 text-xs text-muted">{{ $t("settings.accessHint") }}</p>
    </div>
  </div>

  <section v-stagger="1" class="pt-card flex items-center gap-3.5 p-4">
    <span class="grid size-10 shrink-0 place-items-center rounded-2xl bg-surface-3"><PtIcon :icon="EyeIcon" :size="18" /></span>
    <PtSkeleton v-if="!settings" class="h-10 flex-1 rounded-xl" />
    <PtSwitch
      v-else
      class="flex-1"
      :model-value="settings.users_see_team_tasks"
      :disabled="saving"
      :label="$t('settings.teamTasks')"
      :hint="$t('settings.teamTasksHint')"
      @update:model-value="(v) => set('users_see_team_tasks', v)"
    />
  </section>
</template>
