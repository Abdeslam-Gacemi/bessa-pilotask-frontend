<script setup lang="ts">
withDefaults(defineProps<{ value: number; color?: string; height?: number; track?: string }>(), { height: 6 });
</script>

<template>
  <div
    class="w-full overflow-hidden rounded-full"
    :class="track ?? 'bg-surface-3'"
    :style="{ height: `${height}px` }"
    role="progressbar"
    :aria-valuenow="Math.round(value)"
    aria-valuemin="0"
    aria-valuemax="100"
  >
    <div
      class="h-full rounded-full transition-[width] duration-700 ease-(--ease-spring)"
      :style="{ width: `${Math.min(100, Math.max(0, value))}%`, background: color ?? 'var(--pt-ink)' }"
    />
  </div>
</template>
