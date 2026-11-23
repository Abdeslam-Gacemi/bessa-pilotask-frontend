<script setup lang="ts">
import { computed } from "vue";
import { familyOf } from "@/services/uploads";

/** Document icon with its type, in the colour people know (PDF red, Word blue, Excel green, PowerPoint orange). */
const props = withDefaults(defineProps<{ extension: string; size?: number }>(), { size: 40 });

const TONES = { pdf: "#D93A3F", word: "#2B5FD9", excel: "#1E8A5C", powerpoint: "#D9632B", image: "#7458E8" } as const;
const family = computed(() => familyOf(props.extension));
const tone = computed(() => TONES[family.value]);
const label = computed(() => (family.value === "word" ? "DOC" : family.value === "excel" ? "XLS" : family.value === "powerpoint" ? "PPT" : props.extension.toUpperCase()).slice(0, 4));
</script>

<template>
  <svg :width="size" :height="size * 1.2" viewBox="0 0 40 48" aria-hidden="true" class="shrink-0">
    <path d="M6 1h20l13 13v29a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V5a4 4 0 0 1 4-4Z" :fill="`color-mix(in oklab, ${tone} 12%, white)`" :stroke="tone" stroke-opacity=".35" />
    <path d="M26 1v9a4 4 0 0 0 4 4h9" :fill="`color-mix(in oklab, ${tone} 22%, white)`" :stroke="tone" stroke-opacity=".35" />
    <rect x="5" y="27" :width="label.length > 3 ? 30 : 26" height="13" rx="3.5" :fill="tone" />
    <text :x="label.length > 3 ? 20 : 18" y="36.6" text-anchor="middle" font-size="8.5" font-weight="800" fill="#fff" font-family="inherit" letter-spacing=".4">{{ label }}</text>
  </svg>
</template>
