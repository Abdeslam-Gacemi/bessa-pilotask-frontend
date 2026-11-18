<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { AlertCircleIcon, Delete02Icon, RefreshIcon, SmartPhone01Icon } from "@hugeicons/core-free-icons";
import PtButton from "@/components/ui/PtButton.vue";
import PtIcon from "@/components/ui/PtIcon.vue";
import PtSwitch from "@/components/ui/PtSwitch.vue";
import { useConfirm } from "@/composables/useConfirm";
import { useDates } from "@/composables/useDates";
import { useToast } from "@/composables/useToast";
import { isOffline } from "@/offline/connectivity";
import { formatSize } from "@/services/uploads";
import { useOfflineStore } from "@/stores/offline";
import { useSessionStore } from "@/stores/session";

/** The phone's offline copy: how fresh it is, what it holds, and its few settings. */
const offline = useOfflineStore();
const session = useSessionStore();
const { t, locale } = useI18n();
const { fmt } = useDates();
const toast = useToast();
const { confirmAction } = useConfirm();

onMounted(() => void offline.loadStatus());

const status = computed(() => offline.status);
/** Null while the server has not said how much is coming (the bar then just moves). */
const percent = computed(() => {
  const progress = offline.progress;
  return progress && progress.total > 0 ? Math.min(100, Math.round((progress.done / progress.total) * 100)) : null;
});
const size = computed(() => formatSize(status.value?.bytes ?? 0, t("attachments.units").split(","), locale.value));
const state = computed<{ text: string; tone: string }>(() => {
  if (offline.syncing) return { text: t("offline.syncing"), tone: "text-primary" };
  if (status.value?.lastError && status.value.lastAttemptAt > status.value.lastSuccessAt) {
    return { text: t("offline.failed"), tone: "text-danger" };
  }
  if (offline.lastSyncAt) return { text: t("offline.syncedAgo", { when: fmt.value.relative(offline.lastSyncAt) }), tone: "text-success" };
  return { text: t("offline.never"), tone: "text-muted" };
});

const wifiOnly = computed({
  get: () => status.value?.wifiOnly ?? false,
  set: (value: boolean) => void offline.setWifiOnly(value),
});

async function syncNow(): Promise<void> {
  const result = await offline.syncNow().catch(() => null);
  if (result?.outcome === "synced") toast.success(t("offline.synced"));
  else if (result?.outcome !== "busy") toast.error(t("offline.failed"));
}

const clearing = ref(false);
async function clear(): Promise<void> {
  if (!session.user) return;
  clearing.value = true;
  try {
    const user = session.user;
    const done = await confirmAction("delete", "offlineCopy", undefined, async () => {
      await offline.stop();
      // Keeps the background sync on: the copy refills at the next one.
      await offline.start(user, { syncNow: false });
    });
    if (done) toast.success(t("offline.cleared"));
  } finally {
    clearing.value = false;
  }
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <section v-stagger="0" class="pt-card flex flex-col gap-4 p-4">
      <div class="flex items-start gap-3.5">
        <span class="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary"><PtIcon :icon="SmartPhone01Icon" :size="20" /></span>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-semibold">{{ $t("offline.copyTitle") }}</p>
          <p class="mt-0.5 text-xs text-muted">{{ $t("offline.copyHint") }}</p>
          <p class="mt-2 flex items-center gap-1.5 text-xs font-bold" :class="state.tone" aria-live="polite">
            <span v-if="offline.syncing" class="size-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
            <PtIcon v-else-if="state.tone === 'text-danger'" :icon="AlertCircleIcon" :size="14" />
            <span v-else class="size-2 rounded-full bg-current" />
            {{ state.text }}
          </p>
        </div>
      </div>

      <dl class="grid grid-cols-3 gap-2 text-center">
        <div class="rounded-2xl bg-surface-2 px-2 py-3">
          <dt class="text-[11px] font-semibold text-muted">{{ $t("offline.tasks") }}</dt>
          <dd class="mt-0.5 text-lg font-bold tabular-nums">{{ status?.tasks ?? 0 }}</dd>
        </div>
        <div class="rounded-2xl bg-surface-2 px-2 py-3">
          <dt class="text-[11px] font-semibold text-muted">{{ $t("offline.comments") }}</dt>
          <dd class="mt-0.5 text-lg font-bold tabular-nums">{{ status?.comments ?? 0 }}</dd>
        </div>
        <div class="rounded-2xl bg-surface-2 px-2 py-3">
          <dt class="text-[11px] font-semibold text-muted">{{ $t("offline.space") }}</dt>
          <dd class="mt-0.5 text-lg font-bold tabular-nums">{{ size }}</dd>
        </div>
      </dl>

      <div v-if="offline.syncing" class="flex flex-col gap-1.5" aria-live="polite">
        <div
          class="h-2 overflow-hidden rounded-full bg-surface-3"
          role="progressbar"
          :aria-valuenow="percent ?? undefined"
          aria-valuemin="0"
          aria-valuemax="100"
          :aria-label="$t('offline.syncing')"
        >
          <span v-if="percent !== null" class="block h-full rounded-full bg-primary transition-[width] duration-300" :style="{ width: `${percent}%` }" />
          <span v-else class="pt-bar-loading block h-full" />
        </div>
        <p class="text-xs text-muted tabular-nums">
          {{ offline.progress?.total ? $t("offline.applying", { done: offline.progress.done, total: offline.progress.total }) : $t("offline.connecting") }}
        </p>
      </div>

      <PtButton block variant="soft" :icon="RefreshIcon" :loading="offline.syncing" :disabled="isOffline" @click="syncNow">
        {{ $t("offline.syncNow") }}
      </PtButton>
    </section>

    <section v-stagger="1" class="pt-card p-4">
      <PtSwitch v-model="wifiOnly" :label="$t('offline.wifiOnly')" :hint="$t('offline.wifiOnlyHint')" />
    </section>

    <section v-stagger="2" class="pt-card flex items-center gap-3 p-4">
      <div class="min-w-0 flex-1">
        <p class="text-sm font-semibold">{{ $t("offline.clear") }}</p>
        <p class="mt-0.5 text-xs text-muted">{{ $t("offline.clearHint") }}</p>
      </div>
      <PtButton size="sm" variant="danger" :icon="Delete02Icon" :loading="clearing" @click="clear">{{ $t("offline.clearAction") }}</PtButton>
    </section>
  </div>
</template>
