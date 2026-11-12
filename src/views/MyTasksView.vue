<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { refDebounced } from "@vueuse/core";
import { CheckListIcon, Search01Icon } from "@hugeicons/core-free-icons";
import PtEmpty from "@/components/ui/PtEmpty.vue";
import PtIcon from "@/components/ui/PtIcon.vue";
import PtSegmented from "@/components/ui/PtSegmented.vue";
import PtSkeleton from "@/components/ui/PtSkeleton.vue";
import TaskRow from "@/components/tasks/TaskRow.vue";
import FilterButton from "@/components/filters/FilterButton.vue";
import SortButton from "@/components/filters/SortButton.vue";
import SortSheet from "@/components/filters/SortSheet.vue";
import { useTaskSort } from "@/composables/useTaskSort";
import { sortTasks } from "@/domain/sort";
import TaskFilterSheet from "@/components/filters/TaskFilterSheet.vue";
import { useTaskFilters } from "@/composables/useTaskFilters";
import { useAccess } from "@/composables/useAccess";
import { tasksApi } from "@/api/endpoints";
import { useApiError } from "@/composables/useApiError";
import { useRequest } from "@/composables/useRequest";
import { useTaskUi } from "@/composables/useTaskUi";
import { isTaskBusy, whileTaskBusy } from "@/composables/useTaskBusy";
import { dayjs } from "@/plugins/dayjs";
import type { Task } from "@/types/models";

/** Everything assigned to me, bucketed by urgency. */
const { t } = useI18n();
const taskUi = useTaskUi();
const errors = useApiError();

const loaded = ref<Task[]>([]);
const taskFilters = useTaskFilters(loaded);
const access = useAccess();
const { sort: order, pick: pickOrder } = useTaskSort("my-tasks");
const showOrder = ref(false);
// Everything here is assigned to me: a people filter would be noise.
const HIDE_PEOPLE = true;
const tasks = taskFilters.filtered;
const request = useRequest();
const loading = request.loading;
const scope = ref<"open" | "done">("open");
const search = ref("");
const query = refDebounced(search, 300);

async function load(): Promise<void> {
  try {
    const result = await request.run((signal) =>
      tasksApi.list(
        {
          assignee_id: "me",
          category: scope.value === "open" ? undefined : ["done"],
          open: scope.value === "open" || undefined,
          search: query.value || undefined,
          sort: scope.value === "open" ? "due_at" : "updated_at",
        },
        { signal },
      ),
    );
    if (result) loaded.value = result;
  } catch (error) {
    errors.report(error);
  }
}

const groups = computed(() => {
  if (scope.value === "done") return [{ key: "done", title: t("analytics.done"), tasks: tasks.value }];
  const today = dayjs().endOf("day");
  const week = dayjs().add(7, "day").endOf("day");
  const bucket = (fn: (t: Task) => boolean) => tasks.value.filter(fn);
  return [
    { key: "overdue", title: t("home.overdue"), tasks: bucket((x) => x.is_overdue) },
    { key: "today", title: t("common.today"), tasks: bucket((x) => !x.is_overdue && !!x.due_at && dayjs(x.due_at).isSameOrBefore(today)) },
    { key: "week", title: t("home.upcoming"), tasks: bucket((x) => !!x.due_at && dayjs(x.due_at).isAfter(today) && dayjs(x.due_at).isSameOrBefore(week)) },
    { key: "later", title: t("home.later"), tasks: bucket((x) => !!x.due_at && dayjs(x.due_at).isAfter(week)) },
    { key: "none", title: t("tasks.noDue"), tasks: bucket((x) => !x.due_at) },
  ].filter((g) => g.tasks.length);
});

async function toggle(task: Task): Promise<void> {
  if (isTaskBusy(task.id)) return;
  try {
    const moved = await whileTaskBusy(task.id, async () => {
      const statuses = (await tasksApi.get(task.id)).board?.statuses ?? [];
      const target = statuses.find((s) => s.category === (task.status?.category === "done" ? "todo" : "done"));
      return target ? tasksApi.move(task.id, target.id) : null;
    });
    if (!moved) return;
  } catch (error) {
    errors.report(error);
    return;
  }
  loaded.value = loaded.value.filter((x) => x.id !== task.id);
}

watch([scope, query], load);
onMounted(load);
taskUi.onChanged(() => void load());
</script>

<template>
  <div class="flex flex-col gap-6">
    <header class="flex flex-wrap items-end gap-4">
      <div class="flex-1">
        <h1 class="text-3xl font-bold">{{ $t("nav.myTasks") }}</h1>
        <p class="mt-1 text-sm text-muted">{{ $t("home.tasks", tasks.length) }}</p>
      </div>
      <PtSegmented
        v-model="scope"
        :options="[
          { value: 'open', label: $t('analytics.open') },
          { value: 'done', label: $t('analytics.done') },
        ]"
      />
    </header>

    <div class="flex items-center gap-2">
      <div class="relative min-w-0 flex-1">
        <PtIcon :icon="Search01Icon" :size="18" class="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-subtle" />
        <input v-model="search" class="pt-field bg-surface ps-11" :placeholder="$t('tasks.searchPlaceholder')" />
      </div>
      <FilterButton class="h-11" :count="taskFilters.count.value" @click="taskFilters.open.value = true" />
      <SortButton class="h-11" :sort="order" @click="showOrder = true" />
    </div>

    <div v-if="loading" class="flex flex-col gap-3"><PtSkeleton v-for="i in 5" :key="i" class="h-14" /></div>
    <PtEmpty v-else-if="!tasks.length" :icon="CheckListIcon" :title="$t('tasks.empty')" />
    <section v-for="group in groups" v-else :key="group.key" class="pt-card p-2">
      <h2 class="px-3 pt-2 pb-1 text-sm font-bold" :class="group.key === 'overdue' && 'text-danger'">
        {{ group.title }} <span class="text-muted">· {{ group.tasks.length }}</span>
      </h2>
      <div class="divide-y divide-line/60">
        <TaskRow v-for="(task, i) in sortTasks(group.tasks, order)" :key="task.id" v-stagger="i" :task="task" show-board @open="taskUi.openTask(task.id)" @toggle="toggle" />
      </div>
    </section>
    <SortSheet v-model="showOrder" :sort="order" @pick="pickOrder" @direction="(desc) => (order = { ...order, desc })" />
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
