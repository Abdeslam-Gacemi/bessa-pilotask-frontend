<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from "vue";
import { useScrollLock } from "@vueuse/core";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import PtIconButton from "./PtIconButton.vue";
import { hasOpenOverlay, useOverlay } from "@/composables/useOverlay";

/**
 * Dialog container: a centred card (or an end-side panel) on large screens,
 * a bottom sheet on phones. Joins the overlay stack, so sheets opened from a
 * sheet sit above it and Back / Escape close the top one first.
 */
const props = withDefaults(defineProps<{ title?: string; side?: "center" | "end"; width?: string }>(), {
  side: "center",
  width: "34rem",
});
const open = defineModel<boolean>({ required: true });
const emit = defineEmits<{ closed: [] }>();

const panel = ref<HTMLElement | null>(null);

// Pull-down to close on phones: drag the handle or header; past 110px (or a quick flick) closes.
const pull = ref(0);
const pulling = ref(false);
let startY = 0;
let startTime = 0;

function onPullStart(event: PointerEvent): void {
  if (window.matchMedia("(min-width: 48rem)").matches || (event.target as HTMLElement).closest("button")) return;
  pulling.value = true;
  startY = event.clientY;
  startTime = performance.now();
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
}

function onPullMove(event: PointerEvent): void {
  if (pulling.value) pull.value = Math.max(0, event.clientY - startY);
}

function onPullEnd(): void {
  if (!pulling.value) return;
  const speed = pull.value / Math.max(1, performance.now() - startTime);
  pulling.value = false;
  if (pull.value > 110 || speed > 0.6) open.value = false;
  pull.value = 0;
}
const { zIndex, isTop } = useOverlay(open);
const locked = useScrollLock(typeof document !== "undefined" ? document.body : null);

watch(open, (value) => {
  pull.value = 0;
  if (value) requestAnimationFrame(() => panel.value?.focus({ preventScroll: true }));
});
watch(hasOpenOverlay, (any) => (locked.value = any), { immediate: true });

function onKey(event: KeyboardEvent): void {
  if (event.key === "Escape" && open.value && isTop.value) {
    event.stopPropagation();
    open.value = false;
  }
}

onMounted(() => window.addEventListener("keydown", onKey));
onUnmounted(() => window.removeEventListener("keydown", onKey));

const hiddenFrom = props.side === "end"
  ? "max-md:translate-y-full md:translate-x-8 rtl:md:-translate-x-8 opacity-0"
  : "max-md:translate-y-full md:scale-95 opacity-0";
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200"
      leave-active-class="transition duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div v-if="open" class="fixed inset-0 bg-ink/40 backdrop-blur-[2px]" :style="{ zIndex }" @click="open = false" />
    </Transition>
    <Transition
      enter-active-class="transition duration-300 ease-(--ease-spring)"
      leave-active-class="transition duration-200"
      :enter-from-class="hiddenFrom"
      :leave-to-class="hiddenFrom"
      @after-leave="emit('closed')"
    >
      <section
        v-if="open"
        ref="panel"
        tabindex="-1"
        role="dialog"
        aria-modal="true"
        :aria-label="title"
        class="fixed flex max-h-[92dvh] flex-col bg-surface shadow-float outline-none max-md:inset-x-0 max-md:bottom-0 max-md:rounded-t-(--radius-sheet)"
        :class="
          side === 'end'
            ? 'md:inset-y-3 md:end-3 md:max-h-none md:rounded-(--radius-sheet) md:border md:border-line'
            : 'md:start-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 rtl:md:translate-x-1/2 md:rounded-(--radius-sheet) md:border md:border-line'
        "
        :style="{
          '--sheet-w': width,
          zIndex: zIndex + 1,
          transform: pull ? `translateY(${pull}px)` : undefined,
          transition: pulling ? 'none' : undefined,
        }"
      >
        <div
          class="shrink-0 touch-none select-none md:touch-auto"
          @pointerdown="onPullStart"
          @pointermove="onPullMove"
          @pointerup="onPullEnd"
          @pointercancel="onPullEnd"
        >
          <div class="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-line md:hidden" />
          <header v-if="title || $slots.header" class="flex items-center gap-3 px-5 pt-4 pb-2 md:px-6 md:pt-5">
            <slot name="header">
              <h2 class="flex-1 truncate text-lg font-bold">{{ title }}</h2>
            </slot>
            <PtIconButton :icon="Cancel01Icon" :label="$t('common.close')" @click="open = false" />
          </header>
          <div v-else class="h-3" />
        </div>
        <!-- flex-auto (not flex-1): a 0 basis collapses the body when the sheet has no fixed height. -->
        <div class="min-h-0 flex-auto overflow-y-auto overscroll-contain px-5 pb-5 md:px-6">
          <slot />
        </div>
        <footer v-if="$slots.footer" class="pt-safe-bottom flex items-center justify-end gap-2 border-t border-line px-5 pt-3 md:px-6 md:pb-4">
          <slot name="footer" />
        </footer>
      </section>
    </Transition>
  </Teleport>
</template>

<style scoped>
@media (min-width: 48rem) {
  section {
    width: min(var(--sheet-w), calc(100vw - 1.5rem));
  }
}
</style>
