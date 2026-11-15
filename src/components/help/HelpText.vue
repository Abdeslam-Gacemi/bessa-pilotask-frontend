<script setup lang="ts">
import { computed } from "vue";
import { segments } from "@/help";

/**
 * One line of help text: `**bold**` as <strong>, and the words being
 * searched marked. Rendered as text nodes (no v-html), so content can never
 * inject markup.
 */
const props = defineProps<{ text: string; query?: string }>();

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const pattern = computed(() => {
  const words = (props.query ?? "").trim().split(/\s+/).filter((w) => w.length > 1);
  return words.length ? new RegExp(`(${words.map(escape).join("|")})`, "gi") : null;
});

const parts = computed(() =>
  segments(props.text).flatMap((segment) =>
    (pattern.value ? segment.text.split(pattern.value) : [segment.text])
      .filter(Boolean)
      .map((text) => ({ text, bold: segment.bold, hit: pattern.value ? new RegExp(`^${pattern.value.source}$`, "i").test(text) : false })),
  ),
);
</script>

<template>
  <template v-for="(part, i) in parts" :key="i">
    <mark v-if="part.hit" class="rounded bg-warning-soft px-0.5 text-fg" :class="part.bold && 'font-semibold'">{{ part.text }}</mark>
    <strong v-else-if="part.bold" class="font-semibold text-fg">{{ part.text }}</strong>
    <template v-else>{{ part.text }}</template>
  </template>
</template>
