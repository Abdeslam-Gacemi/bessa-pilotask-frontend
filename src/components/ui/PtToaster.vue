<script setup lang="ts">
import { AlertCircleIcon, CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import PtIcon from "./PtIcon.vue";
import { useToast } from "@/composables/useToast";

const { toasts, dismiss } = useToast();
</script>

<template>
  <div class="pointer-events-none fixed inset-x-0 bottom-24 z-[5000] flex flex-col items-center gap-2 px-4 md:bottom-6" aria-live="polite">
    <TransitionGroup
      enter-active-class="transition duration-300 ease-(--ease-spring)"
      leave-active-class="transition duration-200"
      enter-from-class="translate-y-3 opacity-0"
      leave-to-class="opacity-0"
    >
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="pointer-events-auto flex max-w-md items-center gap-3 rounded-full bg-ink py-2.5 ps-4 pe-2.5 text-sm font-medium text-on-ink shadow-float"
      >
        <PtIcon v-if="toast.tone === 'success'" :icon="CheckmarkCircle02Icon" :size="18" class="text-success" />
        <PtIcon v-else-if="toast.tone === 'danger'" :icon="AlertCircleIcon" :size="18" class="text-danger" />
        <span class="flex-1">{{ toast.message }}</span>
        <button
          v-if="toast.action"
          type="button"
          class="rounded-full bg-on-ink/15 px-3 py-1 text-xs font-bold"
          @click="toast.action.run(), dismiss(toast.id)"
        >
          {{ toast.action.label }}
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>
