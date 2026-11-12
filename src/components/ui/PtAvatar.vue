<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(defineProps<{ name: string; src?: string | null; size?: number; ring?: boolean }>(), { size: 32 });

const TONES = ["#DDE8F5", "#E8E1F7", "#DFF0E6", "#F8E6D2", "#F6DDE1", "#E3E8D7", "#DCEFF1"];
const INK = ["#326899", "#6C4FD1", "#1F7A4F", "#A9661C", "#B23A48", "#5E7240", "#1E7C88"];

const initials = computed(() =>
  props.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join(""),
);

// A stable colour per person, so they are recognisable without a photo.
const tone = computed(() => {
  const hash = [...props.name].reduce((sum, ch) => (sum * 31 + ch.charCodeAt(0)) >>> 0, 7);
  return hash % TONES.length;
});
</script>

<template>
  <span
    class="inline-grid shrink-0 place-items-center overflow-hidden rounded-full font-bold select-none"
    :class="ring && 'ring-2 ring-surface'"
    :style="{
      width: `${size}px`,
      height: `${size}px`,
      fontSize: `${Math.max(10, size * 0.38)}px`,
      background: TONES[tone],
      color: INK[tone],
    }"
    :title="name"
  >
    <img v-if="src" :src="src" :alt="name" class="size-full object-cover" loading="lazy" />
    <template v-else>{{ initials }}</template>
  </span>
</template>
