<script setup lang="ts">
import { computed } from "vue";

/** Labelled horizontal bars: the label and count carry identity, the colour only echoes it. */
const props = defineProps<{ items: { key: string; label: string; value: number; color: string }[] }>();
const max = computed(() => Math.max(1, ...props.items.map((i) => i.value)));
const total = computed(() => props.items.reduce((sum, i) => sum + i.value, 0));
</script>

<template>
  <ul class="flex flex-col gap-3">
    <li v-for="item in items" :key="item.key" class="group" :title="`${item.label}: ${item.value}`">
      <div class="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
        <span class="flex items-center gap-2 font-semibold">
          <span class="size-2.5 rounded-full" :style="{ background: item.color }" />
          {{ item.label }}
        </span>
        <span class="text-muted tabular-nums">
          <span class="font-bold text-fg">{{ item.value }}</span>
          <span v-if="total" class="ms-1 text-xs">· {{ Math.round((item.value / total) * 100) }}%</span>
        </span>
      </div>
      <div class="h-2 rounded-full bg-surface-3">
        <div
          class="h-full rounded-full transition-[width] duration-700 ease-(--ease-spring) group-hover:brightness-110"
          :style="{ width: `${(item.value / max) * 100}%`, background: item.color }"
        />
      </div>
    </li>
  </ul>
</template>
