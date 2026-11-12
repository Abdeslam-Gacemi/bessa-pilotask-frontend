<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { useI18n } from "vue-i18n";
import { Add01Icon, Building03Icon, Delete02Icon, Folder01Icon, PencilEdit02Icon, UserMultipleIcon } from "@hugeicons/core-free-icons";
import PtButton from "@/components/ui/PtButton.vue";
import PtColorPicker from "@/components/ui/PtColorPicker.vue";
import PtEmpty from "@/components/ui/PtEmpty.vue";
import PtField from "@/components/ui/PtField.vue";
import PtIcon from "@/components/ui/PtIcon.vue";
import PtIconButton from "@/components/ui/PtIconButton.vue";
import PtIconPicker from "@/components/ui/PtIconPicker.vue";
import PtSheet from "@/components/ui/PtSheet.vue";
import PtSkeleton from "@/components/ui/PtSkeleton.vue";
import TeamVisibilityField from "@/components/settings/TeamVisibilityField.vue";
import { useMetaStore } from "@/stores/meta";
import { entitiesApi } from "@/api/endpoints";
import { ApiError } from "@/api/client";
import { useApiError } from "@/composables/useApiError";
import { useConfirm } from "@/composables/useConfirm";
import { useToast } from "@/composables/useToast";
import { tableIcon } from "@/plugins/icons";
import { useEntitiesStore } from "@/stores/entities";
import type { Entity } from "@/types/models";

/**
 * Super admins split the workspace into entities (companies, branches,
 * departments). An entity's admins and users only reach its projects and
 * only hear about them.
 */
const { t } = useI18n();
const store = useEntitiesStore();
const errors = useApiError();
const toast = useToast();
const { confirm, confirmAction } = useConfirm();

const open = ref(false);
const saving = ref(false);
const editing = ref<Entity | null>(null);
const nameError = ref("");
const form = reactive({
  name: "",
  description: "",
  color: "#326899" as string | null,
  icon: "building-03" as string | null,
  users_see_team_tasks: null as boolean | null,
});
const meta = useMetaStore();

function edit(entity: Entity | null): void {
  editing.value = entity;
  nameError.value = "";
  Object.assign(form, {
    name: entity?.name ?? "",
    description: entity?.description ?? "",
    color: entity?.color ?? "#326899",
    icon: entity?.icon ?? "building-03",
    users_see_team_tasks: entity?.users_see_team_tasks ?? null,
  });
  open.value = true;
}

async function submit(): Promise<void> {
  if (!form.name.trim()) {
    nameError.value = t("common.required");
    return;
  }
  if (!(await confirmAction(editing.value ? "update" : "create", "entity", form.name.trim()))) return;
  saving.value = true;
  const payload = {
    name: form.name.trim(),
    description: form.description || null,
    color: form.color,
    icon: form.icon,
    users_see_team_tasks: form.users_see_team_tasks,
  };
  try {
    if (editing.value) await entitiesApi.update(editing.value.id, payload);
    else await entitiesApi.create(payload);
    await store.load(true);
    open.value = false;
    toast.success(t("common.saved"));
  } catch (error) {
    if (error instanceof ApiError && error.fields.name) nameError.value = error.fields.name[0] ?? "";
    else errors.report(error);
  } finally {
    saving.value = false;
  }
}

async function remove(entity: Entity): Promise<void> {
  const run = async () => {
    await entitiesApi.remove(entity.id);
    await store.load(true);
  };
  try {
    if (await confirm({ title: t("entities.deleteConfirm", { name: entity.name }), message: t("entities.deleteHint"), danger: true, confirmLabel: t("common.delete"), run })) {
      toast.show(t("common.deleted"));
    }
  } catch (error) {
    errors.report(error);
  }
}

onMounted(() => void store.load(true).catch((error) => errors.report(error)));
</script>

<template>
  <div class="flex flex-col gap-6">
    <header class="flex flex-wrap items-end gap-3">
      <div v-stagger="0" class="me-auto">
        <h1 class="text-3xl font-bold">{{ $t("entities.title") }}</h1>
        <p class="mt-1 max-w-xl text-sm text-muted">{{ $t("entities.subtitle") }}</p>
      </div>
      <PtIconButton :icon="Add01Icon" variant="ink" :label="$t('entities.new')" @click="edit(null)" />
    </header>

    <div v-if="store.loading && !store.entities.length" class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <PtSkeleton v-for="i in 3" :key="i" class="h-36" />
    </div>
    <PtEmpty v-else-if="!store.entities.length" :icon="Building03Icon" :title="$t('entities.empty')" :hint="$t('entities.emptyHint')">
      <PtButton :icon="Add01Icon" @click="edit(null)">{{ $t("entities.new") }}</PtButton>
    </PtEmpty>
    <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <article v-for="(entity, i) in store.entities" :key="entity.id" v-stagger="i + 1" class="pt-card flex flex-col gap-4 p-5">
        <div class="flex items-start gap-3">
          <span class="grid size-12 shrink-0 place-items-center rounded-2xl text-white shadow-soft" :style="{ background: entity.color ?? 'var(--pt-ink)' }">
            <PtIcon :icon="tableIcon(entity.icon)" :size="24" />
          </span>
          <div class="min-w-0 flex-1">
            <h2 class="truncate text-lg font-bold">{{ entity.name }}</h2>
            <p v-if="entity.description" class="line-clamp-2 text-sm text-muted">{{ entity.description }}</p>
          </div>
          <PtIconButton :icon="PencilEdit02Icon" :size="18" :label="$t('common.edit')" @click="edit(entity)" />
          <PtIconButton :icon="Delete02Icon" :size="18" class="text-danger" :label="$t('common.delete')" @click="remove(entity)" />
        </div>
        <div class="mt-auto flex gap-2">
          <RouterLink :to="{ path: '/users' }" class="pt-chip">
            <PtIcon :icon="UserMultipleIcon" :size="14" />{{ $t("entities.people", entity.users_count ?? 0) }}
          </RouterLink>
          <span class="pt-chip"><PtIcon :icon="Folder01Icon" :size="14" />{{ $t("entities.projects", entity.projects_count ?? 0) }}</span>
        </div>
      </article>
    </div>

    <PtSheet v-model="open" :title="editing ? $t('entities.edit') : $t('entities.new')" width="34rem">
      <form class="flex flex-col gap-5 pt-2" @submit.prevent="submit">
        <PtField :label="$t('entities.name')" :error="nameError">
          <input v-model="form.name" class="pt-field" maxlength="120" :placeholder="$t('entities.namePlaceholder')" autofocus />
        </PtField>
        <PtField :label="$t('projects.description')" optional>
          <textarea v-model="form.description" class="pt-field min-h-20" maxlength="2000" />
        </PtField>
        <PtField :label="$t('projects.color')"><PtColorPicker v-model="form.color" /></PtField>
        <PtField :label="$t('projects.icon')"><PtIconPicker v-model="form.icon" :color="form.color" /></PtField>
        <PtField :label="$t('settings.teamTasks')" :hint="$t('settings.teamTasksHint')">
          <TeamVisibilityField v-model="form.users_see_team_tasks" :inherited="meta.meta?.access?.users_see_team_tasks ?? false" from="workspace" />
        </PtField>
        <button type="submit" class="hidden" />
      </form>
      <template #footer>
        <PtButton variant="ghost" @click="open = false">{{ $t("common.cancel") }}</PtButton>
        <PtButton :loading="saving" @click="submit">{{ $t("common.save") }}</PtButton>
      </template>
    </PtSheet>
  </div>
</template>
