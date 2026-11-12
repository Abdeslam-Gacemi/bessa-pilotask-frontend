<script setup lang="ts">
import { computed, ref } from "vue";
import { ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import PtIconButton from "@/components/ui/PtIconButton.vue";
import PtSegmented from "@/components/ui/PtSegmented.vue";
import PtAvatarStack from "@/components/ui/PtAvatarStack.vue";
import { dayjs } from "@/plugins/dayjs";
import { timelineBars } from "@/domain/timeline";
import { taskAccent } from "@/domain/tasks";
import { usePreferencesStore } from "@/stores/preferences";
import type { Task } from "@/types/models";

/** A Gantt-style window over dated tasks; undated tasks are listed apart. */
const props = defineProps<{ tasks: Task[] }>();
defineEmits<{ open: [task: Task] }>();

const prefs = usePreferencesStore();
const span = ref<"14" | "30">("14");
const from = ref(dayjs().startOf("isoWeek"));
const days = computed(() => Number(span.value));
const DAY = computed(() => (days.value === 14 ? 64 : 36));

const range = computed(() => Array.from({ length: days.value }, (_, i) => from.value.add(i, "day")));
const bars = computed(() => timelineBars(props.tasks, from.value, days.value));
const undated = computed(() => props.tasks.filter((t) => !t.start_at && !t.due_at));
const todayOffset = computed(() => dayjs().diff(from.value, "hour") / 24);

function shift(direction: 1 | -1): void {
  from.value = from.value.add(direction * (days.value === 14 ? 7 : 14), "day");
}

function barStyle(offset: number, width: number, color: string) {
  const side = prefs.isRtl ? "right" : "left";
  return { [side]: `${offset * DAY.value}px`, width: `${Math.max(width * DAY.value, 28)}px`, background: color };
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-wrap items-center gap-2">
      <PtIconButton :icon="ArrowLeft01Icon" class="rtl:rotate-180" :label="$t('common.back')" variant="surface" @click="shift(-1)" />
      <PtIconButton :icon="ArrowRight01Icon" class="rtl:rotate-180" :label="$t('common.more')" variant="surface" @click="shift(1)" />
      <button type="button" class="pt-chip" @click="from = dayjs().startOf('isoWeek')">{{ $t("calendar.today") }}</button>
      <span class="text-sm font-bold capitalize">{{ from.format("D MMM") }} – {{ from.add(days - 1, "day").format("D MMM YYYY") }}</span>
      <PtSegmented
        v-model="span"
        size="sm"
        class="ms-auto"
        :options="[
          { value: '14', label: $t('calendar.twoWeeks') },
          { value: '30', label: $t('calendar.thirtyDays') },
        ]"
      />
    </div>

    <div class="pt-card overflow-x-auto p-0">
      <div class="relative" :style="{ width: `${days * DAY}px`, minWidth: '100%' }">
        <div class="sticky top-0 flex border-b border-line bg-surface">
          <div
            v-for="day in range"
            :key="day.valueOf()"
            class="shrink-0 border-e border-line/60 py-2 text-center"
            :class="day.isSame(dayjs(), 'day') ? 'text-primary' : day.isoWeekday() > 5 ? 'text-subtle' : 'text-muted'"
            :style="{ width: `${DAY}px` }"
          >
            <p class="text-[10px] font-semibold uppercase">{{ day.format("dd") }}</p>
            <p class="text-sm font-bold">{{ day.format("D") }}</p>
          </div>
        </div>

        <div class="relative py-2" :style="{ minHeight: `${Math.max(bars.length, 3) * 44 + 16}px` }">
          <div class="pointer-events-none absolute inset-0 flex">
            <div
              v-for="day in range"
              :key="day.valueOf()"
              class="shrink-0 border-e border-line/40"
              :class="day.isoWeekday() > 5 && 'bg-surface-2'"
              :style="{ width: `${DAY}px` }"
            />
          </div>
          <div
            v-if="todayOffset >= 0 && todayOffset <= days"
            class="pointer-events-none absolute inset-y-0 z-10 w-0.5 bg-danger"
            :style="{ [prefs.isRtl ? 'right' : 'left']: `${todayOffset * DAY}px` }"
          />
          <button
            v-for="(bar, row) in bars"
            :key="bar.task.id"
            v-stagger="row"
            type="button"
            class="absolute flex h-9 items-center gap-2 overflow-hidden rounded-xl px-2.5 text-start text-xs font-semibold text-white shadow-soft transition hover:brightness-110"
            :class="[bar.clippedStart && 'rounded-s-none', bar.clippedEnd && 'rounded-e-none', bar.task.completed_at && 'opacity-60']"
            :style="{ top: `${row * 44 + 8}px`, ...barStyle(bar.offset, bar.span, taskAccent(bar.task)) }"
            :title="bar.task.title"
            @click="$emit('open', bar.task)"
          >
            <span class="truncate">{{ bar.task.title }}</span>
            <PtAvatarStack class="ms-auto max-sm:hidden" :users="bar.task.assignees ?? []" :size="20" :max="2" />
          </button>
        </div>
      </div>
    </div>

    <section v-if="undated.length" class="pt-card p-4">
      <h3 class="pt-label mb-2">{{ $t("tasks.noDates") }} · {{ undated.length }}</h3>
      <div class="flex flex-wrap gap-2">
        <button v-for="task in undated" :key="task.id" type="button" class="pt-chip" @click="$emit('open', task)">
          <span class="size-2 rounded-full" :style="{ background: taskAccent(task) }" />
          {{ task.title }}
        </button>
      </div>
    </section>
  </div>
</template>
