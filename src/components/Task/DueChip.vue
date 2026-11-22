<script setup lang="ts">
import { computed } from "vue";
import { Calendar03Icon } from "@hugeicons/core-free-icons";
import PtIcon from "@/components/ui/PtIcon.vue";
import { useDates } from "@/composables/useDates";

const props = defineProps<{ due: string | null; overdue?: boolean; done?: boolean }>();
const { dueLabel, dayjs } = useDates();

const tone = computed(() => {
  if (props.done) return "text-muted";
  if (props.overdue) return "text-danger bg-danger-soft";
  if (props.due && dayjs(props.due).diff(dayjs(), "hour") < 24) return "text-warning bg-warning-soft";
  return "text-muted bg-surface-3";
});
</script>

<template>
  <span v-if="due" class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap" :class="tone">
    <PtIcon :icon="Calendar03Icon" :size="13" />
    {{ dueLabel(due) }}
  </span>
</template>
