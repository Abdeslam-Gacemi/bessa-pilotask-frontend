<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { Calendar03Icon } from "@hugeicons/core-free-icons";
import PtSegmented from "@/components/ui/PtSegmented.vue";
import PtPopover from "@/components/ui/PtPopover.vue";
import PtButton from "@/components/ui/PtButton.vue";
import PtIcon from "@/components/ui/PtIcon.vue";
import { dayjs } from "@/plugins/dayjs";

/** The time span for the stats: quick presets, or a custom range from the calendar. */
type Preset = "7" | "30" | "90" | "year" | "custom";
const emit = defineEmits<{ change: [range: { from: string; to: string }] }>();

const period = ref<Preset>("30");
const open = ref(false);
const today = dayjs().format("YYYY-MM-DD");
const customFrom = ref(dayjs().subtract(29, "day").format("YYYY-MM-DD"));
const customTo = ref(today);

const range = computed(() => {
  if (period.value === "custom") return { from: customFrom.value, to: customTo.value };
  const to = dayjs();
  const from = period.value === "year" ? to.startOf("year") : to.subtract(Number(period.value) - 1, "day");
  return { from: from.format("YYYY-MM-DD"), to: to.format("YYYY-MM-DD") };
});

watch(range, (value) => emit("change", value), { immediate: true, deep: true });

function applyCustom(): void {
  // Guard against a reversed range: swap so "from" is never after "to".
  if (dayjs(customFrom.value).isAfter(customTo.value)) {
    [customFrom.value, customTo.value] = [customTo.value, customFrom.value];
  }
  period.value = "custom";
  open.value = false;
}

const customLabel = computed(() => `${dayjs(customFrom.value).format("D MMM")} – ${dayjs(customTo.value).format("D MMM")}`);
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <PtSegmented
      v-model="period"
      size="sm"
      :options="[
        { value: '7', label: $t('analytics.last7') },
        { value: '30', label: $t('analytics.last30') },
        { value: '90', label: $t('analytics.last90') },
        { value: 'year', label: $t('analytics.thisYear') },
      ]"
    />
    <PtPopover v-model="open" align="end" width="18rem">
      <template #trigger="{ toggle }">
        <button
          type="button"
          class="flex h-9 items-center gap-2 rounded-full border px-3.5 text-xs font-semibold transition"
          :class="period === 'custom' ? 'border-ink bg-ink text-on-ink' : 'border-line bg-surface hover:bg-surface-2'"
          :aria-label="$t('analytics.customRange')"
          @click="toggle"
        >
          <PtIcon :icon="Calendar03Icon" :size="16" />
          <span>{{ period === "custom" ? customLabel : $t("analytics.customRange") }}</span>
        </button>
      </template>
      <div class="flex flex-col gap-3 p-3">
        <label class="flex flex-col gap-1 text-xs font-semibold text-muted">
          {{ $t("analytics.from") }}
          <input v-model="customFrom" type="date" :max="today" class="pt-field rounded-xl py-2" />
        </label>
        <label class="flex flex-col gap-1 text-xs font-semibold text-muted">
          {{ $t("analytics.to") }}
          <input v-model="customTo" type="date" :max="today" class="pt-field rounded-xl py-2" />
        </label>
        <PtButton size="sm" @click="applyCustom">{{ $t("analytics.apply") }}</PtButton>
      </div>
    </PtPopover>
  </div>
</template>
