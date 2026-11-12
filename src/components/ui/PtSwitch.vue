<script setup lang="ts">
/** On/off switch (replaces checkboxes). Mirrors itself in RTL. */
defineProps<{ label?: string; hint?: string; disabled?: boolean }>();
const model = defineModel<boolean>({ default: false });
</script>

<template>
  <label class="flex cursor-pointer items-center gap-3 select-none" :class="disabled && 'pointer-events-none opacity-50'">
    <span v-if="label || hint || $slots.default" class="min-w-0 flex-1">
      <span class="block text-sm font-semibold"><slot>{{ label }}</slot></span>
      <span v-if="hint" class="block text-xs text-muted">{{ hint }}</span>
    </span>
    <button
      type="button"
      role="switch"
      :aria-checked="model"
      :aria-label="label"
      :disabled="disabled"
      class="relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200"
      :class="model ? 'bg-ink' : 'bg-surface-3 ring-1 ring-line ring-inset'"
      @click="model = !model"
    >
      <span
        class="absolute top-1 size-5 rounded-full bg-surface shadow-[0_1px_3px_rgb(0_0_0/0.25)] transition-[inset-inline-start] duration-300 ease-(--ease-spring)"
        :style="{ insetInlineStart: model ? 'calc(100% - 1.5rem)' : '0.25rem' }"
      />
    </button>
  </label>
</template>
