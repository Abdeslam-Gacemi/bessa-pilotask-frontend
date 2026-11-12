<script setup lang="ts" generic="T extends string | number">
import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import PtIcon from "./PtIcon.vue";

/** A filter dropdown shaped like a chip; highlighted while a value is picked. */
defineProps<{ placeholder: string; options: { value: T; label: string }[] }>();
const model = defineModel<T | "">({ default: "" });
</script>

<template>
  <label class="relative inline-flex">
    <select
      v-model="model"
      :aria-label="placeholder"
      class="h-9 cursor-pointer appearance-none rounded-full border ps-3.5 pe-8 text-xs font-semibold transition outline-none focus-visible:ring-4 focus-visible:ring-sky/20"
      :class="model !== '' ? 'border-ink bg-ink text-on-ink' : 'border-line bg-surface text-fg hover:bg-surface-2'"
    >
      <option value="">{{ placeholder }}</option>
      <option v-for="option in options" :key="option.value" :value="option.value">{{ option.label }}</option>
    </select>
    <PtIcon
      :icon="ArrowDown01Icon"
      :size="14"
      class="pointer-events-none absolute end-2.5 top-1/2 -translate-y-1/2"
      :class="model !== '' ? 'text-on-ink' : 'text-muted'"
    />
  </label>
</template>
