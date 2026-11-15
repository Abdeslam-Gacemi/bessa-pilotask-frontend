<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { HEALTH_TONE } from "@/domain/objectives";
import type { Health } from "@/types/models";

/**
 * Progress against the plan in one bar: the fill is done, the faint band runs
 * to the forecast (where it lands at this pace), the tick is where it should
 * be today. Reads at a glance: fill past the tick = ahead.
 */
const props = withDefaults(defineProps<{ progress: number; expected: number; forecast?: number | null; health: Health; height?: number }>(), {
  forecast: null,
  height: 8,
});
const { t } = useI18n();
const clamp = (v: number) => Math.min(100, Math.max(0, v));
const color = computed(() => HEALTH_TONE[props.health].color);
const label = computed(() =>
  t("objectives.paceAria", { progress: Math.round(props.progress), expected: Math.round(props.expected), forecast: props.forecast === null ? "—" : Math.round(props.forecast) }),
);
</script>

<template>
  <div class="relative w-full" :style="{ height: `${height}px` }" role="img" :aria-label="label" :title="label">
    <div class="absolute inset-0 overflow-hidden rounded-full bg-surface-3">
      <div
        v-if="forecast !== null && forecast > progress"
        class="absolute inset-y-0 start-0 rounded-full opacity-25 transition-[width] duration-700 ease-(--ease-spring)"
        :style="{ width: `${clamp(forecast)}%`, background: color }"
      />
      <div class="absolute inset-y-0 start-0 rounded-full transition-[width] duration-700 ease-(--ease-spring)" :style="{ width: `${clamp(progress)}%`, background: color }" />
    </div>
    <span
      v-if="expected > 0 && expected < 100"
      class="absolute -inset-y-1 w-0.5 -translate-x-1/2 rounded-full bg-fg/70 rtl:translate-x-1/2"
      :style="{ insetInlineStart: `${clamp(expected)}%` }"
    />
  </div>
</template>
