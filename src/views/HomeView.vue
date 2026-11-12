<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useNow } from "@vueuse/core";
import {
  Alert02Icon,
  ArrowRight01Icon,
  Calendar03Icon,
  Fire02Icon,
  Folder01Icon,
  Loading03Icon,
  CheckmarkCircle02Icon,
  Clock01Icon,
} from "@hugeicons/core-free-icons";
import PtAvatarStack from "@/components/ui/PtAvatarStack.vue";
import PtEmpty from "@/components/ui/PtEmpty.vue";
import PtIcon from "@/components/ui/PtIcon.vue";
import PtProgress from "@/components/ui/PtProgress.vue";
import PtRing from "@/components/ui/PtRing.vue";
import PtSkeleton from "@/components/ui/PtSkeleton.vue";
import PriorityChip from "@/components/tasks/PriorityChip.vue";
import TaskRow from "@/components/tasks/TaskRow.vue";
import TaskRowSkeleton from "@/components/tasks/TaskRowSkeleton.vue";
import ProjectCardSkeleton from "@/components/projects/ProjectCardSkeleton.vue";
import { tasksApi } from "@/api/endpoints";
import { useApiError } from "@/composables/useApiError";
import { useRequest } from "@/composables/useRequest";
import { useTaskUi } from "@/composables/useTaskUi";
import { isTaskBusy, whileTaskBusy } from "@/composables/useTaskBusy";
import { dayjs } from "@/plugins/dayjs";
import { tableIcon } from "@/plugins/icons";
import { useProjectsStore } from "@/stores/projects";
import { useSessionStore } from "@/stores/session";
import type { Task } from "@/types/models";

/** Dashboard: greeting, week progress, next deadline, today's agenda and projects. */
const session = useSessionStore();
const projects = useProjectsStore();
const taskUi = useTaskUi();
const errors = useApiError();
const request = useRequest();
const now = useNow({ interval: 60_000 });
const { t } = useI18n();

const week = ref<Task[]>([]);
const mine = ref<Task[]>([]);
const loaded = ref(false);
const selectedDay = ref(dayjs().startOf("day"));

const greeting = computed(() => {
  const hour = dayjs(now.value).hour();
  return hour < 12 ? t("home.morning") : hour < 18 ? t("home.afternoon") : t("home.evening");
});
const firstName = computed(() => session.user?.name.split(" ")[0] ?? "");

const days = computed(() => Array.from({ length: 7 }, (_, i) => dayjs().startOf("isoWeek").add(i, "day")));
const weekStats = computed(() => {
  const live = week.value.filter((task) => task.status?.category !== "canceled");
  const done = live.filter((task) => task.status?.category === "done").length;
  const doing = live.filter((task) => task.status?.category === "in_progress").length;
  return { total: live.length, done, doing, todo: live.length - done - doing, rate: live.length ? Math.round((done / live.length) * 100) : 0 };
});

const open = computed(() => mine.value.filter((task) => !task.completed_at));
const overdue = computed(() => open.value.filter((task) => task.is_overdue));
const dueToday = computed(() => open.value.filter((task) => task.due_at && dayjs(task.due_at).isSame(dayjs(), "day") && !task.is_overdue));
const urgent = computed(() => open.value.filter((task) => task.priority === "urgent" || task.priority === "high"));
const next = computed(() => open.value.filter((task) => task.due_at && !task.is_overdue).sort((a, b) => dayjs(a.due_at).diff(dayjs(b.due_at)))[0]);
const nextIn = computed(() => (next.value?.due_at ? dayjs(next.value.due_at).from(dayjs(now.value)) : ""));

const dayTasks = computed(() =>
  mine.value.filter((task) => {
    const due = task.due_at ? dayjs(task.due_at) : null;
    const start = task.start_at ? dayjs(task.start_at) : null;
    const d = selectedDay.value;
    if (start && due) return d.isBetween(start, due, "day", "[]");
    return (due ?? start)?.isSame(d, "day") ?? false;
  }),
);
const hasTasksOn = (day: ReturnType<typeof dayjs>) =>
  mine.value.some((task) => (task.due_at && dayjs(task.due_at).isSame(day, "day")) || (task.start_at && dayjs(task.start_at).isSame(day, "day")));

async function load(): Promise<void> {
  try {
    const result = await request.run(async (signal) => {
      const from = dayjs().startOf("isoWeek").format("YYYY-MM-DD");
      const to = dayjs().endOf("isoWeek").format("YYYY-MM-DD");
      return Promise.all([
        tasksApi.list({ assignee_id: "me", from, to }, { signal }),
        tasksApi.list({ assignee_id: "me", dated: true, sort: "due_at", category: ["todo", "in_progress", "done"] }, { signal }),
      ]);
    });
    if (result) [week.value, mine.value] = result;
  } catch (error) {
    errors.report(error);
  } finally {
    loaded.value = true;
  }
}

async function toggle(task: Task): Promise<void> {
  if (isTaskBusy(task.id)) return;
  const updated = await whileTaskBusy(task.id, async () => {
    const statuses = (await tasksApi.get(task.id)).board?.statuses ?? [];
    const target = statuses.find((s) => s.category === (task.status?.category === "done" ? "todo" : "done"));
    return target ? tasksApi.move(task.id, target.id) : null;
  }).catch((error) => {
    errors.report(error);
    return null;
  });
  if (!updated) return;
  [mine, week].forEach((list) => (list.value = list.value.map((x) => (x.id === task.id ? { ...x, ...updated } : x))));
}

onMounted(load);
taskUi.onChanged(() => void load());

const projectProgress = (done = 0, total = 0) => (total ? Math.round((done / total) * 100) : 0);
</script>

<template>
  <div class="flex flex-col gap-7">
    <header class="relative flex flex-wrap items-end justify-between gap-4">
      <div v-stagger="0">
        <p class="text-lg text-muted">{{ greeting }}</p>
        <h1 class="text-4xl font-bold tracking-tight md:text-5xl">
          {{ firstName }} <span class="inline-block origin-[70%_70%] animate-[wave_2.2s_ease-in-out_1]">👋</span>
        </h1>
        <p class="mt-2 text-sm text-muted">{{ $t("home.subtitle") }}</p>
      </div>
      <p v-stagger="1" class="pt-hand -rotate-3 text-2xl text-muted max-sm:hidden rtl:rotate-3">{{ $t("auth.note") }} <span class="pt-arrow">↗</span></p>
    </header>

    <!-- Quick counters -->
    <div class="pt-scroll-x -mx-4 gap-3 px-4 md:-mx-8 md:px-8 lg:mx-0 lg:grid lg:grid-cols-3 lg:px-0 lg:after:hidden">
      <RouterLink
        v-for="(chip, i) in [
          { key: 'overdue', label: $t('home.overdue'), value: overdue.length, icon: Alert02Icon, tone: 'bg-danger-soft text-danger' },
          { key: 'today', label: $t('home.dueToday'), value: dueToday.length, icon: Clock01Icon, tone: 'bg-warning-soft text-warning' },
          { key: 'urgent', label: $t('home.highPriority'), value: urgent.length, icon: Fire02Icon, tone: 'bg-primary-soft text-primary' },
        ]"
        :key="chip.key"
        v-stagger="i + 1"
        to="/my-tasks"
        class="pt-card flex min-w-52 shrink-0 snap-start items-center gap-3 p-3.5 transition hover:shadow-float lg:min-w-0"
      >
        <span class="grid size-11 place-items-center rounded-2xl" :class="chip.tone"><PtIcon :icon="chip.icon" :size="20" /></span>
        <span class="flex-1">
          <PtSkeleton v-if="!loaded" class="mb-1 h-6 w-9 rounded-lg" />
          <span v-else class="block text-2xl leading-none font-bold tabular-nums">{{ chip.value }}</span>
          <span class="text-xs font-semibold text-muted">{{ chip.label }}</span>
        </span>
        <PtIcon :icon="ArrowRight01Icon" :size="16" class="text-subtle rtl:rotate-180" />
      </RouterLink>
    </div>

    <div class="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
      <!-- Week progress -->
      <section v-stagger="4" class="relative overflow-hidden rounded-(--radius-sheet) bg-ink p-6 text-on-ink shadow-float">
        <div class="pointer-events-none absolute -end-16 -top-20 size-64 rounded-full bg-sky/30 blur-3xl" />
        <div class="pointer-events-none absolute -bottom-24 start-10 size-56 rounded-full bg-[#E04047]/20 blur-3xl" />
        <img src="/brand/pilotask-icon.svg" alt="" class="pointer-events-none absolute end-6 bottom-6 w-20 opacity-15" />
        <div class="relative flex flex-wrap items-center gap-6">
          <span v-if="!loaded" class="pt-skeleton-dark grid size-28 shrink-0 place-items-center rounded-full">
            <span class="size-[90px] rounded-full bg-ink" />
          </span>
          <PtRing v-else :value="weekStats.rate" :size="112" :stroke="11">
            <span class="text-center">
              <span class="block text-2xl font-bold">{{ weekStats.rate }}%</span>
              <span class="block text-[10px] font-semibold uppercase opacity-60">{{ $t("home.progress") }}</span>
            </span>
          </PtRing>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold opacity-70">{{ $t("home.thisWeek") }}</p>
            <span v-if="!loaded" class="pt-skeleton-dark mt-2 mb-1 block h-9 w-28 rounded-xl" />
            <p v-else class="mt-1 text-4xl font-bold tabular-nums">
              {{ weekStats.done }}<span class="text-xl opacity-50"> / {{ weekStats.total }}</span>
            </p>
            <p class="text-sm opacity-70">{{ $t("home.tasksDone") }}</p>
          </div>
        </div>
        <div class="relative mt-6 grid grid-cols-3 gap-2">
          <div v-for="(stat, i) in [
            { label: $t('statusCategory.todo'), value: weekStats.todo, icon: Calendar03Icon },
            { label: $t('statusCategory.in_progress'), value: weekStats.doing, icon: Loading03Icon },
            { label: $t('statusCategory.done'), value: weekStats.done, icon: CheckmarkCircle02Icon },
          ]" :key="stat.label" v-stagger="i + 6" class="rounded-2xl bg-white/8 p-3 backdrop-blur">
            <PtIcon :icon="stat.icon" :size="16" class="opacity-70" />
            <span v-if="!loaded" class="pt-skeleton-dark mt-2 mb-1 block h-6 w-8 rounded-lg" />
            <p v-else class="mt-2 text-xl font-bold tabular-nums">{{ stat.value }}</p>
            <p class="truncate text-[11px] opacity-60">{{ stat.label }}</p>
          </div>
        </div>
      </section>

      <!-- Next deadline -->
      <section v-stagger="5" class="pt-card relative flex flex-col overflow-hidden p-5">
        <div class="pointer-events-none absolute -end-10 -top-10 size-40 rounded-full bg-primary-soft blur-2xl" />
        <p class="pt-label relative">{{ $t("home.nextDeadline") }}</p>
        <template v-if="!loaded">
          <PtSkeleton class="relative mt-2 h-8 w-40 rounded-xl" />
          <div class="relative mt-4 flex flex-1 flex-col gap-3 rounded-2xl bg-surface-2 p-4">
            <PtSkeleton class="h-5 w-20 rounded-full" />
            <PtSkeleton class="h-4 w-4/5 rounded-full" />
            <div class="mt-auto flex items-center justify-between">
              <PtSkeleton class="h-3 w-24 rounded-full" />
              <PtSkeleton class="h-6 w-14 rounded-full" />
            </div>
          </div>
        </template>
        <template v-else-if="next">
          <p class="relative mt-1 text-3xl font-bold text-primary">{{ nextIn }}</p>
          <button type="button" class="relative mt-4 flex-1 rounded-2xl bg-surface-2 p-4 text-start transition hover:bg-surface-3" @click="taskUi.openTask(next.id)">
            <PriorityChip :priority="next.priority" compact />
            <p class="mt-2 line-clamp-2 font-bold">{{ next.title }}</p>
            <div class="mt-3 flex items-center justify-between gap-2 text-xs text-muted">
              <span class="inline-flex min-w-0 items-center gap-1.5 truncate">
                <span class="size-2 rounded-full" :style="{ background: next.board?.color ?? 'var(--pt-subtle)' }" />{{ next.board?.name }}
              </span>
              <PtAvatarStack :users="next.assignees ?? []" :size="24" />
            </div>
          </button>
        </template>
        <div v-else class="relative flex flex-1 flex-col items-center justify-center py-6 text-center">
          <p class="pt-hand text-2xl text-muted">{{ $t("home.allClear") }}</p>
        </div>
      </section>
    </div>

    <!-- Agenda -->
    <section v-stagger="7" class="pt-card p-4">
      <div class="mb-3 flex items-center justify-between px-1">
        <h2 class="text-lg font-bold">{{ $t("home.todayTasks") }}</h2>
        <RouterLink to="/calendar" class="text-sm font-semibold text-muted hover:text-fg">{{ $t("nav.calendar") }} <span class="pt-arrow">→</span></RouterLink>
      </div>
      <div class="grid grid-cols-7 gap-1.5">
        <button
          v-for="(day, i) in days"
          :key="day.valueOf()"
          v-stagger="i + 8"
          type="button"
          class="flex flex-col items-center gap-1 rounded-2xl py-2.5 transition duration-200"
          :class="day.isSame(selectedDay, 'day') ? 'bg-ink text-on-ink shadow-soft' : 'hover:bg-surface-3'"
          @click="selectedDay = day"
        >
          <span class="text-[11px] font-semibold uppercase opacity-70">{{ day.format("dd") }}</span>
          <span class="text-base font-bold">{{ day.format("D") }}</span>
          <span class="size-1.5 rounded-full" :class="day.isSame(dayjs(), 'day') ? 'bg-danger' : loaded && hasTasksOn(day) ? 'bg-sky' : 'bg-transparent'" />
        </button>
      </div>
      <h3 class="mt-4 mb-1 px-1 text-sm font-semibold text-muted capitalize">{{ selectedDay.format("dddd D MMMM") }}</h3>
      <TaskRowSkeleton v-if="!loaded" class="-mx-1" :rows="3" />
      <div v-else-if="dayTasks.length" :key="selectedDay.valueOf()" class="-mx-1 divide-y divide-line/60">
        <TaskRow v-for="(task, i) in dayTasks" :key="task.id" v-stagger="i" :task="task" show-board dense @open="taskUi.openTask(task.id)" @toggle="toggle" />
      </div>
      <p v-else class="pt-hand px-1 py-6 text-center text-xl text-muted">{{ $t("home.noTasksToday") }}</p>
    </section>

    <!-- Projects -->
    <section>
      <div v-stagger="9" class="mb-3 flex items-center justify-between">
        <h2 class="text-lg font-bold">{{ $t("home.currentProjects") }}</h2>
        <RouterLink to="/projects" class="text-sm font-semibold text-muted hover:text-fg">{{ $t("common.seeAll") }} <span class="pt-arrow">→</span></RouterLink>
      </div>
      <PtEmpty v-if="projects.loaded && !projects.projects.length" :icon="Folder01Icon" :title="$t('projects.empty')" :hint="$t('projects.emptyHint')" />
      <div class="pt-scroll-x -mx-4 gap-4 px-4 pb-2 md:-mx-8 md:px-8">
        <template v-if="!projects.loaded">
          <ProjectCardSkeleton v-for="i in 3" :key="`sk-${i}`" />
        </template>
        <RouterLink
          v-for="(project, i) in projects.projects"
          :key="project.id"
          v-stagger="i + 10"
          :to="`/projects/${project.id}`"
          class="pt-card group w-64 shrink-0 snap-start overflow-hidden transition hover:shadow-float"
        >
          <div
            class="relative h-28 overflow-hidden p-4"
            :style="{
              background: `radial-gradient(120% 120% at 100% 0%, color-mix(in oklab, ${project.color ?? '#171E23'} 55%, transparent), transparent 60%), linear-gradient(135deg, color-mix(in oklab, ${project.color ?? '#171E23'} 22%, var(--pt-surface)), var(--pt-surface-2))`,
            }"
          >
            <PtIcon :icon="tableIcon(project.icon)" :size="88" class="absolute -end-4 -bottom-5 text-white/30 transition duration-500 group-hover:scale-110 group-hover:-rotate-6" />
            <span class="relative grid size-11 place-items-center rounded-2xl text-white shadow-soft" :style="{ background: project.color ?? 'var(--pt-ink)' }">
              <PtIcon :icon="tableIcon(project.icon)" :size="22" />
            </span>
            <span class="absolute end-3 top-3 rounded-full bg-surface/90 px-2.5 py-1 text-[11px] font-bold backdrop-blur">
              {{ $t("projects.tables", project.boards?.length ?? 0) }}
            </span>
          </div>
          <div class="p-4">
            <h3 class="truncate font-bold">{{ project.name }}</h3>
            <p class="mt-0.5 truncate text-xs text-muted">{{ project.description || "—" }}</p>
            <div class="mt-4 flex items-center justify-between text-xs font-semibold">
              <span class="text-muted">{{ project.done_count ?? 0 }} / {{ project.tasks_count ?? 0 }}</span>
              <span class="tabular-nums">{{ projectProgress(project.done_count, project.tasks_count) }}%</span>
            </div>
            <PtProgress class="mt-1.5" :value="projectProgress(project.done_count, project.tasks_count)" :color="project.color ?? undefined" />
          </div>
        </RouterLink>
      </div>
    </section>
  </div>
</template>

<style scoped>
@keyframes wave {
  0%, 100% { transform: rotate(0); }
  20%, 60% { transform: rotate(16deg); }
  40%, 80% { transform: rotate(-8deg); }
}
</style>
