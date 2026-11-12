<script setup lang="ts">
import { computed } from "vue";
import { usePreferencesStore } from "@/stores/preferences";

/** The Pilotask mark or wordmark, switching ink with the theme. */
const props = withDefaults(defineProps<{ variant?: "mark" | "full"; height?: number }>(), { variant: "full", height: 32 });
const prefs = usePreferencesStore();
const src = computed(() =>
  props.variant === "mark" ? "/brand/pilotask-icon.svg" : prefs.isDark ? "/brand/pilotask-logo-light.svg" : "/brand/pilotask-logo-dark.svg",
);
</script>

<template>
  <img :src="src" alt="Pilotask" :style="{ height: `${height}px` }" class="w-auto select-none" draggable="false" />
</template>
