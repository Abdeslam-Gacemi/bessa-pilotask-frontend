<script setup lang="ts">
import PtIcon from "@/components/ui/PtIcon.vue";
import type { Icon } from "@/plugins/icons";

/** One titled group inside a filter sheet, with an optional per-group clear. */
defineProps<{ title: string; icon: Icon; active?: boolean }>();
defineEmits<{ clear: [] }>();
</script>

<template>
  <section class="flex flex-col gap-3 py-4 first:pt-1">
    <header class="flex items-center gap-2">
      <PtIcon :icon="icon" :size="16" class="text-muted" />
      <h3 class="flex-1 text-sm font-bold">{{ title }}</h3>
      <button v-if="active" type="button" class="text-xs font-semibold text-primary" @click="$emit('clear')">{{ $t("common.clear") }}</button>
    </header>
    <slot />
  </section>
</template>
