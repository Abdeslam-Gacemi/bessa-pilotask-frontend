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
import PtIcon from "@/components/ui/PtIcon.vue";
import PtProgress from "@/components/ui/PtProgress.vue";
import PtRing from "@/components/ui/PtRing.vue";
import TeamLoadList from "@/components/analytics/TeamLoadList.vue";
import PtSkeleton from "@/components/ui/PtSkeleton.vue";
import { dashboardApi, type DashboardBucket, type DashboardOverview } from "@/api/endpoints";
import DecisionListSheet from "@/components/home/DecisionListSheet.vue";
import DecisionTaskRow from "@/components/home/DecisionTaskRow.vue";
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
type Bucket = DashboardBucket;

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

// Each tile wears its colour; the picked one turns into a rich gradient widget (see the styles below).
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

// "See all": the chosen tile's tasks in full, in a side sheet.
const showAll = ref(false);

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
              <span class="block text-xl leading-tight font-bold">{{ data.health.on_track }}%</span>
              <!-- Kept inside the ring's 76px opening: wraps to two lines rather than running over the stroke. -->
              <span class="mx-auto block max-w-[3.75rem] text-[9px] leading-[1.15] font-semibold text-balance uppercase opacity-60">{{ $t("manager.onTrack") }}</span>
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
        class="tile relative isolate flex flex-col gap-1.5 overflow-hidden rounded-[1.5rem] p-4 text-start"
        :class="bucket === tile.key && 'tile-on'"
        :style="{ '--tile': tile.color }"
        @click="bucket = tile.key"
      >
        <span class="tile-glow pointer-events-none absolute inset-0 -z-10" aria-hidden="true" />
        <span class="flex items-center justify-between gap-2">
          <span class="tile-icon grid size-9 shrink-0 place-items-center rounded-xl">
            <PtIcon :icon="tile.icon" :size="17" />
          </span>
          <PtSkeleton v-if="!data" class="h-8 w-10 rounded-lg" />
          <span v-else class="tile-count text-3xl leading-none font-bold tracking-tight tabular-nums" :class="!count(tile.key) && 'is-zero'">
            {{ count(tile.key) }}
          </span>
        </span>
        <span class="tile-name mt-1.5 text-sm font-bold">{{ $t(`manager.buckets.${tile.key}`) }}</span>
        <span class="tile-hint line-clamp-2 text-[11px] leading-snug">
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
          <button
            v-if="data && count(bucket) > items.length"
            type="button"
            class="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold text-primary transition hover:bg-primary-soft"
            @click="showAll = true"
          >
            {{ $t("common.seeAll") }}
            <span class="text-muted tabular-nums">{{ count(bucket) }}</span>
            <PtIcon :icon="ArrowRight01Icon" :size="14" class="rtl:rotate-180" />
          </button>
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
            <DecisionTaskRow :task="task" :bucket="bucket" :now="now" @open="taskUi.openTask" />
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

    <DecisionListSheet v-model="showAll" :bucket="bucket" :total="count(bucket)" @open-task="taskUi.openTask" />
  </div>
</template>

<style scoped>
/*
 * Decision tiles, Apple-widget style. At rest: a light card softly lit by two
 * radial washes of its colour. Picked: a rich layered gradient of that colour
 * fades and swells in behind it (a separate layer, since gradients can't
 * transition), the card lifts with a coloured glow, its icon turns to glass
 * and the light inside slowly drifts.
 */
.tile {
  background:
    radial-gradient(120% 90% at 100% 0%, color-mix(in oklab, var(--tile) 16%, transparent), transparent 62%),
    radial-gradient(90% 80% at 0% 100%, color-mix(in oklab, var(--tile) 7%, transparent), transparent 70%),
    var(--pt-surface);
  box-shadow: var(--pt-shadow), inset 0 0 0 1px color-mix(in oklab, var(--tile) 6%, transparent);
  transition:
    transform 0.5s var(--ease-spring),
    box-shadow 0.5s var(--ease-spring);
}
.tile:hover:not(.tile-on) {
  transform: translateY(-2px);
}
.tile:active {
  transform: scale(0.97);
}
.tile-glow {
  opacity: 0;
  transform: scale(1.15);
  background:
    radial-gradient(130% 110% at 100% 0%, color-mix(in oklab, var(--tile) 55%, white) 0%, transparent 55%),
    radial-gradient(120% 120% at 0% 100%, color-mix(in oklab, var(--tile) 70%, black) 0%, transparent 62%),
    radial-gradient(70% 60% at 30% 20%, color-mix(in oklab, var(--tile) 80%, white) 0%, transparent 70%),
    var(--tile);
  background-size: 140% 140%;
  background-position: 0% 0%;
  transition:
    opacity 0.4s ease,
    transform 0.6s var(--ease-spring);
}
.tile-icon {
  color: var(--tile);
  background: color-mix(in oklab, var(--tile) 14%, var(--pt-surface));
  transition: background-color 0.3s ease, color 0.3s ease, box-shadow 0.3s ease;
}
.tile-count.is-zero {
  color: var(--pt-subtle);
}
.tile-hint {
  color: var(--pt-muted);
  transition: color 0.3s ease;
}
.tile-name,
.tile-count {
  transition: color 0.3s ease;
}

/* Picked */
.tile-on {
  transform: translateY(-4px) scale(1.02);
  box-shadow:
    0 22px 40px -20px color-mix(in oklab, var(--tile) 90%, transparent),
    0 6px 14px -6px color-mix(in oklab, var(--tile) 45%, transparent),
    inset 0 1px 0 rgb(255 255 255 / 0.35);
}
.tile-on .tile-glow {
  opacity: 1;
  transform: scale(1);
  animation: tile-drift 9s ease-in-out infinite alternate;
}
.tile-on .tile-name,
.tile-on .tile-count,
.tile-on .tile-count.is-zero {
  color: #fff;
}
.tile-on .tile-hint {
  color: rgb(255 255 255 / 0.78);
}
.tile-on .tile-icon {
  color: #fff;
  background: rgb(255 255 255 / 0.2);
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.35), 0 4px 12px -4px rgb(0 0 0 / 0.25);
  backdrop-filter: blur(8px);
  animation: tile-pop 0.55s var(--ease-spring);
}
.tile-on .tile-count {
  animation: tile-pop 0.5s var(--ease-spring);
}
@keyframes tile-pop {
  0% { transform: scale(0.8); }
  60% { transform: scale(1.12); }
  100% { transform: scale(1); }
}
@keyframes tile-drift {
  to { background-position: 100% 100%; }
}
@media (prefers-reduced-motion: reduce) {
  .tile,
  .tile-on { transform: none; }
  .tile-on .tile-glow,
  .tile-on .tile-icon,
  .tile-on .tile-count { animation: none; }
}
</style>
