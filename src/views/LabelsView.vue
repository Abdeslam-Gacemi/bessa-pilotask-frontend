<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { useI18n } from "vue-i18n";
import { Add01Icon, Delete02Icon, PencilEdit02Icon, Tag01Icon } from "@hugeicons/core-free-icons";
import PtButton from "@/components/ui/PtButton.vue";
import PtColorPicker from "@/components/ui/PtColorPicker.vue";
import PtEmpty from "@/components/ui/PtEmpty.vue";
import PtField from "@/components/ui/PtField.vue";
import PtIconButton from "@/components/ui/PtIconButton.vue";
import PtSheet from "@/components/ui/PtSheet.vue";
import { labelsApi } from "@/api/endpoints";
import { useApiError } from "@/composables/useApiError";
import { useConfirm } from "@/composables/useConfirm";
import { useMetaStore } from "@/stores/meta";
import type { Label } from "@/types/models";

const { t } = useI18n();
const meta = useMetaStore();
const errors = useApiError();
const { confirm, confirmAction } = useConfirm();

const open = ref(false);
const editing = ref<Label | null>(null);
const form = reactive({ name: "", color: "#53AEFF" as string | null });

function edit(label: Label | null): void {
  editing.value = label;
  form.name = label?.name ?? "";
  form.color = label?.color ?? "#53AEFF";
  open.value = true;
}

async function submit(): Promise<void> {
  if (!form.name.trim() || !form.color) return;
  if (!(await confirmAction(editing.value ? "update" : "create", "label", form.name.trim()))) return;
  try {
    const payload = { name: form.name.trim(), color: form.color };
    if (editing.value) await labelsApi.update(editing.value.id, payload);
    else await labelsApi.create(payload);
    open.value = false;
    await meta.reloadLabels();
  } catch (error) {
    errors.report(error);
  }
}

async function remove(label: Label): Promise<void> {
  const run = async () => {
    await labelsApi.remove(label.id);
    await meta.reloadLabels();
  };
  await confirm({ title: t("labels.deleteConfirm", { name: label.name }), danger: true, confirmLabel: t("common.delete"), run });
}

onMounted(() => meta.reloadLabels());
</script>

<template>
  <div class="flex flex-col gap-6">
    <header class="flex flex-wrap items-end gap-3">
      <div class="me-auto">
        <h1 class="text-3xl font-bold">{{ $t("labels.title") }}</h1>
        <p class="mt-1 text-sm text-muted">{{ $t("labels.subtitle") }}</p>
      </div>
      <PtIconButton :icon="Add01Icon" variant="ink" :label="$t('labels.new')" @click="edit(null)" />
    </header>

    <PtEmpty v-if="!meta.labels.length" :icon="Tag01Icon" :title="$t('labels.empty')" />
    <div v-else class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div v-for="(label, i) in meta.labels" :key="label.id" v-stagger="i" class="pt-card flex items-center gap-3 p-4">
        <span class="size-10 rounded-2xl" :style="{ background: label.color }" />
        <div class="min-w-0 flex-1">
          <p class="truncate font-bold">{{ label.name }}</p>
          <p class="text-xs text-muted">{{ $t("labels.used", label.tasks_count ?? 0) }}</p>
        </div>
        <PtIconButton :icon="PencilEdit02Icon" :size="18" :label="$t('common.edit')" @click="edit(label)" />
        <PtIconButton :icon="Delete02Icon" :size="18" class="text-danger" :label="$t('common.delete')" @click="remove(label)" />
      </div>
    </div>

    <PtSheet v-model="open" :title="editing ? $t('common.edit') : $t('labels.new')" width="28rem">
      <form class="flex flex-col gap-4 pt-2" @submit.prevent="submit">
        <PtField :label="$t('labels.name')"><input v-model="form.name" class="pt-field" maxlength="40" required autofocus /></PtField>
        <PtField :label="$t('labels.color')"><PtColorPicker v-model="form.color" /></PtField>
        <button type="submit" class="hidden" />
      </form>
      <template #footer>
        <PtButton variant="ghost" @click="open = false">{{ $t("common.cancel") }}</PtButton>
        <PtButton @click="submit">{{ $t("common.save") }}</PtButton>
      </template>
    </PtSheet>
  </div>
</template>
