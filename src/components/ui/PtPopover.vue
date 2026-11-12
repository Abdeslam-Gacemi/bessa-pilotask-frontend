<script setup lang="ts">
import { nextTick, ref, watch } from "vue";
import { onClickOutside, useEventListener } from "@vueuse/core";
import { useOverlay } from "@/composables/useOverlay";
import { usePreferencesStore } from "@/stores/preferences";

/**
 * A floating panel anchored to its trigger (menus, pickers). It renders in
 * <body> with fixed coordinates, so a sheet's scroll area never clips it, and
 * joins the overlay stack (z-order, Back and Escape).
 */
const props = withDefaults(defineProps<{ align?: "start" | "end"; width?: string }>(), { align: "start", width: "16rem" });
const open = defineModel<boolean>({ default: false });

const trigger = ref<HTMLElement | null>(null);
const panel = ref<HTMLElement | null>(null);
const position = ref<Record<string, string>>({});
const prefs = usePreferencesStore();
const { zIndex, isTop } = useOverlay(open);

function place(): void {
  const anchor = trigger.value?.getBoundingClientRect();
  if (!anchor) return;
  const height = panel.value?.offsetHeight ?? 280;
  const below = window.innerHeight - anchor.bottom;
  const top = below < height + 16 && anchor.top > height + 16 ? anchor.top - height - 8 : anchor.bottom + 8;
  // "start" is the left edge in LTR and the right edge in RTL.
  const alignRight = (props.align === "end") !== prefs.isRtl;
  // Keep the whole panel on screen, whichever edge it is anchored to.
  const width = panel.value?.offsetWidth ?? 256;
  const maxOffset = Math.max(8, window.innerWidth - width - 8);
  position.value = alignRight
    ? { top: `${top}px`, right: `${Math.min(maxOffset, Math.max(8, window.innerWidth - anchor.right))}px` }
    : { top: `${top}px`, left: `${Math.min(maxOffset, Math.max(8, anchor.left))}px` };
}

watch(open, async (value) => {
  if (!value) return;
  place();
  await nextTick();
  place();
});

useEventListener(window, "resize", () => open.value && place());
useEventListener(window, "scroll", () => open.value && place(), { capture: true, passive: true });
useEventListener(window, "keydown", (event: KeyboardEvent) => {
  if (event.key === "Escape" && open.value && isTop.value) open.value = false;
});
onClickOutside(panel, () => (open.value = false), { ignore: [trigger] });

const toggle = () => (open.value = !open.value);
const close = () => (open.value = false);
</script>

<template>
  <div ref="trigger" class="inline-block">
    <slot name="trigger" :toggle="toggle" :open="open" />
  </div>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-150 ease-out"
      leave-active-class="transition duration-100"
      enter-from-class="opacity-0 -translate-y-1 scale-[0.98]"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        ref="panel"
        class="fixed max-w-[calc(100vw-1rem)] rounded-2xl border border-line bg-surface p-1.5 shadow-float"
        :style="{ width, zIndex: zIndex + 1, ...position }"
      >
        <slot :close="close" />
      </div>
    </Transition>
  </Teleport>
</template>
