<script setup lang="ts">
import { computed } from "vue";
import { Tick02Icon } from "@hugeicons/core-free-icons";
import PtIcon from "./PtIcon.vue";
import { useMetaStore } from "@/stores/meta";

const props = defineProps<{ allowNone?: boolean }>();
const model = defineModel<string | null>({ default: null });
const meta = useMetaStore();
const colors = computed(() => meta.palette());
</script>

<template>
  <div class="flex flex-wrap gap-2" role="radiogroup">
    <button
      v-if="props.allowNone"
      type="button"
      role="radio"
      :aria-checked="model === null"
      class="grid size-8 place-items-center rounded-full border-2 border-dashed border-line text-subtle transition hover:scale-110"
      :class="model === null && 'border-ink text-fg'"
      :title="$t('common.none')"
      @click="model = null"
    >
      <span class="h-0.5 w-4 rotate-45 rounded bg-current" />
    </button>
    <button
      v-for="color in colors"
      :key="color"
      type="button"
      role="radio"
      :aria-checked="model === color"
      :aria-label="color"
      class="grid size-8 place-items-center rounded-full text-white ring-offset-2 ring-offset-surface transition hover:scale-110"
      :class="model === color && 'ring-2 ring-ink'"
      :style="{ background: color }"
      @click="model = color"
    >
      <PtIcon v-if="model === color" :icon="Tick02Icon" :size="16" :stroke="2.5" />
    </button>
  </div>
</template>
