<script setup lang="ts">
import { FilterHorizontalIcon } from "@hugeicons/core-free-icons";
import PtIcon from "@/components/ui/PtIcon.vue";

/** Opens a filter sheet; shows how many filter groups are on. */
defineProps<{ count: number }>();
</script>

<template>
  <button
    type="button"
    class="inline-flex h-9 shrink-0 items-center gap-2 rounded-full border px-3.5 text-xs font-semibold transition active:scale-95"
    :class="count ? 'border-ink bg-ink text-on-ink' : 'border-line bg-surface hover:bg-surface-2'"
    :aria-label="$t('filters.title')"
  >
    <PtIcon :icon="FilterHorizontalIcon" :size="16" />
    <span>{{ $t("filters.title") }}</span>
    <span v-if="count" class="grid min-w-5 place-items-center rounded-full bg-on-ink px-1.5 text-[11px] leading-5 font-bold text-ink">{{ count }}</span>
  </button>
</template>
