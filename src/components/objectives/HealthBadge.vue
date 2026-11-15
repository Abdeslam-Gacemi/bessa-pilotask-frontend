<script setup lang="ts">
import { HEALTH_TONE } from "@/domain/objectives";
import type { Health } from "@/types/models";

/** On track / at risk / off track, as a soft pill with a dot (colour is never the only cue: the label says it). */
withDefaults(defineProps<{ health: Health; size?: "sm" | "md" }>(), { size: "md" });
</script>

<template>
  <span
    class="inline-flex shrink-0 items-center gap-1.5 rounded-full font-semibold whitespace-nowrap"
    :class="[HEALTH_TONE[health].soft, HEALTH_TONE[health].text, size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs']"
  >
    <span class="size-1.5 rounded-full" :class="HEALTH_TONE[health].bg" />
    {{ $t(`objectives.health.${health}`) }}
  </span>
</template>
