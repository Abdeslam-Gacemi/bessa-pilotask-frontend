<script setup lang="ts">
import PtIcon from "@/components/ui/PtIcon.vue";
import type { Icon } from "@/plugins/icons";

/** A headline number. Text stays in ink; the icon tile carries the tone. */
defineProps<{ label: string; value: string | number; hint?: string; icon: Icon; tone?: "neutral" | "primary" | "success" | "danger" | "warning" }>();
</script>

<template>
  <div class="pt-card flex flex-col gap-3 p-4">
    <div class="flex items-center justify-between gap-2">
      <span class="text-xs font-semibold text-muted">{{ label }}</span>
      <span
        class="grid size-8 place-items-center rounded-xl"
        :class="{
          'bg-surface-3 text-fg': !tone || tone === 'neutral',
          'bg-primary-soft text-primary': tone === 'primary',
          'bg-success-soft text-success': tone === 'success',
          'bg-danger-soft text-danger': tone === 'danger',
          'bg-warning-soft text-warning': tone === 'warning',
        }"
      >
        <PtIcon :icon="icon" :size="16" />
      </span>
    </div>
    <p class="text-3xl font-bold tracking-tight tabular-nums">{{ value }}</p>
    <p v-if="hint" class="text-xs text-muted">{{ hint }}</p>
  </div>
</template>
