<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import PtButton from "@/components/ui/PtButton.vue";
import PtColorPicker from "@/components/ui/PtColorPicker.vue";
import PtField from "@/components/ui/PtField.vue";
import PtIconPicker from "@/components/ui/PtIconPicker.vue";
import PtSheet from "@/components/ui/PtSheet.vue";
import RichEditor from "@/components/editor/RichEditor.vue";
import TeamVisibilityField from "@/components/settings/TeamVisibilityField.vue";
import { useMetaStore } from "@/stores/meta";
import { useSessionStore } from "@/stores/session";
import { boardsApi } from "@/api/endpoints";
import { useProjectsStore } from "@/stores/projects";
import { useApiError } from "@/composables/useApiError";
import { useConfirm } from "@/composables/useConfirm";
import type { Board } from "@/types/models";

/** Create or edit a table. The icon is optional; without a project (opened from "+"), one is picked here. */
const props = defineProps<{ projectId?: number | null; board?: Board | null }>();
const open = defineModel<boolean>({ required: true });
const emit = defineEmits<{ saved: [board: Board] }>();
const { t } = useI18n();
const errors = useApiError();
const { confirmAction } = useConfirm();

const projects = useProjectsStore();
const session = useSessionStore();
const form = reactive({
  name: "",
  description: "",
  color: null as string | null,
  icon: null as string | null,
  project_id: null as number | null,
  users_see_team_tasks: null as boolean | null,
});
const meta = useMetaStore();
// What "follow" means for this table: its entity's setting, else the workspace one.
const inheritedVisibility = computed(() => {
  const project = projects.projects.find((p) => p.id === form.project_id);
  return project?.entity?.users_see_team_tasks ?? meta.meta?.access?.users_see_team_tasks ?? false;
});
const projectError = ref("");
const saving = ref(false);
const nameError = ref("");

watch(open, (value) => {
  if (!value) return;
  Object.assign(form, {
    name: props.board?.name ?? "",
    description: props.board?.description ?? "",
    color: props.board?.color ?? "#326899",
    icon: props.board?.icon ?? null,
    project_id: props.board?.project_id ?? props.projectId ?? null,
    users_see_team_tasks: props.board?.users_see_team_tasks ?? null,
  });
  nameError.value = "";
  projectError.value = "";
  void projects.load();
});

async function submit(): Promise<void> {
  if (!form.name.trim()) {
    nameError.value = t("common.required");
    return;
  }
  if (!props.board && !form.project_id) {
    projectError.value = t("boards.pickProject");
    return;
  }
  if (!(await confirmAction(props.board ? "update" : "create", "board", form.name.trim()))) return;
  saving.value = true;
  const payload = {
    name: form.name.trim(),
    description: form.description || null,
    color: form.color,
    icon: form.icon,
    users_see_team_tasks: form.users_see_team_tasks,
  };
  try {
    const saved = props.board ? await boardsApi.update(props.board.id, payload) : await boardsApi.create(form.project_id!, payload);
    emit("saved", saved);
    open.value = false;
  } catch (error) {
    errors.report(error);
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <PtSheet v-model="open" :title="board ? $t('boards.edit') : $t('boards.new')" width="36rem">
    <form class="flex flex-col gap-5 pt-2" @submit.prevent="submit">
      <PtField :label="$t('boards.name')" :error="nameError">
        <input v-model="form.name" class="pt-field" maxlength="120" autofocus />
      </PtField>
      <PtField v-if="!board && !projectId" :label="$t('boards.project')" :error="projectError">
        <select v-model="form.project_id" class="pt-field">
          <option :value="null" disabled>{{ $t("boards.pickProject") }}</option>
          <option v-for="project in projects.projects.filter((p) => session.managesProject(p.id))" :key="project.id" :value="project.id">{{ project.name }}</option>
        </select>
      </PtField>
      <PtField :label="$t('projects.description')" optional>
        <RichEditor v-model="form.description" :placeholder="$t('tasks.descriptionPlaceholder')" min-height="5rem" />
      </PtField>
      <PtField :label="$t('projects.color')"><PtColorPicker v-model="form.color" /></PtField>
      <PtField :label="$t('projects.icon')" optional><PtIconPicker v-model="form.icon" :color="form.color" /></PtField>
      <PtField :label="$t('settings.teamTasks')" :hint="$t('settings.teamTasksHint')">
        <TeamVisibilityField v-model="form.users_see_team_tasks" :inherited="inheritedVisibility" from="entity" />
      </PtField>
      <button type="submit" class="hidden" />
    </form>
    <template #footer>
      <PtButton variant="ghost" @click="open = false">{{ $t("common.cancel") }}</PtButton>
      <PtButton :loading="saving" @click="submit">{{ board ? $t("common.save") : $t("common.create") }}</PtButton>
    </template>
  </PtSheet>
</template>
