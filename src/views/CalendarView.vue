<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useBreakpoints, breakpointsTailwind } from "@vueuse/core";
import { ArrowLeft01Icon, ArrowRight01Icon, Add01Icon } from "@hugeicons/core-free-icons";
import PtIconButton from "@/components/ui/PtIconButton.vue";
import PtSegmented from "@/components/ui/PtSegmented.vue";
import TaskRow from "@/components/tasks/TaskRow.vue";
import TaskRowSkeleton from "@/components/tasks/TaskRowSkeleton.vue";
import PtSkeleton from "@/components/ui/PtSkeleton.vue";
import FilterButton from "@/components/filters/FilterButton.vue";
import TaskFilterSheet from "@/components/filters/TaskFilterSheet.vue";
import { useTaskFilters } from "@/composables/useTaskFilters";
import { useAccess } from "@/composables/useAccess";
import { tasksApi } from "@/api/endpoints";
import { useApiError } from "@/composables/useApiError";
import { useRequest } from "@/composables/useRequest";
import { useTaskUi } from "@/composables/useTaskUi";
import { monthGrid, tasksOnDay, weekDays } from "@/domain/calendar";
import { taskAccent } from "@/domain/tasks";
import { dayjs } from "@/plugins/dayjs";
import { useSessionStore } from "@/stores/session";
import type { Task } from "@/types/models";

/**
 * Calendar of every task the person can see (or only theirs). Month grid on
 * large screens; on phones a week strip with the selected day's agenda.
 */
const session = useSessionStore();
const taskUi = useTaskUi();
const errors = useApiError();
const isDesktop = useBreakpoints(breakpointsTailwind).greaterOrEqual("md");

const mode = ref<"month" | "week">("month");
const anchor = ref(dayjs().startOf("day"));
const selected = ref(dayjs().startOf("day"));
const onlyMine = ref(false);
const request = useRequest();
const loading = request.loading;
const loaded = ref<Task[]>([]);
const taskFilters = useTaskFilters(loaded);
const access = useAccess();
// Others' tasks reach managers, and users in tables with team visibility on: offer "mine" / people only then.
const seesTeam = computed(() => access.canManage.value || onlyMine.value || loaded.value.some((task) => !task.assignees?.some((u) => u.id === session.user?.id)));
const HIDE_PEOPLE = computed(() => !seesTeam.value);
const tasks = taskFilters.filtered;

const effectiveMode = computed(() => (isDesktop.value ? mode.value : "week"));
const days = computed(() => (effectiveMode.value === "month" ? monthGrid(anchor.value) : weekDays(anchor.value)));
const weekdayNames = computed(() => weekDays(dayjs()).map((d) => d.format("ddd")));
const selectedTasks = computed(() => tasksOnDay(tasks.value, selected.value));

async function load(): Promise<void> {
  const first = days.value[0]!;
  const last = days.value[days.value.length - 1]!;
  try {
    const result = await request.run((signal) =>
      tasksApi.list(
        { from: first.format("YYYY-MM-DD"), to: last.format("YYYY-MM-DD"), assignee_id: onlyMine.value ? "me" : undefined, sort: "due_at" },
        { signal },
      ),
    );
    if (result) loaded.value = result;
  } catch (error) {
    errors.report(error);
  }
}

function shift(direction: 1 | -1): void {
  anchor.value = anchor.value.add(direction, effectiveMode.value === "month" ? "month" : "week");
  if (effectiveMode.value === "week") selected.value = selected.value.add(direction, "week");
}

function today(): void {
  anchor.value = dayjs().startOf("day");
  selected.value = anchor.value;
}

function addOn(day: ReturnType<typeof dayjs>): void {
  taskUi.createTask({ due: day.hour(17).toISOString() });
}

watch([days, onlyMine], load, { immediate: false });
onMounted(load);
taskUi.onChanged(() => void load());
</script>

<template>
  <div class="flex flex-col gap-5">
    <header class="flex flex-wrap items-center gap-2">
      <h1 class="me-auto text-3xl font-bold capitalize">{{ anchor.format("MMMM YYYY") }}</h1>
      <PtSegmented
        v-if="isDesktop"
        v-model="mode"
        size="sm"
        :options="[
          { value: 'month', label: $t('calendar.month') },
          { value: 'week', label: $t('calendar.week') },
        ]"
      />
      <button
        v-if="seesTeam"
        type="button"
        class="h-9 rounded-full border px-3.5 text-xs font-semibold transition"
        :class="onlyMine ? 'border-ink bg-ink text-on-ink' : 'border-line bg-surface hover:bg-surface-2'"
        :aria-pressed="onlyMine"
        @click="onlyMine = !onlyMine"
      >
        {{ $t("tasks.onlyMine") }}
      </button>
      <FilterButton :count="taskFilters.count.value" @click="taskFilters.open.value = true" />
      <button type="button" class="pt-chip" @click="today">{{ $t("calendar.today") }}</button>
      <PtIconButton :icon="ArrowLeft01Icon" class="rtl:rotate-180" :label="$t('common.back')" variant="surface" @click="shift(-1)" />
      <PtIconButton :icon="ArrowRight01Icon" class="rtl:rotate-180" :label="$t('common.more')" variant="surface" @click="shift(1)" />
    </header>

    <!-- Month / week grid (desktop) -->
    <section v-if="isDesktop" class="pt-card relative overflow-hidden p-0" :aria-busy="loading">
      <span v-if="loading" class="pt-bar-loading absolute inset-x-0 top-0 z-10 h-0.5" />
      <div class="grid grid-cols-7 border-b border-line">
        <div v-for="name in weekdayNames" :key="name" class="py-2.5 text-center text-xs font-bold text-muted uppercase">{{ name }}</div>
      </div>
      <div class="grid grid-cols-7">
        <div
          v-for="day in days"
          :key="day.valueOf()"
          class="group relative flex flex-col gap-1 border-e border-b border-line/70 p-1.5 transition hover:bg-surface-2"
          :class="[effectiveMode === 'month' ? 'min-h-32' : 'min-h-[28rem]', !day.isSame(anchor, 'month') && effectiveMode === 'month' && 'bg-surface-2/60 text-subtle']"
        >
          <div class="flex items-center justify-between px-1">
            <span
              class="grid size-7 place-items-center rounded-full text-sm font-bold"
              :class="day.isSame(dayjs(), 'day') && 'bg-ink text-on-ink'"
            >
              {{ day.format("D") }}
            </span>
            <PtIconButton
              v-if="session.canCreate"
              :icon="Add01Icon"
              :size="14"
              :label="$t('tasks.new')"
              class="!size-7 opacity-0 transition group-hover:opacity-100 focus:opacity-100"
              @click="addOn(day)"
            />
          </div>
          <!-- First load: placeholder chips; later loads (prev / next) keep the old ones, dimmed. -->
          <template v-if="loading && !tasks.length">
            <PtSkeleton v-for="n in (day.date() + day.month()) % 3" :key="n" class="h-6 rounded-lg" :class="n % 2 ? 'w-full' : 'w-3/4'" />
          </template>
          <button
            v-for="task in tasksOnDay(tasks, day).slice(0, effectiveMode === 'month' ? 3 : 12)"
            :key="task.id"
            type="button"
            class="truncate rounded-lg px-2 py-1 text-start text-[11px] font-semibold transition hover:brightness-95"
            :class="[task.completed_at && 'opacity-60', loading && 'opacity-40']"
            :style="{ background: `color-mix(in oklab, ${taskAccent(task)} 18%, var(--pt-surface))`, color: 'var(--pt-text)', borderInlineStart: `3px solid ${taskAccent(task)}` }"
            :title="task.title"
            @click="taskUi.openTask(task.id)"
          >
            {{ task.title }}
          </button>
          <span v-if="effectiveMode === 'month' && tasksOnDay(tasks, day).length > 3" class="px-2 text-[11px] font-semibold text-muted">
            {{ $t("calendar.more", { n: tasksOnDay(tasks, day).length - 3 }) }}
          </span>
        </div>
      </div>
    </section>

    <!-- Week strip + agenda (phones) -->
    <template v-else>
      <div class="grid grid-cols-7 gap-1.5">
        <button
          v-for="day in days"
          :key="day.valueOf()"
          type="button"
          class="flex flex-col items-center gap-1 rounded-2xl py-2.5 transition"
          :class="day.isSame(selected, 'day') ? 'bg-ink text-on-ink shadow-soft' : 'bg-surface'"
          @click="selected = day"
        >
          <span class="text-[10px] font-semibold uppercase opacity-70">{{ day.format("dd") }}</span>
          <span class="text-base font-bold">{{ day.format("D") }}</span>
          <span v-if="loading" class="size-1 animate-pulse rounded-full bg-current opacity-30" />
          <span v-else class="size-1 rounded-full" :class="tasksOnDay(tasks, day).length ? 'bg-sky' : 'bg-transparent'" />
        </button>
      </div>
      <section class="pt-card p-2">
        <h2 class="px-3 pt-2 pb-1 text-sm font-bold capitalize">{{ selected.format("dddd D MMMM") }}</h2>
        <TaskRowSkeleton v-if="loading" :rows="3" />
        <div v-else-if="selectedTasks.length" class="divide-y divide-line/60">
          <TaskRow v-for="(task, i) in selectedTasks" :key="task.id" v-stagger="i" :task="task" show-board @open="taskUi.openTask(task.id)" />
        </div>
        <p v-else class="px-3 py-8 text-center text-sm text-muted">{{ $t("calendar.noTasks") }}</p>
      </section>
    </template>
    <TaskFilterSheet
      v-model="taskFilters.open.value"
      :filters="taskFilters.filters"
      :users="taskFilters.people.value"
      :labels="taskFilters.labels.value"
      :projects="taskFilters.projects.value"
      :entities="access.filtersByEntity.value ? access.entities.entities : []"
      :hide-people="HIDE_PEOPLE"
      :results="tasks.length"
      @reset="taskFilters.reset"
    />
  </div>
</template>
