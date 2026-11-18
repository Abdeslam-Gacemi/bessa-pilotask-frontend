<script setup lang="ts">
import { ref } from "vue";
import { CheckListIcon, RefreshIcon, WifiOff01Icon } from "@hugeicons/core-free-icons";
import PtButton from "@/components/ui/PtButton.vue";
import PtEmpty from "@/components/ui/PtEmpty.vue";
import { keepsOfflineCopy } from "@/offline/connectivity";
import { probeApi } from "@/offline/reconnect";

/** In place of a screen that needs the network; points to what still works. */
const checking = ref(false);

async function retry(): Promise<void> {
  checking.value = true;
  await probeApi();
  checking.value = false;
}
</script>

<template>
  <PtEmpty :icon="WifiOff01Icon" :title="$t('offline.unavailable')" :hint="keepsOfflineCopy ? $t('offline.unavailableHint') : $t('offline.unavailableWebHint')">
    <div class="mt-2 flex flex-wrap justify-center gap-2">
      <PtButton v-if="keepsOfflineCopy" :icon="CheckListIcon" @click="$router.push('/my-tasks')">{{ $t("nav.myTasks") }}</PtButton>
      <PtButton variant="secondary" :icon="RefreshIcon" :loading="checking" @click="retry">{{ $t("offline.retry") }}</PtButton>
    </div>
  </PtEmpty>
</template>
