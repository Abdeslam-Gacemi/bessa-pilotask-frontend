<script setup lang="ts" generic="T extends string">
import { nextTick, onMounted, ref, watch } from "vue";
import { useResizeObserver } from "@vueuse/core";
import PtIcon from "./PtIcon.vue";
import type { Icon } from "@/plugins/icons";

/**
 * Tabs / segmented control. A single pill slides under the active option
 * (measured from the DOM, so it follows any label length, language or RTL);
 * on narrow screens the row scrolls instead of wrapping.
 */
const props = defineProps<{ options: { value: T; label: string; icon?: Icon }[]; size?: "sm" | "md"; block?: boolean }>();
const model = defineModel<T>({ required: true });

const track = ref<HTMLElement | null>(null);
const buttons = ref<HTMLElement[]>([]);
const pill = ref({ left: 0, width: 0, ready: false });

function measure(): void {
  const index = props.options.findIndex((o) => o.value === model.value);
  const el = buttons.value[index];
  if (!el) return;
  pill.value = { left: el.offsetLeft, width: el.offsetWidth, ready: true };
  // Keep the active option visible by scrolling the row only (scrollIntoView would also scroll the page or sheet).
  const row = track.value;
  if (row && row.scrollWidth > row.clientWidth) {
    const start = el.offsetLeft - 8;
    const end = el.offsetLeft + el.offsetWidth + 8;
    if (start < row.scrollLeft) row.scrollLeft = start;
    else if (end > row.scrollLeft + row.clientWidth) row.scrollLeft = end - row.clientWidth;
  }
}

onMounted(() => void nextTick(measure));
watch([model, () => props.options], () => void nextTick(measure), { deep: true });
useResizeObserver(track, measure);
</script>

<template>
  <div
    ref="track"
    role="tablist"
    class="relative max-w-full overflow-x-auto rounded-full border border-line bg-surface-2 p-1 [scrollbar-width:none]"
    :class="block ? 'flex' : 'inline-flex'"
  >
    <span
      aria-hidden="true"
      class="absolute top-1 bottom-1 rounded-full bg-ink shadow-soft"
      :class="pill.ready ? 'transition-[left,width] duration-300 ease-(--ease-spring)' : 'opacity-0'"
      :style="{ left: `${pill.left}px`, width: `${pill.width}px` }"
    />
    <button
      v-for="(option, index) in options"
      :key="option.value"
      :ref="(el) => (buttons[index] = el as HTMLElement)"
      type="button"
      role="tab"
      :aria-selected="model === option.value"
      class="relative z-10 inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full font-semibold whitespace-nowrap transition-colors duration-200 select-none"
      :class="[
        size === 'sm' ? 'h-8 text-xs' : 'h-10 text-sm',
        // Full-width rows share the space evenly; inline ones size to their label.
        block ? 'min-w-0 flex-1 px-2' : size === 'sm' ? 'px-3.5' : 'px-4.5',
        model === option.value ? 'text-on-ink' : 'text-muted hover:text-fg',
      ]"
      @click="model = option.value"
    >
      <PtIcon v-if="option.icon" :icon="option.icon" :size="size === 'sm' ? 15 : 17" />
      <span>{{ option.label }}</span>
    </button>
  </div>
</template>
