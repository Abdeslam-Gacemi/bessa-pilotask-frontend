<script setup lang="ts">
import { statusName } from "@/domain/statusName";
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import {
  Add01Icon,
  Analytics01Icon,
  ClipboardIcon,
  Delete02Icon,
  KanbanIcon,
  LeftToRightListBulletIcon,
  MoreHorizontalIcon,
  PencilEdit02Icon,
  Search01Icon,
  Settings02Icon,
  TimelineIcon,
  Clock01Icon,
} from "@hugeicons/core-free-icons";
import PtButton from "@/components/ui/PtButton.vue";
import PtEmpty from "@/components/ui/PtEmpty.vue";
import PtIcon from "@/components/ui/PtIcon.vue";
import PtIconButton from "@/components/ui/PtIconButton.vue";
import PtMenuItem from "@/components/ui/PtMenuItem.vue";
import PtPopover from "@/components/ui/PtPopover.vue";
import PtSegmented from "@/components/ui/PtSegmented.vue";
import PtSheet from "@/components/ui/PtSheet.vue";
import PtSkeleton from "@/components/ui/PtSkeleton.vue";
import ActivityFeed from "@/components/activity/ActivityFeed.vue";
import KanbanBoard from "@/components/board/KanbanBoard.vue";
import StatusManagerSheet from "@/components/board/StatusManagerSheet.vue";
import TaskListView from "@/components/board/TaskListView.vue";
import TimelineView from "@/components/board/TimelineView.vue";
import BoardFormSheet from "@/components/projects/BoardFormSheet.vue";
import FilterButton from "@/components/filters/FilterButton.vue";
import SortButton from "@/components/filters/SortButton.vue";
import SortSheet from "@/components/filters/SortSheet.vue";
import { useTaskSort } from "@/composables/useTaskSort";
import { sortTasks } from "@/domain/sort";
import TaskFilterSheet from "@/components/filters/TaskFilterSheet.vue";
import { countTaskFilters, emptyTaskFilters, matchTask, uniqueUsers, useFilters } from "@/domain/filters";
import { boardsApi, tasksApi } from "@/api/endpoints";
import { useApiError } from "@/composables/useApiError";
import { useBoardTasks } from "@/composables/useBoardTasks";
import { useConfirm } from "@/composables/useConfirm";
import { isTaskBusy, whileTaskBusy } from "@/composables/useTaskBusy";
import { useAccess } from "@/composables/useAccess";
import { useRequest } from "@/composables/useRequest";
import { haptics } from "@/services/haptics";
import { useTaskUi } from "@/composables/useTaskUi";
import { useToast } from "@/composables/useToast";
import { tableIcon } from "@/plugins/icons";
import { useMetaStore } from "@/stores/meta";
import { useProjectsStore } from "@/stores/projects";
import { useSessionStore } from "@/stores/session";
import type { Board, Status, Task } from "@/types/models";

type View = "kanban" | "list" | "timeline";

const props = defineProps<{ id: number }>();
const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const session = useSessionStore();
const meta = useMetaStore();
const projects = useProjectsStore();
const taskUi = useTaskUi();
const toast = useToast();
const errors = useApiError();
const { confirm } = useConfirm();

const boardRequest = useRequest();
const board = ref<Board | null>(null);
const statuses = computed<Status[]>(() => board.value?.statuses ?? []);
const boardId = computed(() => props.id);
const { tasks, loading, columns, load, move, upsert, remove } = useBoardTasks(boardId, statuses);

// The view lives in the URL, so a shared link opens the same layout.
const view = computed<View>({
  get: () => (["kanban", "list", "timeline"].includes(route.query.view as string) ? (route.query.view as View) : "kanban"),
  set: (value) => void router.replace({ query: { ...route.query, view: value } }),
});

const search = ref("");
const onlyMine = ref(false);
const { filters, reset: resetFilters } = useFilters(emptyTaskFilters);
const filterCount = computed(() => countTaskFilters(filters));
const showFilters = ref(false);
const access = useAccess();
// Run this table: admins of its entity, or its project managers.
const canRun = computed(() => board.value?.can?.manage ?? session.managesProject(board.value?.project_id));
// Others' tasks show up for managers, and for users where this table's team visibility is on.
const seesTeam = computed(() => access.canManage.value || Boolean(canRun.value) || Boolean(board.value?.team_tasks_visible));
const people = computed(() => uniqueUsers(tasks.value.map((task) => task.assignees)));
const editingBoard = ref(false);
const managingStatuses = ref(false);
const showHistory = ref(false);
const menu = ref(false);
const showDescription = ref(false);

const matches = (task: Task) =>
  (!search.value || task.title.toLowerCase().includes(search.value.toLowerCase())) &&
  (!onlyMine.value || task.assignees?.some((u) => u.id === session.user?.id)) &&
  matchTask(task, filters);

// Order (remembered per table): the board's own order, or by priority / deadline / start.
const { sort: order, active: ordered, pick: pickOrder } = useTaskSort(`board.${props.id}`);
const showOrder = ref(false);
const filteredColumns = computed(() => columns.value.map((c) => ({ status: c.status, tasks: sortTasks(c.tasks.filter(matches), order.value) })));
const filteredTasks = computed(() => sortTasks(tasks.value.filter(matches), order.value));
const filtering = computed(() => Boolean(search.value || onlyMine.value || filterCount.value));
const historyLoader = computed(() => (params: object, signal?: AbortSignal) => boardsApi.activity(props.id, params, { signal }));

async function loadBoard(): Promise<void> {
  board.value = null;
  try {
    const result = await boardRequest.run((signal) => boardsApi.get(props.id, { signal }));
    if (!result) return;
    board.value = result;
    await load();
  } catch (error) {
    errors.report(error);
    await router.replace("/projects");
  }
}

const canDrag = (task: Task) => Boolean(task.can?.move) && !isTaskBusy(task.id);
// Reordering inside a column sets the manual order: only when the board shows all of it, unsorted.
// With a filter or another order, cards still move between columns (status change).
const canReorder = computed(() => !filtering.value && !ordered.value);

async function onMove(payload: { task: Task; statusId: number; index: number; ordered: Task[] }): Promise<void> {
  const changedStatus = payload.task.status_id !== payload.statusId;
  try {
    if (!changedStatus && !canReorder.value) return;
    await whileTaskBusy(payload.task.id, () => move(payload.task, payload.statusId, canReorder.value ? payload.index : null, payload.ordered));
    const target = statuses.value.find((s) => s.id === payload.statusId);
    if (target?.category === "done" && changedStatus) haptics.success();
    else haptics.bump();
    if (changedStatus) toast.success(t("tasks.moved", { status: statusName(statuses.value.find((s) => s.id === payload.statusId)) }));
  } catch (error) {
    errors.report(error);
  }
}

async function toggle(task: Task): Promise<void> {
  const target = statuses.value.find((s) => s.category === (task.status?.category === "done" ? "todo" : "done"));
  if (!target || isTaskBusy(task.id)) return;
  try {
    upsert(await whileTaskBusy(task.id, () => tasksApi.move(task.id, target.id)));
  } catch (error) {
    errors.report(error);
  }
}

async function removeBoard(): Promise<void> {
  if (!board.value) return;
  menu.value = false;
  const id = board.value.id;
  const run = async () => {
    await boardsApi.remove(id);
    await projects.load(true);
  };
  if (!(await confirm({ title: t("boards.deleteConfirm", { name: board.value.name }), danger: true, confirmLabel: t("common.delete"), run }))) return;
  toast.show(t("common.deleted"));
  await router.replace(`/projects/${board.value.project_id}`);
}

function onBoardSaved(saved: Board): void {
  board.value = { ...board.value!, ...saved };
  void projects.load(true);
}

function onStatusesChanged(next: Status[]): void {
  if (board.value) board.value = { ...board.value, statuses: next };
  void load();
}

taskUi.onChanged((event) => {
  if (event.type === "deleted") remove(event.id);
  else upsert(event.task);
});

watch(() => props.id, loadBoard);
onMounted(loadBoard);
</script>

<template>
  <div v-if="!board" class="flex flex-col gap-4"><PtSkeleton class="h-20" /><PtSkeleton class="h-96" /></div>
  <div v-else class="flex flex-col gap-5">
    <header class="flex flex-wrap items-center gap-3">
      <span
        class="grid size-12 place-items-center rounded-2xl"
        :style="{ background: `color-mix(in oklab, ${board.color ?? '#171E23'} 16%, transparent)`, color: board.color ?? 'var(--pt-ink)' }"
      >
        <PtIcon :icon="tableIcon(board.icon)" :size="24" />
      </span>
      <div class="min-w-0 flex-1">
        <RouterLink :to="`/projects/${board.project_id}`" class="text-xs font-semibold text-muted hover:text-fg">{{ board.project?.name }}</RouterLink>
        <h1 class="truncate text-2xl font-bold md:text-3xl">{{ board.name }}</h1>
      </div>
      <PtIconButton v-if="canRun" :icon="Add01Icon" variant="ink" class="max-md:hidden" :label="$t('tasks.new')" @click="taskUi.createTask({ board })" />
      <PtPopover v-if="canRun" v-model="menu" align="end" width="15rem">
        <template #trigger="{ toggle: open }">
          <PtIconButton :icon="MoreHorizontalIcon" :label="$t('common.more')" variant="surface" @click="open" />
        </template>
        <PtMenuItem :icon="Settings02Icon" @click="(managingStatuses = true), (menu = false)">{{ $t("boards.statuses") }}</PtMenuItem>
        <PtMenuItem :icon="Clock01Icon" @click="(showHistory = true), (menu = false)">{{ $t("boards.activity") }}</PtMenuItem>
        <PtMenuItem :icon="Analytics01Icon" @click="router.push({ path: '/analytics', query: { scope: 'board', id: board.id } })">{{ $t("nav.analytics") }}</PtMenuItem>
        <PtMenuItem :icon="PencilEdit02Icon" @click="(editingBoard = true), (menu = false)">{{ $t("boards.edit") }}</PtMenuItem>
        <PtMenuItem :icon="Delete02Icon" danger @click="removeBoard">{{ $t("common.delete") }}</PtMenuItem>
      </PtPopover>
    </header>

    <section v-if="board.description" class="pt-card relative px-4 py-3">
      <!-- Sanitised server-side (HTMLPurifier) before storage. -->
      <div v-media class="pt-prose overflow-hidden transition-[max-height] duration-300" :class="showDescription ? 'max-h-none' : 'max-h-20'" v-html="board.description" />
      <button type="button" class="mt-1 text-xs font-semibold text-primary" @click="showDescription = !showDescription">
        {{ showDescription ? $t("common.less") : $t("common.more") }}
      </button>
    </section>

    <div class="flex flex-wrap items-center gap-2">
      <PtSegmented
        v-model="view"
        size="sm"
        :options="[
          { value: 'kanban', label: $t('boards.views.kanban'), icon: KanbanIcon },
          { value: 'list', label: $t('boards.views.list'), icon: LeftToRightListBulletIcon },
          { value: 'timeline', label: $t('boards.views.timeline'), icon: TimelineIcon },
        ]"
      />
      <div class="relative min-w-48 flex-1 md:max-w-xs">
        <PtIcon :icon="Search01Icon" :size="16" class="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-subtle" />
        <input v-model="search" class="pt-field rounded-full bg-surface py-2 ps-10" :placeholder="$t('tasks.searchPlaceholder')" />
      </div>
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
      <FilterButton :count="filterCount" @click="showFilters = true" />
      <SortButton :sort="order" @click="showOrder = true" />
    </div>

    <div v-if="loading && !tasks.length" class="flex gap-4 overflow-hidden"><PtSkeleton v-for="i in 4" :key="i" class="h-96 w-80 shrink-0" /></div>
    <PtEmpty v-else-if="!tasks.length" :icon="ClipboardIcon" :title="$t('tasks.empty')" :hint="$t('tasks.emptyHint')">
      <PtButton v-if="canRun" :icon="Add01Icon" @click="taskUi.createTask({ board })">{{ $t("tasks.new") }}</PtButton>
    </PtEmpty>
    <template v-else>
      <KanbanBoard
        v-if="view === 'kanban'"
        :columns="filteredColumns"
        :can-create="canRun"
        :can-drag="canDrag"
        :board-id="board.id"
        :reorder="canReorder"
        @open="taskUi.openTask($event.id)"
        @move="onMove"
        @create="(status) => taskUi.createTask({ board, statusId: status.id })"
      />
      <TaskListView v-else-if="view === 'list'" :columns="filteredColumns" @open="taskUi.openTask($event.id)" @toggle="toggle" />
      <TimelineView v-else :tasks="filteredTasks" @open="taskUi.openTask($event.id)" />
    </template>

    <SortSheet v-model="showOrder" :sort="order" @pick="pickOrder" @direction="(desc) => (order = { ...order, desc })" />
    <TaskFilterSheet v-model="showFilters" :filters="filters" :users="people" :hide-people="!seesTeam" :labels="meta.labels" :results="filteredTasks.length" @reset="resetFilters" />
    <BoardFormSheet v-model="editingBoard" :project-id="board.project_id" :board="board" @saved="onBoardSaved" />
    <StatusManagerSheet v-model="managingStatuses" :board="board" @changed="onStatusesChanged" />
    <PtSheet v-model="showHistory" side="end" :title="$t('boards.activity')" width="34rem">
      <ActivityFeed v-if="showHistory" :loader="historyLoader" />
    </PtSheet>
  </div>
</template>
