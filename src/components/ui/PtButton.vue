<script setup lang="ts">
import { computed } from "vue";
import { Loading03Icon } from "@hugeicons/core-free-icons";
import PtIcon from "./PtIcon.vue";
import type { Icon } from "@/plugins/icons";

const props = withDefaults(
  defineProps<{
    variant?: "primary" | "secondary" | "ghost" | "danger" | "soft";
    size?: "sm" | "md" | "lg";
    icon?: Icon;
    loading?: boolean;
    disabled?: boolean;
    block?: boolean;
    type?: "button" | "submit";
    /** Mirror the icon in right-to-left languages (send, next, arrows). */
    flip?: boolean;
  }>(),
  { variant: "primary", size: "md", type: "button" },
);

const classes = computed(() => [
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition duration-200 select-none",
  "active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50",
  {
    sm: "h-9 px-3.5 text-xs",
    md: "h-11 px-5 text-sm",
    lg: "h-13 px-6 text-[0.95rem]",
  }[props.size],
  {
    primary: "bg-ink text-on-ink shadow-soft hover:opacity-90",
    secondary: "bg-surface text-fg border border-line hover:bg-surface-2",
    ghost: "text-fg hover:bg-surface-3",
    danger: "bg-danger text-white hover:opacity-90",
    soft: "bg-primary-soft text-primary hover:brightness-95",
  }[props.variant],
  props.block && "w-full",
]);
</script>

<template>
  <button :type="type" :class="classes" :disabled="disabled || loading" :aria-busy="loading">
    <PtIcon v-if="loading" :icon="Loading03Icon" :size="18" class="animate-spin" />
    <PtIcon v-else-if="icon" :icon="icon" :size="18" :class="flip && 'rtl:-scale-x-100'" />
    <slot />
  </button>
</template>
