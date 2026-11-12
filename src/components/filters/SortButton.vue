<script setup lang="ts">
import { SortByDown01Icon, SortByUp01Icon, SortingIcon } from "@hugeicons/core-free-icons";
import PtIcon from "@/components/ui/PtIcon.vue";
import type { TaskSort } from "@/domain/sort";

/** Opens the order sheet; shows the current order when it isn't the board's own. */
defineProps<{ sort: TaskSort }>();
</script>

<template>
  <button
    type="button"
    class="inline-flex h-9 shrink-0 items-center gap-2 rounded-full border px-3.5 text-xs font-semibold transition active:scale-95"
    :class="sort.key !== 'manual' ? 'border-ink bg-ink text-on-ink' : 'border-line bg-surface hover:bg-surface-2'"
    :aria-label="$t('sort.title')"
  >
    <PtIcon :icon="sort.key === 'manual' ? SortingIcon : sort.desc ? SortByDown01Icon : SortByUp01Icon" :size="16" />
    <span>{{ sort.key === "manual" ? $t("sort.title") : $t(`sort.keys.${sort.key}`) }}</span>
  </button>
</template>
