<script setup lang="ts">
import { useSessionStore } from "@/stores/session";
import { statusName } from "@/domain/statusName";
import { computed, reactive, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import PtButton from "@/components/ui/PtButton.vue";
import PtColorPicker from "@/components/ui/PtColorPicker.vue";
import PtField from "@/components/ui/PtField.vue";
import PtLabelPicker from "@/components/ui/PtLabelPicker.vue";
import PtSegmented from "@/components/ui/PtSegmented.vue";
import PtSheet from "@/components/ui/PtSheet.vue";
import PtUserPicker from "@/components/ui/PtUserPicker.vue";
import RichEditor from "@/components/editor/RichEditor.vue";
import { boardsApi, tasksApi } from "@/api/endpoints";
import { ApiError } from "@/api/client";
import { useApiError } from "@/composables/useApiError";
import { useConfirm } from "@/composables/useConfirm";
import { useDates } from "@/composables/useDates";
import { useFormLock } from "@/composables/useFormLock";
import { PRIORITIES } from "@/domain/tasks";
import { useProjectsStore } from "@/stores/projects";
import type { Board, Priority, Status, Task, User } from "@/types/models";

/**
 * Create or edit a task. Opened from a table (board known) or from anywhere
 * else, in which case the person picks the table first.
 */
const props = defineProps<{ task?: Task | null; board?: Board | null; statusId?: number | null; defaultDue?: string | null }>();
const open = defineModel<boolean>({ required: true });
const emit = defineEmits<{ saved: [task: Task] }>();

const { t } = useI18n();
const { toInput, fromInput } = useDates();
const errors = useApiError();
const { confirmAction } = useConfirm();
const projects = useProjectsStore();
const session = useSessionStore();
const { busy, run: lockRun, scrollToFirstError } = useFormLock();

const form = reactive({
  title: "",
  description: "",
  priority: "medium" as Priority,
  color: null as string | null,
  status_id: null as number | null,
  start_at: "",
  due_at: "",
  assignees: [] as User[],
  label_ids: [] as number[],
});
const boardId = ref<number | null>(null);
const statuses = ref<Status[]>([]);
const fieldErrors = ref<Record<string, string>>({});

const editing = computed(() => Boolean(props.task));
const boardChoices = computed(() => projects.boards());
const projectId = computed(() => boardChoices.value.find((b) => b.id === boardId.value)?.project_id ?? props.board?.project_id);

watch(open, async (isOpen) => {
  if (!isOpen) return;
  fieldErrors.value = {};
  const task = props.task;
  Object.assign(form, {
    title: task?.title ?? "",
    description: task?.description ?? "",
    priority: task?.priority ?? "medium",
    color: task?.color ?? null,
    status_id: task?.status_id ?? props.statusId ?? null,
    start_at: toInput(task?.start_at ?? null),
    due_at: toInput(task?.due_at ?? props.defaultDue ?? null),
    assignees: [...(task?.assignees ?? [])],
    label_ids: (task?.labels ?? []).map((l) => l.id),
  });
  boardId.value = task?.board_id ?? props.board?.id ?? null;
  statuses.value = props.board?.statuses ?? task?.board?.statuses ?? [];
  if (!boardId.value) await projects.load();
});

watch(boardId, async (id) => {
  if (!id || (statuses.value.length && statuses.value[0]?.board_id === id)) return;
  statuses.value = (await boardsApi.get(id)).statuses ?? [];
  if (!statuses.value.some((s) => s.id === form.status_id)) form.status_id = statuses.value[0]?.id ?? null;
});

async function submit(): Promise<void> {
  fieldErrors.value = {};
  if (!form.title.trim()) {
    fieldErrors.value.title = t("common.required");
    scrollToFirstError();
    return;
  }
  if (!boardId.value) {
    fieldErrors.value.board = t("tasks.pickTable");
    scrollToFirstError();
    return;
  }
  if (!(await confirmAction(props.task ? "update" : "create", "task", form.title.trim()))) return;

  const payload = {
    title: form.title.trim(),
    description: form.description || null,
    priority: form.priority,
    color: form.color,
    status_id: form.status_id,
    start_at: fromInput(form.start_at),
    due_at: fromInput(form.due_at),
    assignee_ids: form.assignees.map((u) => u.id),
    label_ids: form.label_ids,
  };

  await lockRun(async () => {
    try {
      const saved = props.task ? await tasksApi.update(props.task.id, payload) : await tasksApi.create(boardId.value!, payload);
      emit("saved", saved);
      open.value = false;
    } catch (error) {
      if (error instanceof ApiError && Object.keys(error.fields).length) {
        fieldErrors.value = Object.fromEntries(Object.entries(error.fields).map(([k, v]) => [k, v[0] ?? ""]));
        scrollToFirstError();
      } else {
        errors.report(error);
      }
    }
  });
}
</script>

<template>
  <PtSheet v-model="open" :title="editing ? $t('tasks.edit') : $t('tasks.new')" width="44rem">
    <form class="flex flex-col gap-5 pt-2" :class="busy && 'pointer-events-none opacity-60'" @submit.prevent="submit">
      <PtField :error="fieldErrors.title">
        <input
          v-model="form.title"
          class="w-full bg-transparent text-xl font-bold outline-none placeholder:text-subtle"
          :placeholder="$t('tasks.titlePlaceholder')"
          maxlength="200"
          autofocus
        />
      </PtField>

      <PtField v-if="!board && !task" :label="$t('tasks.table')" :error="fieldErrors.board">
        <select v-model="boardId" class="pt-field">
          <option :value="null" disabled>{{ $t("tasks.pickTable") }}</option>
          <optgroup v-for="project in projects.projects.filter((p) => session.managesProject(p.id))" :key="project.id" :label="project.name">
            <option v-for="b in project.boards" :key="b.id" :value="b.id">{{ b.name }}</option>
          </optgroup>
        </select>
      </PtField>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <PtField :label="$t('tasks.status')">
          <select v-model="form.status_id" class="pt-field" :disabled="!statuses.length">
            <option v-for="status in statuses" :key="status.id" :value="status.id">{{ statusName(status) }}</option>
          </select>
        </PtField>
        <PtField :label="$t('priority.label')">
          <PtSegmented v-model="form.priority" size="sm" :options="PRIORITIES.map((p) => ({ value: p, label: $t(`priority.${p}`) }))" />
        </PtField>
        <PtField :label="$t('tasks.start')" optional :error="fieldErrors.start_at">
          <input v-model="form.start_at" type="datetime-local" class="pt-field" />
        </PtField>
        <PtField :label="$t('tasks.due')" optional :error="fieldErrors.due_at">
          <input v-model="form.due_at" type="datetime-local" class="pt-field" :min="form.start_at || undefined" />
        </PtField>
      </div>

      <PtField :label="$t('tasks.description')" optional>
        <RichEditor v-model="form.description" :placeholder="$t('tasks.descriptionPlaceholder')" :project-id="projectId" />
      </PtField>

      <PtField :label="$t('tasks.assignees')" optional :error="fieldErrors.assignee_ids">
        <PtUserPicker v-model="form.assignees" />
      </PtField>

      <PtField :label="$t('tasks.labels')" optional>
        <PtLabelPicker v-model="form.label_ids" />
      </PtField>

      <PtField :label="$t('tasks.color')" optional>
        <PtColorPicker v-model="form.color" allow-none />
      </PtField>
      <button type="submit" class="hidden" />
    </form>
    <template #footer>
      <PtButton variant="ghost" :disabled="busy" @click="open = false">{{ $t("common.cancel") }}</PtButton>
      <PtButton :loading="busy" @click="submit">{{ editing ? $t("common.save") : $t("common.create") }}</PtButton>
    </template>
  </PtSheet>
</template>
