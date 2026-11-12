<script setup lang="ts">
import PtIcon from "./PtIcon.vue";
import type { Icon } from "@/plugins/icons";

defineProps<{ icon: Icon; title: string; hint?: string }>();
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
    <span class="grid size-14 place-items-center rounded-2xl bg-surface-3 text-muted">
      <PtIcon :icon="icon" :size="26" />
    </span>
    <p class="text-base font-bold">{{ title }}</p>
    <p v-if="hint" class="max-w-xs text-sm text-muted">{{ hint }}</p>
    <slot />
  </div>
</template>
