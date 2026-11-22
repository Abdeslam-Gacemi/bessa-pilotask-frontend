<script setup lang="ts">
import { onMounted, ref } from "vue";
import { Download04Icon, SmartPhone01Icon } from "@hugeicons/core-free-icons";
import PtIcon from "@/components/ui/PtIcon.vue";
import PtButton from "@/components/ui/PtButton.vue";
import { appApi } from "@/api/endpoints";
import type { ApkInfo } from "@/types/models";

/** Download the Android APK (served to signed-in people only). Hidden until a build exists. */
const info = ref<ApkInfo | null>(null);

onMounted(async () => {
  try {
    info.value = await appApi.android();
  } catch {
    info.value = null;
  }
});

function mb(bytes?: number): string {
  return bytes ? `${(bytes / 1048576).toFixed(1)} MB` : "";
}

function download(): void {
  if (!info.value?.url) return;
  const a = document.createElement("a");
  a.href = info.value.url;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}
</script>

<template>
  <section v-if="info?.available" class="pt-card flex items-center gap-3.5 p-4">
    <span class="grid size-11 shrink-0 place-items-center rounded-2xl bg-success-soft text-success"><PtIcon :icon="SmartPhone01Icon" :size="20" /></span>
    <div class="min-w-0 flex-1">
      <p class="text-sm font-semibold">{{ $t("settings.androidApp") }}</p>
      <p class="mt-0.5 text-xs text-muted">
        {{ $t("settings.androidAppHint") }}<span v-if="info.version"> · v{{ info.version }}</span><span v-if="info.size"> · {{ mb(info.size) }}</span>
      </p>
    </div>
    <PtButton size="sm" :icon="Download04Icon" @click="download">{{ $t("settings.androidDownload") }}</PtButton>
  </section>
</template>
