<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { Download04Icon, Share08Icon } from "@hugeicons/core-free-icons";
import PtButton from "@/components/ui/PtButton.vue";
import PtIcon from "@/components/ui/PtIcon.vue";
import { useToast } from "@/composables/useToast";
import { install, promptInstall } from "@/services/pwa";

/** "Install Pilotask" card: the browser's install dialog, or the steps on iPhone / iPad. */
const { t } = useI18n();
const toast = useToast();
const busy = ref(false);

async function run(): Promise<void> {
  busy.value = true;
  try {
    if (await promptInstall()) toast.success(t("settings.install.done"));
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <section v-if="!install.installed && (install.canPrompt || install.manualIos)" class="pt-card flex items-start gap-3.5 p-4">
    <img src="/icons/pilotask-192.png" alt="" width="44" height="44" class="size-11 shrink-0 rounded-2xl shadow-soft" />
    <div class="min-w-0 flex-1">
      <p class="font-semibold">{{ $t("settings.install.title") }}</p>
      <p class="mt-0.5 text-sm text-muted">{{ $t("settings.install.hint") }}</p>
      <PtButton v-if="install.canPrompt" size="sm" class="mt-3" :icon="Download04Icon" :loading="busy" @click="run">
        {{ $t("settings.install.action") }}
      </PtButton>
      <p v-else class="mt-3 flex flex-wrap items-center gap-1.5 rounded-2xl bg-surface-2 px-3 py-2.5 text-sm">
        {{ $t("settings.install.iosStep1") }}
        <PtIcon :icon="Share08Icon" :size="16" class="text-primary" />
        {{ $t("settings.install.iosStep2") }}
      </p>
    </div>
  </section>
</template>
