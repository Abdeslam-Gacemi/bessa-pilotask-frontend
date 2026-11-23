<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import PtSegmented from "@/components/ui/PtSegmented.vue";

/**
 * Team visibility for one table or entity: follow the level above, force on,
 * or force off. `inherited` is what "follow" resolves to right now.
 */
const props = defineProps<{ inherited: boolean; from: "entity" | "workspace" }>();
const model = defineModel<boolean | null>({ default: null });
const { t } = useI18n();

type Choice = "inherit" | "on" | "off";
const choice = computed<Choice>({
  get: () => (model.value === null || model.value === undefined ? "inherit" : model.value ? "on" : "off"),
  set: (value) => (model.value = value === "inherit" ? null : value === "on"),
});
const options = computed(() => [
  { value: "inherit" as Choice, label: t("access.inherit", { state: props.inherited ? t("access.on") : t("access.off") }) },
  { value: "on" as Choice, label: t("access.on") },
  { value: "off" as Choice, label: t("access.off") },
]);
</script>

<template>
  <div class="flex flex-col gap-2">
    <PtSegmented v-model="choice" size="sm" block :options="options" />
    <p class="text-xs text-subtle">{{ $t(`access.inheritHint.${from}`) }}</p>
  </div>
</template>
