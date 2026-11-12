<script setup lang="ts">
import { PRIORITY_STYLE } from "@/domain/tasks";
import type { Priority } from "@/types/models";

defineProps<{ priority: Priority; compact?: boolean }>();
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 rounded-full font-semibold whitespace-nowrap"
    :class="[PRIORITY_STYLE[priority].chip, compact ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs']"
  >
    <span class="size-1.5 rounded-full" :style="{ background: PRIORITY_STYLE[priority].dot }" />
    {{ $t(`priority.${priority}`) }}
  </span>
</template>
