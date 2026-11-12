<script setup lang="ts">
import { computed } from "vue";

/** Circular progress (0–100) with its value in the middle. */
const props = withDefaults(defineProps<{ value: number; size?: number; stroke?: number; color?: string; track?: string }>(), {
  size: 96,
  stroke: 10,
  color: "#53AEFF",
  track: "rgb(255 255 255 / 0.14)",
});
const radius = computed(() => (props.size - props.stroke) / 2);
const circumference = computed(() => 2 * Math.PI * radius.value);
const offset = computed(() => circumference.value * (1 - Math.min(100, Math.max(0, props.value)) / 100));
</script>

<template>
  <div class="relative grid shrink-0 place-items-center" :style="{ width: `${size}px`, height: `${size}px` }">
    <svg :width="size" :height="size" class="-rotate-90" aria-hidden="true">
      <circle :cx="size / 2" :cy="size / 2" :r="radius" fill="none" :stroke="track" :stroke-width="stroke" />
      <circle
        :cx="size / 2"
        :cy="size / 2"
        :r="radius"
        fill="none"
        :stroke="color"
        :stroke-width="stroke"
        stroke-linecap="round"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="offset"
        class="transition-[stroke-dashoffset] duration-1000 ease-(--ease-spring)"
      />
    </svg>
    <span class="absolute inset-0 grid place-items-center"><slot /></span>
  </div>
</template>
