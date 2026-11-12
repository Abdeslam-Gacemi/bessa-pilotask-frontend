<script setup lang="ts">
import type { Entity } from "@/types/models";

/** A small chip naming an entity, in its colour. */
defineProps<{ entity: Pick<Entity, "name" | "color"> }>();
</script>

<template>
  <span
    class="inline-flex max-w-40 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold"
    :style="{
      background: `color-mix(in oklab, ${entity.color ?? 'var(--pt-subtle)'} 14%, transparent)`,
      color: entity.color ?? 'var(--pt-muted)',
    }"
  >
    <span class="size-1.5 shrink-0 rounded-full" :style="{ background: entity.color ?? 'var(--pt-subtle)' }" />
    <span class="truncate">{{ entity.name }}</span>
  </span>
</template>
