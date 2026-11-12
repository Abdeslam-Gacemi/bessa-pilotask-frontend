<script setup lang="ts">
import PtSkeleton from "@/components/ui/PtSkeleton.vue";

/** Placeholder with the shape of a TaskRow: check circle, two lines, due chip, avatars. */
withDefaults(defineProps<{ rows?: number }>(), { rows: 3 });
</script>

<template>
  <div class="divide-y divide-line/60" aria-hidden="true">
    <div v-for="i in rows" :key="i" class="flex items-center gap-3 px-3 py-3">
      <PtSkeleton class="size-6 shrink-0 rounded-full" />
      <div class="min-w-0 flex-1 space-y-2">
        <PtSkeleton class="h-3.5 rounded-full" :class="['w-3/4', 'w-1/2', 'w-2/3'][i % 3]" />
        <PtSkeleton class="h-2.5 w-1/3 rounded-full" />
      </div>
      <PtSkeleton class="h-5 w-16 shrink-0 rounded-full" />
      <div class="flex -space-x-2 max-sm:hidden rtl:space-x-reverse">
        <PtSkeleton class="size-6 rounded-full ring-2 ring-surface" />
        <PtSkeleton class="size-6 rounded-full ring-2 ring-surface" />
      </div>
    </div>
  </div>
</template>
