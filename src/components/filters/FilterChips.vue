<script setup lang="ts" generic="T extends string | number">
import { Tick02Icon } from "@hugeicons/core-free-icons";
import PtAvatar from "@/components/ui/PtAvatar.vue";
import PtIcon from "@/components/ui/PtIcon.vue";

/** Multi-select as wrapping chips: tap to toggle. Options may carry a colour dot or an avatar. */
defineProps<{ options: { value: T; label: string; color?: string | null; avatar?: string | null }[] }>();
const model = defineModel<T[]>({ required: true });

function toggle(value: T): void {
  model.value = model.value.includes(value) ? model.value.filter((v) => v !== value) : [...model.value, value];
}
</script>

<template>
  <div class="flex flex-wrap gap-2">
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      class="inline-flex h-9 max-w-full items-center gap-2 rounded-full border text-xs font-semibold transition active:scale-95"
      :class="[
        model.includes(option.value) ? 'border-ink bg-ink text-on-ink' : 'border-line bg-surface hover:bg-surface-2',
        option.avatar !== undefined ? 'ps-1 pe-3.5' : 'px-3.5',
      ]"
      :aria-pressed="model.includes(option.value)"
      @click="toggle(option.value)"
    >
      <PtAvatar v-if="option.avatar !== undefined" :name="option.label" :src="option.avatar" :size="26" />
      <span v-else-if="option.color" class="size-2 shrink-0 rounded-full" :style="{ background: option.color }" />
      <span class="truncate">{{ option.label }}</span>
      <PtIcon v-if="model.includes(option.value)" :icon="Tick02Icon" :size="14" class="-me-1 shrink-0" />
    </button>
  </div>
</template>
