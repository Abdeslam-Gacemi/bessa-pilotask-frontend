<script setup lang="ts">
import PtIcon from "./PtIcon.vue";
import { TABLE_ICONS } from "@/plugins/icons";

defineProps<{ color?: string | null }>();
const model = defineModel<string | null>({ default: null });
const names = Object.keys(TABLE_ICONS);
</script>

<template>
  <div class="grid grid-cols-6 gap-2 sm:grid-cols-10" role="radiogroup">
    <button
      v-for="name in names"
      :key="name"
      type="button"
      role="radio"
      :aria-checked="model === name"
      :aria-label="name"
      class="grid aspect-square place-items-center rounded-xl border transition hover:bg-surface-3"
      :class="model === name ? 'border-transparent text-white' : 'border-line text-muted'"
      :style="model === name ? { background: color ?? 'var(--pt-ink)' } : undefined"
      @click="model = model === name ? null : name"
    >
      <PtIcon :icon="TABLE_ICONS[name]!" :size="18" />
    </button>
  </div>
</template>
