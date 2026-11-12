<script setup lang="ts">
import { whileTaskBusy } from "@/composables/useTaskBusy";
import { statusName } from "@/domain/statusName";
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import {
  Calendar03Icon,
  Delete02Icon,
  Flag02Icon,
  PencilEdit02Icon,
  Tag01Icon,
  UserMultipleIcon,
  Clock01Icon,
  DashboardSquare01Icon,
} from "@hugeicons/core-free-icons";
import PtAvatar from "@/components/ui/PtAvatar.vue";
import PtIcon from "@/components/ui/PtIcon.vue";
import PtIconButton from "@/components/ui/PtIconButton.vue";
import PtSegmented from "@/components/ui/PtSegmented.vue";
import PtSheet from "@/components/ui/PtSheet.vue";
import PtSkeleton from "@/components/ui/PtSkeleton.vue";
import ActivityFeed from "@/components/activity/ActivityFeed.vue";
import CommentThread from "./CommentThread.vue";
import PriorityChip from "./PriorityChip.vue";
import TaskFormSheet from "./TaskFormSheet.vue";
import { tasksApi } from "@/api/endpoints";
import { useApiError } from "@/composables/useApiError";
import { useConfirm } from "@/composables/useConfirm";
import { useDates } from "@/composables/useDates";
import { useRequest } from "@/composables/useRequest";
import { useToast } from "@/composables/useToast";
import { taskAccent } from "@/domain/tasks";
import type { Task } from "@/types/models";

/** Task details: fields, status, comments and history. Opening it is logged as a view. */
const props = defineProps<{ taskId: number | null }>();
const open = defineModel<boolean>({ required: true });
const emit = defineEmits<{ updated: [task: Task]; deleted: [id: number] }>();

const { t } = useI18n();
const { fmt, dueLabel } = useDates();
const { confirm } = useConfirm();
const toast = useToast();
const errors = useApiError();

const request = useRequest();
const task = ref<Task | null>(null);
const tab = ref<"comments" | "activity">("comments");
const editing = ref(false);
const activityLoader = computed(() => {
  const id = task.value?.id;
  return (params: object, signal?: AbortSignal) => tasksApi.activity(id ?? 0, params, { signal });
});

watch(
  () => [open.value, props.taskId] as const,
  async ([isOpen, id]) => {
    if (!isOpen || !id) return;
    task.value = null;
    tab.value = "comments";
    try {
      const result = await request.run((signal) => tasksApi.get(id, { signal }));
      if (result) task.value = result;
    } catch (error) {
      errors.report(error);
      open.value = false;
    }
  },
  { immediate: true },
);

/**
 * Applies a fresh copy of the task from the API. Card-shaped responses (move,
 * list) carry the table without its statuses: keep the ones we already have,
 * or the status menu and pill would vanish.
 */
function merge(next: Task): Task {
  const current = task.value;
  const statuses = next.board?.statuses ?? current?.board?.statuses;
  return {
    ...current,
    ...next,
    status: next.status ?? current?.status,
    board: next.board || current?.board ? ({ ...current?.board, ...next.board, statuses } as Task["board"]) : undefined,
  } as Task;
}

async function changeStatus(event: Event): Promise<void> {
  if (!task.value) return;
  const statusId = Number((event.target as HTMLSelectElement).value);
  try {
    const id = task.value.id;
    const moved = await whileTaskBusy(id, () => tasksApi.move(id, statusId));
    task.value = merge(moved);
    emit("updated", task.value);
    toast.success(t("tasks.moved", { status: statusName(moved.status) }));
  } catch (error) {
    errors.report(error);
  }
}

function onSaved(saved: Task): void {
  task.value = merge(saved);
  emit("updated", task.value);
  toast.success(t("common.saved"));
}

async function remove(): Promise<void> {
  if (!task.value) return;
  const id = task.value.id;
  const ok = await confirm({ title: t("tasks.deleteConfirm", { name: task.value.title }), danger: true, confirmLabel: t("common.delete"), run: () => tasksApi.remove(id) });
  if (!ok) return;
  emit("deleted", id);
  toast.show(t("common.deleted"));
  open.value = false;
}
</script>

<template>
  <PtSheet v-model="open" side="end" width="40rem">
    <template #header>
      <div class="flex flex-1 items-center gap-2">
        <span v-if="task" class="size-3 rounded-full" :style="{ background: taskAccent(task) }" />
        <span class="truncate text-sm font-semibold text-muted">{{ task?.board?.name }}</span>
      </div>
      <PtIconButton v-if="task?.can?.update" :icon="PencilEdit02Icon" :label="$t('common.edit')" @click="editing = true" />
      <PtIconButton v-if="task?.can?.delete" :icon="Delete02Icon" :label="$t('common.delete')" class="text-danger" @click="remove" />
    </template>

    <div v-if="!task" class="flex flex-col gap-4 py-4">
      <PtSkeleton class="h-8 w-3/4" />
      <PtSkeleton class="h-24" />
      <PtSkeleton class="h-40" />
    </div>

    <article v-else class="flex flex-col gap-6 pb-4">
      <h1 class="text-2xl leading-tight font-bold">{{ task.title }}</h1>

      <dl class="grid grid-cols-[auto_1fr] items-center gap-x-6 gap-y-3.5 text-sm">
        <dt class="flex items-center gap-2 text-muted"><PtIcon :icon="DashboardSquare01Icon" :size="17" />{{ $t("tasks.status") }}</dt>
        <dd>
          <select
            class="rounded-full border-0 px-3 py-1.5 text-xs font-bold outline-none"
            :style="{ background: `color-mix(in oklab, ${task.status?.color} 16%, transparent)`, color: task.status?.color }"
            :value="task.status_id"
            :disabled="!task.can?.move"
            @change="changeStatus"
          >
            <option v-for="status in task.board?.statuses" :key="status.id" :value="status.id">{{ statusName(status) }}</option>
          </select>
        </dd>

        <dt class="flex items-center gap-2 text-muted"><PtIcon :icon="Flag02Icon" :size="17" />{{ $t("priority.label") }}</dt>
        <dd><PriorityChip :priority="task.priority" /></dd>

        <dt class="flex items-center gap-2 text-muted"><PtIcon :icon="Clock01Icon" :size="17" />{{ $t("tasks.start") }}</dt>
        <dd class="font-semibold">{{ task.start_at ? fmt.dateTime(task.start_at) : "—" }}</dd>

        <dt class="flex items-center gap-2 text-muted"><PtIcon :icon="Calendar03Icon" :size="17" />{{ $t("tasks.due") }}</dt>
        <dd class="font-semibold" :class="task.is_overdue && 'text-danger'">
          {{ task.due_at ? fmt.dateTime(task.due_at) : $t("tasks.noDue") }}
          <span v-if="task.is_overdue" class="ms-1 rounded-full bg-danger-soft px-2 py-0.5 text-[11px]">{{ $t("tasks.overdue") }}</span>
          <span v-else-if="task.due_at && !task.completed_at" class="ms-1 text-xs font-normal text-muted">· {{ dueLabel(task.due_at) }}</span>
        </dd>

        <dt class="flex items-center gap-2 self-start pt-1 text-muted"><PtIcon :icon="UserMultipleIcon" :size="17" />{{ $t("tasks.assignees") }}</dt>
        <dd class="flex flex-wrap gap-2">
          <span v-for="user in task.assignees" :key="user.id" class="pt-chip ps-1">
            <PtAvatar :name="user.name" :src="user.avatar_url" :size="22" />{{ user.name }}
          </span>
          <span v-if="!task.assignees?.length" class="text-muted">{{ $t("tasks.unassigned") }}</span>
        </dd>

        <template v-if="task.labels?.length">
          <dt class="flex items-center gap-2 text-muted"><PtIcon :icon="Tag01Icon" :size="17" />{{ $t("tasks.labels") }}</dt>
          <dd class="flex flex-wrap gap-1.5">
            <span
              v-for="label in task.labels"
              :key="label.id"
              class="rounded-full px-2.5 py-1 text-xs font-semibold"
              :style="{ background: `color-mix(in oklab, ${label.color} 15%, transparent)`, color: label.color }"
            >
              {{ label.name }}
            </span>
          </dd>
        </template>
      </dl>

      <section v-if="task.description" class="rounded-(--radius-card) bg-surface-2 p-4">
        <h2 class="pt-label mb-1">{{ $t("tasks.description") }}</h2>
        <!-- Sanitised server-side (HTMLPurifier) before storage. -->
        <div v-media class="pt-prose" v-html="task.description" />
      </section>

      <p class="text-xs text-subtle">
        {{ $t("tasks.createdBy", { name: task.creator?.name ?? "—" }) }} · {{ fmt.dateTime(task.created_at) }}
      </p>

      <section>
        <PtSegmented
          v-model="tab"
          size="sm"
          class="mb-4"
          :options="[
            { value: 'comments', label: `${$t('tasks.comments')}${task.comments_count ? ` · ${task.comments_count}` : ''}` },
            { value: 'activity', label: $t('tasks.activity') },
          ]"
        />
        <CommentThread v-if="tab === 'comments'" :task="task" @changed="(n) => task && (task.comments_count = n)" />
        <ActivityFeed v-else :loader="activityLoader" />
      </section>
    </article>

    <TaskFormSheet v-if="task" v-model="editing" :task="task" :board="task.board ?? null" @saved="onSaved" />
  </PtSheet>
</template>
