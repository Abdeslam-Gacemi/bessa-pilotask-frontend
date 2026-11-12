<script setup lang="ts">
import { statusName } from "@/domain/statusName";
import type { Status } from "@/types/models";

defineProps<{ status: Pick<Status, "name" | "color"> }>();
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap"
    :style="{ background: `color-mix(in oklab, ${status.color} 16%, transparent)`, color: status.color }"
  >
    <span class="size-1.5 rounded-full" :style="{ background: status.color }" />
    {{ statusName(status) }}
  </span>
</template>
