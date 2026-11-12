<script setup lang="ts">
import PtIcon from "./PtIcon.vue";
import type { Icon } from "@/plugins/icons";

withDefaults(defineProps<{ icon: Icon; label: string; variant?: "plain" | "surface" | "ink"; size?: number; badge?: number | boolean }>(), {
  variant: "plain",
  size: 20,
});
</script>

<template>
  <button
    type="button"
    :aria-label="label"
    :title="label"
    class="relative inline-grid size-10 shrink-0 place-items-center rounded-full transition active:scale-95"
    :class="{
      'text-fg hover:bg-surface-3': variant === 'plain',
      'border border-line bg-surface text-fg shadow-soft hover:bg-surface-2': variant === 'surface',
      'bg-ink text-on-ink shadow-soft hover:opacity-90': variant === 'ink',
    }"
  >
    <PtIcon :icon="icon" :size="size" />
    <span
      v-if="badge"
      class="absolute end-1.5 top-1.5 grid min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] leading-4 font-bold text-white ring-2 ring-surface"
    >
      {{ typeof badge === "number" ? (badge > 99 ? "99+" : badge) : "" }}
    </span>
  </button>
</template>
