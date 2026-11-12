<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { useNow } from "@vueuse/core";
import {
  Alert02Icon,
  ArrowRight01Icon,
    Clock01Icon,
  PauseIcon,
  UserRemove01Icon,
} from "@hugeicons/core-free-icons";
import PtAvatarStack from "@/components/ui/PtAvatarStack.vue";
import PtIcon from "@/components/ui/PtIcon.vue";
import PtProgress from "@/components/ui/PtProgress.vue";
import PtRing from "@/components/ui/PtRing.vue";
import TeamLoadList from "@/components/analytics/TeamLoadList.vue";
import PtSkeleton from "@/components/ui/PtSkeleton.vue";
import PriorityChip from "@/components/tasks/PriorityChip.vue";
import { dashboardApi, type DashboardOverview } from "@/api/endpoints";
import { useApiError } from "@/composables/useApiError";
import { useRequest } from "@/composables/useRequest";
import { useTaskUi } from "@/composables/useTaskUi";
import { dayjs } from "@/plugins/dayjs";
import { tableIcon, type Icon } from "@/plugins/icons";
import { useSessionStore } from "@/stores/session";
import type { Task } from "@/types/models";

/**
 * Home for managers and viewers: no browsing, just what needs a decision.
 * Tiles count what is late, due within 48 h, without an owner or stuck for a
 * week; the list below shows the most pressing ones of the chosen tile.
 * On the side: projects at risk and who is overloaded.
 */
type Bucket = "overdue" | "due_soon" | "unassigned" | "stalled";

const { t } = useI18n();
const session = useSessionStore();
const taskUi = useTaskUi();
const router = useRouter();
const errors = useApiError();
const request = useRequest();
const loading = request.loading;
const now = useNow({ interval: 60_000 });

const data = ref<DashboardOverview | null>(null);
const bucket = ref<Bucket>("overdue");

const greeting = computed(() => {
  const hour = dayjs(now.value).hour();
  return hour < 12 ? t("home.morning") : hour < 18 ? t("home.afternoon") : t("home.evening");
});
const firstName = computed(() => session.user?.name.split(" ")[0] ?? "");

// Each tile wears its colour: a tinted card, a solid icon bubble, a ring when picked.
const TILES: { key: Bucket; icon: Icon; color: string }[] = [
  { key: "overdue", icon: Alert02Icon, color: "#E04047" },
  { key: "due_soon", icon: Clock01Icon, color: "#E8962E" },
  { key: "unassigned", icon: UserRemove01Icon, color: "#2F7FD0" },
  { key: "stalled", icon: PauseIcon, color: "#8B6CF0" },
];

// Two-week trend as small paired bars (completed solid, created faint).
const trendMax = computed(() => Math.max(1, ...(data.value?.trend ?? []).flatMap((d) => [d.created, d.completed])));
const healthColor = computed(() => {
  const v = data.value?.health.on_track ?? 0;
  return v >= 80 ? "#3CCF8E" : v >= 55 ? "#F2A93B" : "#FF6B70";
});

const items = computed<Task[]>(() => data.value?.lists[bucket.value] ?? []);
const count = (key: Bucket) => data.value?.counts[key] ?? 0;
const needsAction = computed(() => (data.value ? count("overdue") + count("due_soon") + count("unassigned") + count("stalled") : 0));

/** Why this task is in the list, in a few words. */
function reason(task: Task): string {
  const days = (iso: string | null | undefined) => Math.max(1, Math.abs(dayjs(now.value).diff(dayjs(iso), "day")));
  switch (bucket.value) {
    case "overdue":
      return t("manager.reasons.late", { n: days(task.due_at) }, days(task.due_at));
    case "due_soon":
      return dayjs(task.due_at).from(dayjs(now.value));
    case "unassigned":
      return task.due_at ? t("manager.reasons.noOwnerDue", { when: dayjs(task.due_at).fromNow() }) : t("manager.reasons.noOwner");
    default:
      return t("manager.reasons.idle", { n: days(task.updated_at) }, days(task.updated_at));
  }
}

const reasonTone = computed(
  () =>
    ({
      overdue: "bg-danger-soft text-danger",
      due_soon: "bg-warning-soft text-warning",
      unassigned: "bg-primary-soft text-primary",
      stalled: "bg-surface-3 text-muted",
    })[bucket.value],
);

const RISK_TONE = { late: "bg-danger text-white", overdue: "bg-danger-soft text-danger", tight: "bg-warning-soft text-warning" } as const;

async function load(): Promise<void> {
  try {
    const result = await request.run((signal) => dashboardApi.overview({ signal }));
    if (!result) return;
    data.value = result;
    // Open on the most urgent tile that has something in it.
    if (!result.counts[bucket.value]) bucket.value = (["overdue", "due_soon", "unassigned", "stalled"] as Bucket[]).find((k) => result.counts[k]) ?? "overdue";
  } catch (error) {
    errors.report(error);
  }
}

onMounted(load);
taskUi.onChanged(() => void load());
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- Hero: greeting, how healthy the open work is, and the last two weeks. -->
    <section v-stagger="0" class="relative overflow-hidden rounded-(--radius-sheet) bg-ink p-5 text-on-ink shadow-float md:p-6">
      <div class="pointer-events-none absolute -end-16 -top-24 size-72 rounded-full bg-sky/30 blur-3xl" />
      <div class="pointer-events-none absolute -bottom-28 start-6 size-64 rounded-full bg-[#E04047]/20 blur-3xl" />
      <img src="/brand/pilotask-icon.svg" alt="" class="pointer-events-none absolute end-6 bottom-6 w-16 opacity-10" />

      <div class="relative flex flex-wrap items-center gap-x-8 gap-y-5">
        <div class="min-w-0 flex-1 basis-56">
          <p class="text-sm font-semibold opacity-70">{{ greeting }}</p>
          <h1 class="text-3xl font-bold tracking-tight md:text-4xl">{{ firstName }}</h1>
          <p class="mt-2 text-sm opacity-75">
            <template v-if="!data">&nbsp;</template>
            <template v-else-if="needsAction">{{ $t("manager.summary", { n: needsAction }, needsAction) }}</template>
            <template v-else>{{ $t("manager.allClear") }}</template>
          </p>
        </div>

        <div class="flex items-center gap-4">
          <span v-if="!data" class="pt-skeleton-dark grid size-24 shrink-0 place-items-center rounded-full"><span class="size-[76px] rounded-full bg-ink" /></span>
          <PtRing v-else :value="data.health.on_track" :size="96" :stroke="10" :color="healthColor" track="rgb(255 255 255 / 0.14)">
            <span class="text-center">
              <span class="block text-xl font-bold">{{ data.health.on_track }}%</span>
              <span class="block text-[9px] font-semibold uppercase opacity-60">{{ $t("manager.onTrack") }}</span>
            </span>
          </PtRing>
          <dl class="grid grid-cols-1 gap-1.5 text-sm">
            <div v-for="stat in [
              { label: $t('manager.openWork'), value: data?.counts.open },
              { label: $t('manager.doneToday'), value: data?.counts.done_today },
              { label: $t('manager.doneWeek'), value: data?.health.done_week },
            ]" :key="stat.label" class="flex items-baseline gap-2">
              <dd class="min-w-8 text-lg font-bold tabular-nums">
                <span v-if="!data" class="pt-skeleton-dark inline-block h-4 w-6 rounded" />
                <template v-else>{{ stat.value }}</template>
              </dd>
              <dt class="text-xs opacity-65">{{ stat.label }}</dt>
            </div>
          </dl>
        </div>

        <!-- 14-day trend: done (solid) vs created (faint). -->
        <div class="w-full md:w-60">
          <p class="mb-2 flex items-center justify-between text-[11px] font-semibold opacity-70">
            <span>{{ $t("manager.twoWeeks") }}</span>
            <span class="flex gap-3">
              <span class="inline-flex items-center gap-1"><span class="size-2 rounded-sm bg-[#3CCF8E]" />{{ $t("analytics.completed") }}</span>
              <span class="inline-flex items-center gap-1"><span class="size-2 rounded-sm bg-white/30" />{{ $t("analytics.created") }}</span>
            </span>
          </p>
          <div class="flex h-14 items-end gap-1" dir="ltr">
            <template v-if="data">
              <div v-for="day in data.trend" :key="day.date" class="flex h-full flex-1 items-end gap-px" :title="`${dayjs(day.date).format('D MMM')} · ${day.completed} / ${day.created}`">
                <span class="flex-1 rounded-t-sm bg-[#3CCF8E] transition-[height] duration-500" :style="{ height: `${Math.max(4, (day.completed / trendMax) * 100)}%` }" />
                <span class="flex-1 rounded-t-sm bg-white/25 transition-[height] duration-500" :style="{ height: `${Math.max(4, (day.created / trendMax) * 100)}%` }" />
              </div>
            </template>
            <span v-else class="pt-skeleton-dark block h-full w-full rounded-lg" />
          </div>
        </div>
      </div>
    </section>

    <!-- What needs a decision: tap a tile to see those tasks. -->
    <div class="grid grid-cols-2 gap-3 lg:grid-cols-4" role="tablist">
      <button
        v-for="(tile, i) in TILES"
        :key="tile.key"
        v-stagger="i + 1"
        type="button"
        role="tab"
        :aria-selected="bucket === tile.key"
        class="relative flex flex-col gap-2 overflow-hidden rounded-(--radius-card) border p-4 text-start transition duration-200 hover:-translate-y-0.5 hover:shadow-float active:scale-[0.98]"
        :style="{
          background: `color-mix(in oklab, ${tile.color} ${bucket === tile.key ? 16 : 8}%, var(--pt-surface))`,
          borderColor: bucket === tile.key ? tile.color : `color-mix(in oklab, ${tile.color} 22%, var(--pt-border))`,
          boxShadow: bucket === tile.key ? `0 10px 28px -14px ${tile.color}` : undefined,
        }"
        @click="bucket = tile.key"
      >
        <span class="pointer-events-none absolute -end-6 -top-6 size-20 rounded-full opacity-20 blur-xl" :style="{ background: tile.color }" />
        <span class="relative flex items-center justify-between gap-2">
          <span class="grid size-9 place-items-center rounded-xl text-white shadow-soft" :style="{ background: tile.color }"><PtIcon :icon="tile.icon" :size="17" /></span>
          <PtSkeleton v-if="!data" class="h-8 w-10 rounded-lg" />
          <span v-else class="text-3xl font-bold tracking-tight tabular-nums" :style="{ color: count(tile.key) ? tile.color : 'var(--pt-subtle)' }">{{ count(tile.key) }}</span>
        </span>
        <span class="relative mt-1 text-sm font-bold">{{ $t(`manager.buckets.${tile.key}`) }}</span>
        <span class="relative line-clamp-2 text-[11px] leading-snug text-muted">
          {{ $t(`manager.hints.${tile.key}`, data?.thresholds ? { days: data.thresholds.stall_days, hours: data.thresholds.soon_hours } : { days: 7, hours: 48 }) }}
        </span>
      </button>
    </div>

    <div class="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <!-- The tasks behind the chosen tile, most pressing first. -->
      <section v-stagger="5" class="pt-card relative overflow-hidden p-2" :aria-busy="loading">
        <span v-if="loading && data" class="pt-bar-loading absolute inset-x-0 top-0 h-0.5" />
        <h2 class="flex items-center justify-between gap-2 px-3 pt-2 pb-1">
          <span class="text-base font-bold">{{ $t(`manager.buckets.${bucket}`) }}</span>
          <span v-if="data && count(bucket) > items.length" class="text-xs font-semibold text-muted">
            {{ $t("manager.showing", { shown: items.length, total: count(bucket) }) }}
          </span>
        </h2>

        <div v-if="!data" class="flex flex-col gap-1 p-1">
          <div v-for="i in 4" :key="i" class="flex items-center gap-3 rounded-2xl px-3 py-3">
            <div class="min-w-0 flex-1 space-y-2"><PtSkeleton class="h-3.5 w-2/3 rounded-full" /><PtSkeleton class="h-3 w-1/3 rounded-full" /></div>
            <PtSkeleton class="h-6 w-20 rounded-full" />
          </div>
        </div>
        <p v-else-if="!items.length" class="pt-hand px-3 py-10 text-center text-2xl text-muted">{{ $t("manager.nothing") }}</p>
        <ul v-else :key="bucket" class="divide-y divide-line/60">
          <li v-for="(task, i) in items" :key="task.id" v-stagger="i">
            <button type="button" class="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-start transition hover:bg-surface-2" @click="taskUi.openTask(task.id)">
              <span class="size-2.5 shrink-0 rounded-full" :style="{ background: task.board?.color ?? 'var(--pt-subtle)' }" />
              <span class="min-w-0 flex-1">
                <span class="block truncate text-sm font-semibold">{{ task.title }}</span>
                <span class="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted">
                  {{ task.board?.name }}
                  <PriorityChip v-if="task.priority === 'urgent' || task.priority === 'high'" :priority="task.priority" compact />
                </span>
              </span>
              <span class="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold whitespace-nowrap" :class="reasonTone">{{ reason(task) }}</span>
              <PtAvatarStack v-if="task.assignees?.length" class="max-sm:hidden" :users="task.assignees" :size="24" />
              <PtIcon :icon="ArrowRight01Icon" :size="16" class="shrink-0 text-subtle rtl:rotate-180" />
            </button>
          </li>
        </ul>
      </section>

      <div class="flex flex-col gap-5">
        <!-- Projects at risk -->
        <section v-stagger="7" class="pt-card p-4">
          <h2 class="mb-3 text-base font-bold">{{ $t("manager.atRisk") }}</h2>
          <div v-if="!data" class="flex flex-col gap-4">
            <div v-for="i in 3" :key="i" class="space-y-2"><PtSkeleton class="h-4 w-1/2 rounded-full" /><PtSkeleton class="h-2 w-full rounded-full" /></div>
          </div>
          <p v-else-if="!data.projects.length" class="py-4 text-center text-sm text-muted">{{ $t("manager.noRisk") }}</p>
          <ul v-else class="flex flex-col gap-4">
            <li v-for="(project, i) in data.projects" :key="project.id" v-stagger="i">
              <RouterLink :to="`/projects/${project.id}`" class="group block">
                <div class="mb-1.5 flex items-center gap-2.5">
                  <span class="grid size-7 shrink-0 place-items-center rounded-lg text-white" :style="{ background: project.color ?? 'var(--pt-ink)' }">
                    <PtIcon :icon="tableIcon(project.icon)" :size="14" />
                  </span>
                  <span class="min-w-0 flex-1 truncate text-sm font-semibold group-hover:underline">{{ project.name }}</span>
                  <span class="rounded-full px-2 py-0.5 text-[10px] font-bold whitespace-nowrap" :class="RISK_TONE[project.risk]">
                    {{ $t(`manager.risk.${project.risk}`, { n: Math.abs(project.days_left ?? 0) }) }}
                  </span>
                </div>
                <PtProgress :value="project.progress" :color="project.color ?? undefined" />
                <p class="mt-1 flex justify-between text-[11px] text-muted">
                  <span>{{ project.done }}/{{ project.total }} · {{ project.progress }}%</span>
                  <span v-if="project.overdue" class="font-semibold text-danger">{{ $t("manager.lateTasks", { n: project.overdue }, project.overdue) }}</span>
                </p>
              </RouterLink>
            </li>
          </ul>
        </section>

        <!-- Team load -->
        <section v-stagger="8" class="pt-card p-4">
          <h2 class="mb-3 text-base font-bold">{{ $t("manager.team") }}</h2>
          <div v-if="!data" class="flex flex-col gap-3">
            <div v-for="i in 4" :key="i" class="flex items-center gap-3"><PtSkeleton class="size-8 rounded-full" /><PtSkeleton class="h-2.5 flex-1 rounded-full" /></div>
          </div>
          <TeamLoadList v-else :rows="data.team" @pick="(row) => row.user && router.push({ path: '/analytics', query: { scope: 'user', id: row.user.id } })" />
        </section>
      </div>
    </div>
  </div>
</template>
