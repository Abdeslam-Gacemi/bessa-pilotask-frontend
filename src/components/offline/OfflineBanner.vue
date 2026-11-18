<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { CheckmarkCircle02Icon, WifiOff01Icon } from "@hugeicons/core-free-icons";
import PtIcon from "@/components/ui/PtIcon.vue";
import { useDates } from "@/composables/useDates";
import { isOffline, keepsOfflineCopy } from "@/offline/connectivity";
import { useOfflineStore } from "@/stores/offline";

/**
 * Says the app is offline, and since when its data dates; then, once the
 * network is back, says so for a moment before getting out of the way.
 */
const offline = useOfflineStore();
const { fmt } = useDates();
const { t } = useI18n();

const backOnline = ref(false);
let timer: number | undefined;
watch(isOffline, (now, before) => {
  window.clearTimeout(timer);
  backOnline.value = before && !now;
  if (backOnline.value) timer = window.setTimeout(() => (backOnline.value = false), 2500);
});

/** Android: how old the copy is (or that there is none yet). Web: it comes back by itself. */
const detail = computed(() => {
  if (!keepsOfflineCopy) return t("offline.reconnecting");
  return offline.lastSyncAt ? t("offline.dataFrom", { date: fmt.value.dateTime(offline.lastSyncAt) }) : t("offline.noCopyYet");
});
</script>

<template>
  <Transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="-translate-y-2 opacity-0"
    leave-active-class="transition duration-200 ease-in"
    leave-to-class="-translate-y-2 opacity-0"
  >
    <div
      v-if="isOffline"
      role="status"
      class="mb-4 flex items-center gap-3 rounded-2xl border border-line bg-surface px-3.5 py-2.5 shadow-soft"
    >
      <span class="grid size-9 shrink-0 place-items-center rounded-xl bg-warning-soft text-warning">
        <PtIcon :icon="WifiOff01Icon" :size="18" />
      </span>
      <span class="min-w-0 flex-1">
        <span class="block text-sm font-bold">{{ keepsOfflineCopy ? $t("offline.title") : $t("offline.titleWeb") }}</span>
        <span class="block truncate text-xs text-muted">{{ detail }}</span>
      </span>
    </div>
    <div
      v-else-if="backOnline"
      role="status"
      class="mb-4 flex items-center gap-2.5 rounded-2xl bg-success-soft px-3.5 py-2.5 text-sm font-bold text-success"
    >
      <PtIcon :icon="CheckmarkCircle02Icon" :size="18" />
      {{ $t("offline.back") }}
    </div>
  </Transition>
</template>
