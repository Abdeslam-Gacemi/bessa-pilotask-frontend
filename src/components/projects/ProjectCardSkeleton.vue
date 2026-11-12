<script setup lang="ts">
import PtSkeleton from "@/components/ui/PtSkeleton.vue";

/** Placeholder with the shape of a dashboard project card: cover, title, line, progress. */
</script>

<template>
  <div class="pt-card w-64 shrink-0 snap-start overflow-hidden" aria-hidden="true">
    <div class="pt-skeleton h-28 rounded-none p-4">
      <span class="relative z-10 block size-11 rounded-2xl bg-surface/80" />
      <span class="absolute end-3 top-3 z-10 block h-5 w-16 rounded-full bg-surface/80" />
    </div>
    <div class="space-y-2.5 p-4">
      <PtSkeleton class="h-4 w-2/3 rounded-full" />
      <PtSkeleton class="h-3 w-1/2 rounded-full" />
      <div class="flex justify-between pt-2">
        <PtSkeleton class="h-3 w-12 rounded-full" />
        <PtSkeleton class="h-3 w-8 rounded-full" />
      </div>
      <PtSkeleton class="h-1.5 w-full rounded-full" />
    </div>
  </div>
</template>
