<script setup lang="ts">
import { ref, watch } from "vue";
import { CheckmarkCircle02Icon, Loading03Icon } from "@hugeicons/core-free-icons";
import PtIcon from "@/components/ui/PtIcon.vue";

/** A small inline status for background saves: a spinner while saving, then a brief "Saved". */
const props = defineProps<{ saving: boolean }>();

const justSaved = ref(false);
let timer: ReturnType<typeof setTimeout> | undefined;

watch(
  () => props.saving,
  (now, before) => {
    if (before && !now) {
      justSaved.value = true;
      clearTimeout(timer);
      timer = setTimeout(() => (justSaved.value = false), 2000);
    }
  },
);
</script>

<template>
  <span class="inline-flex min-h-5 items-center gap-1.5 text-xs font-semibold" aria-live="polite">
    <template v-if="saving">
      <PtIcon :icon="Loading03Icon" :size="14" class="animate-spin text-muted" />
      <span class="text-muted">{{ $t("settings.saving") }}</span>
    </template>
    <template v-else-if="justSaved">
      <PtIcon :icon="CheckmarkCircle02Icon" :size="14" class="text-success" />
      <span class="text-success">{{ $t("settings.saved") }}</span>
    </template>
  </span>
</template>
