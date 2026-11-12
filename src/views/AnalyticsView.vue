<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { orderBy } from "lodash-es";
import {
  Alert02Icon,
  Analytics01Icon,
  CheckmarkCircle02Icon,
  ClipboardIcon,
  Clock01Icon,
  Download04Icon,
  Share08Icon,
  Loading03Icon,
  Target02Icon,
  Timer01Icon,
} from "@hugeicons/core-free-icons";
import BarList from "@/components/analytics/BarList.vue";
import TeamLoadList from "@/components/analytics/TeamLoadList.vue";
import StatTile from "@/components/analytics/StatTile.vue";
import ThroughputChart from "@/components/analytics/ThroughputChart.vue";
import PtAvatar from "@/components/ui/PtAvatar.vue";
import PtButton from "@/components/ui/PtButton.vue";
import PtEmpty from "@/components/ui/PtEmpty.vue";
import PtProgress from "@/components/ui/PtProgress.vue";
import PtIcon from "@/components/ui/PtIcon.vue";
import PtRing from "@/components/ui/PtRing.vue";
import PtSegmented from "@/components/ui/PtSegmented.vue";
import PtSkeleton from "@/components/ui/PtSkeleton.vue";
import DueChip from "@/components/tasks/DueChip.vue";
import { analyticsApi, usersApi } from "@/api/endpoints";
import { useApiError } from "@/composables/useApiError";
import { useRequest } from "@/composables/useRequest";
import { useTaskUi } from "@/composables/useTaskUi";
import { useToast } from "@/composables/useToast";
import { renderPdf, savePdf, sharePdf } from "@/services/reportExport";
import { useEntitiesStore } from "@/stores/entities";
import { useSessionStore } from "@/stores/session";
import { CATEGORIES, PRIORITIES, PRIORITY_STYLE } from "@/domain/tasks";
import { dayjs } from "@/plugins/dayjs";
import { flowArrow } from "@/plugins/i18n";
import { useProjectsStore } from "@/stores/projects";
import type { AnalyticsReport, AnalyticsScopeType, User } from "@/types/models";

/** Progress and performance: global, per project, per table, per person. */
const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const projects = useProjectsStore();
const taskUi = useTaskUi();
const errors = useApiError();
const toast = useToast();
const session = useSessionStore();
const entityStore = useEntitiesStore();

const scope = ref<AnalyticsScopeType>((route.query.scope as AnalyticsScopeType) || "global");
const scopeId = ref<number | null>(route.query.id ? Number(route.query.id) : null);
const period = ref<"7" | "30" | "90" | "year">("30");
const report = ref<AnalyticsReport | null>(null);
const request = useRequest();
const loading = request.loading;
const people = ref<User[]>([]);
// Global managers can narrow everything to one entity; entity managers always see their own.
const entityId = ref<number | null>(route.query.entity ? Number(route.query.entity) : null);
const pickEntity = computed(() => entityStore.entities.length > 1 || (session.isGlobal && entityStore.entities.length > 0));
const sheet = ref<HTMLElement | null>(null);
const exporting = ref<"download" | "share" | null>(null);
const sortKey = ref<"completed_in_period" | "open" | "overdue" | "on_time_rate">("completed_in_period");

const CATEGORY_COLORS = { todo: "#64748B", in_progress: "#2F7FD0", done: "#22A06B", canceled: "#A8A29E" } as const;
const CUSTOM_COLOR = "#8B6CF0";

const choices = computed(() => {
  if (scope.value === "project") return projects.projects.map((p) => ({ id: p.id, name: p.name }));
  if (scope.value === "board") return projects.boards().map((b) => ({ id: b.id, name: `${b.project?.name} · ${b.name}` }));
  if (scope.value === "user") return people.value.map((u) => ({ id: u.id, name: u.name }));
  return [];
});

const range = computed(() => {
  const to = dayjs();
  const from = period.value === "year" ? to.startOf("year") : to.subtract(Number(period.value) - 1, "day");
  return { from: from.format("YYYY-MM-DD"), to: to.format("YYYY-MM-DD") };
});

const pct = (value: number | null) => (value === null ? "—" : `${Math.round(value)}%`);
const cycle = computed(() => {
  const hours = report.value?.totals.avg_cycle_hours;
  if (hours === null || hours === undefined) return "—";
  return hours >= 48 ? t("analytics.days", { n: Math.round(hours / 24) }) : t("analytics.hours", { n: Math.round(hours) });
});

const categoryItems = computed(() => [
  ...CATEGORIES.map((c) => ({ key: c, label: t(`statusCategory.${c}`), value: report.value?.by_category[c] ?? 0, color: CATEGORY_COLORS[c] })),
  ...(report.value?.by_category.custom ? [{ key: "custom", label: t("analytics.custom"), value: report.value.by_category.custom, color: CUSTOM_COLOR }] : []),
]);
const priorityItems = computed(() =>
  [...PRIORITIES].reverse().map((p) => ({ key: p, label: t(`priority.${p}`), value: report.value?.by_priority[p] ?? 0, color: PRIORITY_STYLE[p].dot })),
);
const sortedPeople = computed(() => orderBy(report.value?.people ?? [], [(p) => p[sortKey.value] ?? -1], ["desc"]));

async function load(): Promise<void> {
  if (scope.value !== "global" && !scopeId.value) {
    report.value = null;
    return;
  }
  try {
    const result = await request.run((signal) =>
      analyticsApi.report({ scope: scope.value, id: scopeId.value, entity_id: entityId.value, ...range.value }, { signal }),
    );
    if (result) report.value = result;
    void router.replace({
      query: {
        ...(scope.value === "global" ? {} : { scope: scope.value, id: scopeId.value }),
        ...(entityId.value ? { entity: entityId.value } : {}),
      },
    });
  } catch (error) {
    errors.report(error);
  }
}

watch(scope, async (value, previous) => {
  if (previous !== undefined) scopeId.value = null;
  if (value === "user" && !people.value.length) people.value = await usersApi.directory();
  if (value !== "global" && !scopeId.value) scopeId.value = choices.value[0]?.id ?? null;
  await load();
});
watch([scopeId, period, entityId], load);

// ─── Report export: the screen as a PDF, downloaded or shared ──────────────
const scopeLabel = computed(() => {
  if (scope.value !== "global") return choices.value.find((c) => c.id === scopeId.value)?.name ?? "";
  if (entityId.value) return entityStore.byId.get(entityId.value)?.name ?? t("analytics.allEntities");
  if (session.isGlobal) return t("analytics.allEntities");
  return (session.user?.entities ?? []).map((e) => e.name).join(" · ") || t("analytics.allEntities");
});
const periodLabel = computed(() => `${dayjs(range.value.from).format("LL")} ${flowArrow()} ${dayjs(range.value.to).format("LL")}`);
const fileName = computed(() => {
  const slug = scopeLabel.value.normalize("NFKD").replace(/[^\w]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "pilotask";
  return `pilotask-report-${slug}-${range.value.to}.pdf`;
});

async function exportReport(mode: "download" | "share"): Promise<void> {
  if (!sheet.value || exporting.value) return;
  exporting.value = mode;
  try {
    const blob = await renderPdf(sheet.value);
    const title = `${t("analytics.reportTitle")} · ${scopeLabel.value}`;
    if (mode === "download") {
      await savePdf(blob, fileName.value, title);
      toast.success(t("analytics.exported"));
    } else if ((await sharePdf(blob, fileName.value, title, periodLabel.value)) === "downloaded") {
      toast.show(t("analytics.shareFallback"));
    }
  } catch (error) {
    errors.report(error);
  } finally {
    exporting.value = null;
  }
}

onMounted(async () => {
  void entityStore.load().catch(() => undefined);
  await projects.load();
  if (scope.value === "user") people.value = await usersApi.directory();
  await load();
});
</script>

<template>
  <div class="flex flex-col gap-6">
    <header class="flex flex-wrap items-end gap-3">
      <div v-stagger="0" class="me-auto">
        <h1 class="text-3xl font-bold">{{ $t("analytics.title") }}</h1>
        <p class="mt-1 text-sm text-muted">{{ $t("analytics.subtitle") }}</p>
      </div>
      <template v-if="report && report.totals.total">
        <PtButton variant="secondary" size="sm" :icon="Download04Icon" :loading="exporting === 'download'" :disabled="!!exporting" @click="exportReport('download')">
          {{ $t("analytics.download") }}
        </PtButton>
        <PtButton size="sm" :icon="Share08Icon" :loading="exporting === 'share'" :disabled="!!exporting" @click="exportReport('share')">
          {{ $t("analytics.share") }}
        </PtButton>
      </template>
    </header>

    <!-- Filters: one bar above the charts. Tabs keep their size and wrap; pickers go on their own row. -->
    <div class="pt-card relative flex flex-col gap-3 overflow-hidden p-3" :aria-busy="loading">
      <span v-if="loading" class="pt-bar-loading absolute inset-x-0 top-0 h-0.5" />
      <div class="flex flex-wrap items-center gap-3">
        <PtSegmented
          v-model="scope"
          size="sm"
          class="shrink-0"
          :options="(['global', 'project', 'board', 'user'] as const).map((s) => ({ value: s, label: $t(`analytics.scope.${s}`) }))"
        />
        <PtSegmented
          v-model="period"
          size="sm"
          class="shrink-0 lg:ms-auto"
          :options="[
            { value: '7', label: $t('analytics.last7') },
            { value: '30', label: $t('analytics.last30') },
            { value: '90', label: $t('analytics.last90') },
            { value: 'year', label: $t('analytics.thisYear') },
          ]"
        />
      </div>
      <div v-if="pickEntity || scope !== 'global'" class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <select v-if="pickEntity" v-model="entityId" class="pt-field min-w-0 rounded-full py-2" :aria-label="$t('entities.entity')">
          <option :value="null">{{ $t("analytics.allEntities") }}</option>
          <option v-for="entity in entityStore.entities" :key="entity.id" :value="entity.id">{{ entity.name }}</option>
        </select>
        <select v-if="scope !== 'global'" v-model="scopeId" class="pt-field min-w-0 rounded-full py-2" :aria-label="$t('analytics.pickScope')">
          <option :value="null" disabled>{{ $t("analytics.pickScope") }}</option>
          <option v-for="choice in choices" :key="choice.id" :value="choice.id">{{ choice.name }}</option>
        </select>
      </div>
    </div>

    <div v-if="loading && !report" class="grid grid-cols-2 gap-4 lg:grid-cols-4"><PtSkeleton v-for="i in 8" :key="i" class="h-32" /></div>
    <PtEmpty v-else-if="!report || !report.totals.total" :icon="Analytics01Icon" :title="$t('analytics.noData')" class="transition-opacity" :class="loading && 'opacity-45'" />

    <!-- While new figures load, the old ones stay in place, dimmed. -->
    <div
      v-else
      ref="sheet"
      class="flex flex-col gap-6 bg-bg transition-opacity duration-200"
      :class="loading && 'pointer-events-none opacity-45'"
      :aria-busy="loading"
    >
      <!-- Shown only in the exported PDF. -->
      <div class="pt-export-only" data-export-block>
        <!-- Wraps on phones: logo + title on one line, period and "generated" below. -->
        <div class="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-(--radius-sheet) bg-ink p-4 text-on-ink sm:p-5">
          <img src="/brand/pilotask-app-icon.svg" alt="" class="size-10 shrink-0 rounded-2xl sm:size-12" />
          <div class="min-w-0 flex-1 basis-48">
            <p class="text-lg leading-snug font-bold break-words sm:text-xl">{{ $t("analytics.reportTitle") }} · {{ scopeLabel }}</p>
            <p class="text-sm opacity-70">{{ periodLabel }}</p>
          </div>
          <p class="w-full text-xs opacity-60 sm:w-auto sm:text-end">
            {{ $t("analytics.generatedOn", { date: dayjs().format("LLL"), name: session.user?.name ?? "" }) }}
          </p>
        </div>
      </div>

      <div data-export-block class="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        <StatTile v-stagger="0" :label="$t('analytics.total')" :value="report.totals.total" :icon="ClipboardIcon" :hint="`+${report.totals.created_in_period} ${$t('analytics.created').toLowerCase()}`" />
        <StatTile v-stagger="1" :label="$t('analytics.inProgress')" :value="report.totals.in_progress" :icon="Loading03Icon" tone="primary" :hint="`${report.totals.open} ${$t('analytics.open').toLowerCase()}`" />
        <StatTile v-stagger="2" :label="$t('analytics.done')" :value="report.totals.done" :icon="CheckmarkCircle02Icon" tone="success" :hint="`+${report.totals.completed_in_period} ${$t('analytics.completedInPeriod').toLowerCase()}`" />
        <StatTile v-stagger="3" :label="$t('analytics.overdue')" :value="report.totals.overdue" :icon="Alert02Icon" :tone="report.totals.overdue ? 'danger' : 'neutral'" />
      </div>

      <div data-export-block class="grid grid-cols-3 gap-3 md:gap-4">
        <div
          v-for="(rate, i) in [
            { label: $t('analytics.completionRate'), value: report.totals.completion_rate, text: pct(report.totals.completion_rate), icon: Target02Icon, color: '#2F7FD0' },
            { label: $t('analytics.onTimeRate'), value: report.totals.on_time_rate, text: pct(report.totals.on_time_rate), icon: Clock01Icon, color: '#22A06B' },
            { label: $t('analytics.avgCycle'), value: null, text: cycle, icon: Timer01Icon, color: '#E8962E' },
          ]"
          :key="rate.label"
          v-stagger="i + 4"
          class="pt-card flex min-w-0 flex-col items-center gap-2 p-3 text-center md:flex-row md:gap-4 md:p-4 md:text-start"
        >
          <PtRing v-if="rate.value !== null" :value="rate.value" :size="56" :stroke="6" :color="rate.color" track="var(--pt-surface-3)">
            <PtIcon :icon="rate.icon" :size="16" class="text-muted" />
          </PtRing>
          <span v-else class="grid size-14 shrink-0 place-items-center rounded-full bg-warning-soft text-warning"><PtIcon :icon="rate.icon" :size="20" /></span>
          <div class="min-w-0">
            <p class="text-xl font-bold tabular-nums md:text-2xl">{{ rate.text }}</p>
            <p class="line-clamp-2 text-[11px] leading-tight font-semibold text-muted md:text-xs">{{ rate.label }}</p>
          </div>
        </div>
      </div>

      <section data-export-block class="pt-card p-5">
        <h2 class="mb-3 text-base font-bold">{{ $t("analytics.throughput") }}</h2>
        <ThroughputChart :data="report.throughput" />
      </section>

      <div data-export-block class="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section class="pt-card p-5">
          <h2 class="mb-4 text-base font-bold">{{ $t("analytics.byCategory") }}</h2>
          <BarList :items="categoryItems" />
        </section>
        <section class="pt-card p-5">
          <h2 class="mb-4 text-base font-bold">{{ $t("analytics.byPriority") }}</h2>
          <BarList :items="priorityItems" />
        </section>
      </div>

      <!-- Who carries the open work: one bar per person, late part in red. -->
      <section v-if="report.people.some((p) => p.open > 0)" data-export-block class="pt-card p-5">
        <h2 class="mb-1 text-base font-bold">{{ $t("manager.team") }}</h2>
        <p class="mb-4 text-xs text-muted">{{ $t("analytics.teamLoadHint") }}</p>
        <TeamLoadList :rows="report.people" :limit="12" @pick="(row) => row.user && ((scope = 'user'), (scopeId = row.user.id))" />
      </section>

      <section v-if="report.people.length" data-export-block class="pt-card overflow-hidden p-0">
        <h2 class="px-5 pt-5 pb-3 text-base font-bold">{{ $t("analytics.people") }}</h2>

        <!-- Phones: one card per person. -->
        <!-- (The PDF export uses these cards too: the table scrolls sideways and would be cut.) -->
        <ul class="pt-export-cards flex flex-col gap-2 px-3 pb-3 md:hidden">
          <li v-for="(row, i) in sortedPeople" :key="row.user?.id" v-stagger="i" data-export-block class="rounded-2xl bg-surface-2 p-3">
            <button type="button" class="flex w-full min-w-0 items-center gap-2.5 text-start" @click="(scope = 'user'), (scopeId = row.user?.id ?? null)">
              <PtAvatar :name="row.user?.name ?? '?'" :src="row.user?.avatar_url" :size="32" />
              <span class="min-w-0 flex-1 truncate font-semibold">{{ row.user?.name }}</span>
              <span class="text-xs text-muted">{{ pct(row.on_time_rate) }}</span>
            </button>
            <dl class="mt-3 grid grid-cols-4 gap-1 text-center">
              <div v-for="cell in [
                { label: $t('analytics.assigned'), value: row.assigned , danger: false },
                { label: $t('analytics.open'), value: row.open , danger: false },
                { label: $t('analytics.done'), value: row.completed_in_period , danger: false },
                { label: $t('analytics.overdue'), value: row.overdue, danger: row.overdue > 0 },
              ]" :key="cell.label" class="rounded-xl bg-surface px-1 py-2">
                <dd class="text-base font-bold tabular-nums" :class="cell.danger ? 'text-danger' : ''">{{ cell.value }}</dd>
                <dt class="truncate text-[10px] font-semibold text-muted">{{ cell.label }}</dt>
              </div>
            </dl>
          </li>
        </ul>

        <!-- Larger screens: sortable table. -->
        <div class="pt-export-hide hidden overflow-x-auto md:block">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-y border-line bg-surface-2 text-xs text-muted">
                <th class="px-5 py-2.5 text-start font-semibold">{{ $t("analytics.person") }}</th>
                <th class="px-3 py-2.5 text-end font-semibold">{{ $t("analytics.assigned") }}</th>
                <th v-for="col in (['open', 'completed_in_period', 'overdue', 'on_time_rate'] as const)" :key="col" class="px-3 py-2.5 text-end font-semibold">
                  <button type="button" class="hover:text-fg" :class="sortKey === col && 'text-fg'" @click="sortKey = col">
                    {{ { open: $t("analytics.open"), completed_in_period: $t("analytics.completedInPeriod"), overdue: $t("analytics.overdue"), on_time_rate: $t("analytics.onTimeRate") }[col] }}
                    <span v-if="sortKey === col">↓</span>
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, i) in sortedPeople" :key="row.user?.id" v-stagger="i" class="border-b border-line/60 last:border-0 hover:bg-surface-2">
                <td class="px-5 py-3">
                  <button type="button" class="flex items-center gap-2.5 font-semibold whitespace-nowrap" @click="(scope = 'user'), (scopeId = row.user?.id ?? null)">
                    <PtAvatar :name="row.user?.name ?? '?'" :src="row.user?.avatar_url" :size="28" />
                    {{ row.user?.name }}
                  </button>
                </td>
                <td class="px-3 py-3 text-end tabular-nums">{{ row.assigned }}</td>
                <td class="px-3 py-3 text-end tabular-nums">{{ row.open }}</td>
                <td class="px-3 py-3 text-end font-bold tabular-nums">{{ row.completed_in_period }}</td>
                <td class="px-3 py-3 text-end tabular-nums" :class="row.overdue ? 'font-bold text-danger' : ''">{{ row.overdue }}</td>
                <td class="px-3 py-3 text-end tabular-nums">{{ pct(row.on_time_rate) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <div data-export-block class="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section v-if="report.boards.length" data-export-block class="pt-card p-5">
          <h2 class="mb-4 text-base font-bold">{{ $t("analytics.boards") }}</h2>
          <ul class="flex flex-col gap-4">
            <li v-for="(row, i) in report.boards" :key="row.board?.id" v-stagger="i">
              <div class="mb-1.5 flex justify-between gap-2 text-sm">
                <RouterLink :to="`/boards/${row.board?.id}`" class="truncate font-semibold hover:underline">{{ row.board?.name }}</RouterLink>
                <span class="text-muted tabular-nums">{{ row.done }}/{{ row.total }} · <b class="text-fg">{{ Math.round(row.progress) }}%</b></span>
              </div>
              <PtProgress :value="row.progress" :color="row.board?.color ?? undefined" />
            </li>
          </ul>
        </section>
        <section class="pt-card p-5">
          <h2 class="mb-2 text-base font-bold">{{ $t("analytics.upcoming") }}</h2>
          <p v-if="!report.upcoming.length" class="py-6 text-center text-sm text-muted">—</p>
          <button
            v-for="task in report.upcoming"
            :key="task.id"
            type="button"
            class="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-start hover:bg-surface-2"
            @click="taskUi.openTask(task.id)"
          >
            <span class="size-2 shrink-0 rounded-full" :style="{ background: task.board?.color ?? 'var(--pt-subtle)' }" />
            <span class="min-w-0 flex-1 truncate text-sm font-semibold">{{ task.title }}</span>
            <DueChip :due="task.due_at" />
          </button>
        </section>
      </div>
    </div>
  </div>
</template>
