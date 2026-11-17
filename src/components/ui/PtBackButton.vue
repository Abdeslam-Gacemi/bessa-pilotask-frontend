<script setup lang="ts">
import { useRouter } from "vue-router";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import PtIconButton from "./PtIconButton.vue";

/**
 * Back button for screens opened from another one (settings sections, Users,
 * Labels…). Goes back in history when there is somewhere to go back to,
 * otherwise (opened from a link or a refresh) to `fallback`.
 */
const props = withDefaults(defineProps<{ fallback?: string }>(), { fallback: "/settings" });
const router = useRouter();

function back(): void {
  if (window.history.state?.back) router.back();
  else void router.replace(props.fallback);
}
</script>

<template>
  <PtIconButton :icon="ArrowLeft01Icon" :label="$t('common.back')" variant="surface" class="shrink-0 rtl:rotate-180" @click="back" />
</template>
