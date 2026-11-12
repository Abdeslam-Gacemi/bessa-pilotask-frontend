<script setup lang="ts">
import PtIcon from "./PtIcon.vue";
import type { Icon } from "@/plugins/icons";

defineProps<{ icon?: Icon; danger?: boolean; active?: boolean }>();
</script>

<template>
  <button
    type="button"
    class="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-start text-sm font-medium transition hover:bg-surface-3"
    :class="[danger ? 'text-danger' : 'text-fg', active && 'bg-surface-3']"
  >
    <PtIcon v-if="icon" :icon="icon" :size="18" />
    <span class="flex-1 truncate"><slot /></span>
    <slot name="end" />
  </button>
</template>
