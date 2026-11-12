<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import PtButton from "@/components/ui/PtButton.vue";
import PtColorPicker from "@/components/ui/PtColorPicker.vue";
import PtField from "@/components/ui/PtField.vue";
import PtIconPicker from "@/components/ui/PtIconPicker.vue";
import PtSheet from "@/components/ui/PtSheet.vue";
import PtUserPicker from "@/components/ui/PtUserPicker.vue";
import { projectsApi } from "@/api/endpoints";
import { useApiError } from "@/composables/useApiError";
import { useConfirm } from "@/composables/useConfirm";
import { useEntitiesStore } from "@/stores/entities";
import { useSessionStore } from "@/stores/session";
import type { Project, User } from "@/types/models";

const props = defineProps<{ project?: Project | null }>();
const open = defineModel<boolean>({ required: true });
const emit = defineEmits<{ saved: [project: Project] }>();
const { t } = useI18n();
const errors = useApiError();
const { confirmAction } = useConfirm();

const form = reactive({
  name: "",
  description: "",
  color: null as string | null,
  icon: null as string | null,
  starts_on: "",
  ends_on: "",
  members: [] as User[],
  managers: [] as User[],
  entity_id: null as number | null,
});
const session = useSessionStore();
const entityStore = useEntitiesStore();
// Admins name project managers (simple users who run this project's tables and tasks).
const canNameManagers = computed(() => (props.project ? Boolean(props.project.can?.administer) : session.canManage));
const managerChoices = computed(() => form.managers);
function onManagers(next: User[]): void {
  const simple = next.filter((u) => u.role === "user");
  form.managers = simple;
  // A manager is not listed twice.
  form.members = form.members.filter((m) => !simple.some((u) => u.id === m.id));
}

// Global managers pick any entity (or none: global); managers of several entities pick one of theirs.
const pickEntity = computed(() => (session.isGlobal ? entityStore.entities.length > 0 : entityStore.entities.length > 1));
const saving = ref(false);
const nameError = ref("");

watch(open, (value) => {
  if (!value) return;
  const p = props.project;
  Object.assign(form, {
    name: p?.name ?? "",
    description: p?.description ?? "",
    color: p?.color ?? "#53AEFF",
    icon: p?.icon ?? "folder-01",
    starts_on: p?.starts_on ?? "",
    ends_on: p?.ends_on ?? "",
    members: (p?.members ?? []).filter((u) => u.project_role !== "manager"),
    managers: (p?.members ?? []).filter((u) => u.project_role === "manager"),
    entity_id: p?.entity_id ?? (session.isGlobal ? null : (entityStore.entities[0]?.id ?? null)),
  });
  void entityStore.load().catch(() => undefined);
  nameError.value = "";
});

async function submit(): Promise<void> {
  if (!form.name.trim()) {
    nameError.value = t("common.required");
    return;
  }
  if (!(await confirmAction(props.project ? "update" : "create", "project", form.name.trim()))) return;
  saving.value = true;
  const payload = {
    name: form.name.trim(),
    description: form.description || null,
    color: form.color,
    icon: form.icon,
    starts_on: form.starts_on || null,
    ends_on: form.ends_on || null,
    member_ids: form.members.map((u) => u.id),
    ...(canNameManagers.value ? { manager_ids: form.managers.map((u) => u.id) } : {}),
    ...(pickEntity.value ? { entity_id: form.entity_id } : {}),
  };
  try {
    const saved = props.project ? await projectsApi.update(props.project.id, payload) : await projectsApi.create(payload);
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
  <PtSheet v-model="open" :title="project ? $t('projects.edit') : $t('projects.new')" width="38rem">
    <form class="flex flex-col gap-5 pt-2" @submit.prevent="submit">
      <PtField :label="$t('projects.name')" :error="nameError">
        <input v-model="form.name" class="pt-field" maxlength="120" autofocus />
      </PtField>
      <PtField :label="$t('projects.description')" optional>
        <textarea v-model="form.description" rows="3" class="pt-field resize-none" maxlength="2000" />
      </PtField>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <PtField :label="$t('projects.startsOn')" optional><input v-model="form.starts_on" type="date" class="pt-field" /></PtField>
        <PtField :label="$t('projects.endsOn')" optional><input v-model="form.ends_on" type="date" class="pt-field" :min="form.starts_on" /></PtField>
      </div>
      <PtField :label="$t('projects.color')"><PtColorPicker v-model="form.color" /></PtField>
      <PtField :label="$t('projects.icon')"><PtIconPicker v-model="form.icon" :color="form.color" /></PtField>
      <PtField v-if="pickEntity" :label="$t('entities.entity')" :hint="$t('entities.projectHint')">
        <select v-model="form.entity_id" class="pt-field">
          <option v-if="session.isGlobal" :value="null">{{ $t("entities.global") }}</option>
          <option v-for="entity in entityStore.entities" :key="entity.id" :value="entity.id">{{ entity.name }}</option>
        </select>
      </PtField>
      <PtField v-if="canNameManagers" :label="$t('projects.managers')" :hint="$t('projects.managersHint')" optional>
        <PtUserPicker :model-value="managerChoices" @update:model-value="onManagers" />
      </PtField>
      <PtField :label="$t('projects.members')" optional><PtUserPicker v-model="form.members" /></PtField>
      <button type="submit" class="hidden" />
    </form>
    <template #footer>
      <PtButton variant="ghost" @click="open = false">{{ $t("common.cancel") }}</PtButton>
      <PtButton :loading="saving" @click="submit">{{ project ? $t("common.save") : $t("common.create") }}</PtButton>
    </template>
  </PtSheet>
</template>
