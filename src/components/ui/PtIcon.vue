<script setup lang="ts">
import { HugeiconsIcon } from "@hugeicons/vue";
import type { Icon } from "@/plugins/icons";

withDefaults(defineProps<{ icon: Icon; size?: number; stroke?: number }>(), { size: 20, stroke: 1.8 });
</script>

<template>
  <HugeiconsIcon :icon="icon" :size="size" :stroke-width="stroke" color="currentColor" class="shrink-0" aria-hidden="true" />
</template>
