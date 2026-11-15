<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { ChartLineData01Icon, CheckListIcon, Flag02Icon } from "@hugeicons/core-free-icons";
import LinkPicker from "./LinkPicker.vue";
import PtButton from "@/components/ui/PtButton.vue";
import PtField from "@/components/ui/PtField.vue";
import PtSegmented from "@/components/ui/PtSegmented.vue";
import PtSheet from "@/components/ui/PtSheet.vue";
import PtUserPicker from "@/components/ui/PtUserPicker.vue";
import { keyResultsApi } from "@/api/endpoints";
import { useApiError } from "@/composables/useApiError";
import type { KeyResult, KeyResultLink, KeyResultType, Person, User } from "@/types/models";

/** Creates or edits a key result: how it is measured, its target or its linked work, owner and weight. */
const props = defineProps<{ objectiveId: number; kr: KeyResult | null }>();
const open = defineModel<boolean>({ required: true });
const emit = defineEmits<{ saved: [] }>();
const { t } = useI18n();
const errors = useApiError();

const form = reactive({
  title: "",
  type: "tasks" as KeyResultType,
  owner: [] as (User | Person)[],
  unit: "",
  start_value: 0,
  target_value: null as number | null,
  weight: 1,
  due_on: "",
  links: [] as KeyResultLink[],
});
const saving = ref(false);
const titleError = ref("");

const types = computed(() => [
  { value: "tasks" as const, label: t("objectives.types.tasks"), icon: CheckListIcon },
  { value: "metric" as const, label: t("objectives.types.metric"), icon: ChartLineData01Icon },
  { value: "milestone" as const, label: t("objectives.types.milestone"), icon: Flag02Icon },
]);
const weights = [1, 2, 3, 4, 5].map((w) => ({ value: String(w), label: `×${w}` }));
const weight = computed({ get: () => String(form.weight), set: (v: string) => (form.weight = Number(v)) });

watch(open, (value) => {
  if (!value) return;
  const kr = props.kr;
  Object.assign(form, {
    title: kr?.title ?? "",
    type: kr?.type ?? "tasks",
    owner: kr?.owner ? [kr.owner] : [],
    unit: kr?.unit ?? "",
    start_value: kr?.start_value ?? 0,
    target_value: kr?.target_value ?? null,
    weight: kr?.weight ?? 1,
    due_on: kr?.due_on ?? "",
    links: kr?.links ? [...kr.links] : [],
  });
  titleError.value = "";
});

async function submit(): Promise<void> {
  if (!form.title.trim()) {
    titleError.value = t("common.required");
    return;
  }
  saving.value = true;
  const payload = {
    title: form.title.trim(),
    type: form.type,
    owner_id: form.owner[form.owner.length - 1]?.id ?? null,
    unit: form.unit.trim() || null,
    start_value: form.start_value ?? 0,
    target_value: form.target_value,
    weight: form.weight,
    due_on: form.due_on || null,
    links: form.links.map((l) => ({ type: l.type, id: l.id })),
  };
  try {
    if (props.kr) await keyResultsApi.update(props.kr.id, payload);
    else await keyResultsApi.create(props.objectiveId, payload);
    open.value = false;
    emit("saved");
  } catch (error) {
    errors.report(error);
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <PtSheet v-model="open" :title="kr ? $t('objectives.form.editKeyResult') : $t('objectives.form.newKeyResult')" width="38rem">
    <form class="flex flex-col gap-5 pt-2" @submit.prevent="submit">
      <PtField :label="$t('objectives.form.krTitle')" :error="titleError">
        <input v-model="form.title" class="pt-field" maxlength="160" autofocus :placeholder="$t('objectives.form.krTitlePlaceholder')" />
      </PtField>
      <PtField :label="$t('objectives.form.measuredBy')" :hint="$t(`objectives.typeHints.${form.type}`)">
        <PtSegmented v-model="form.type" :options="types" block />
      </PtField>

      <PtField v-if="form.type === 'tasks'" :label="$t('objectives.form.linkedWork')" :hint="$t('objectives.form.linkedWorkHint')">
        <LinkPicker v-model="form.links" />
      </PtField>
      <div v-else-if="form.type === 'metric'" class="grid grid-cols-3 gap-3">
        <PtField :label="$t('objectives.form.start')"><input v-model.number="form.start_value" type="number" step="any" class="pt-field" /></PtField>
        <PtField :label="$t('objectives.form.target')"><input v-model.number="form.target_value" type="number" step="any" class="pt-field" required /></PtField>
        <PtField :label="$t('objectives.form.unit')" optional><input v-model="form.unit" class="pt-field" maxlength="16" placeholder="%, €, inc." /></PtField>
      </div>
      <PtField v-else :label="$t('objectives.form.dueOn')" optional>
        <input v-model="form.due_on" type="date" class="pt-field" />
      </PtField>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <PtField :label="$t('objectives.form.owner')" :hint="$t('objectives.form.ownerHint')" optional>
          <PtUserPicker :model-value="form.owner as User[]" @update:model-value="(v) => (form.owner = v.slice(-1))" />
        </PtField>
        <PtField :label="$t('objectives.form.weight')" :hint="$t('objectives.form.weightHint')">
          <PtSegmented v-model="weight" :options="weights" size="sm" />
        </PtField>
      </div>
      <button type="submit" class="hidden" />
    </form>
    <template #footer>
      <PtButton variant="ghost" @click="open = false">{{ $t("common.cancel") }}</PtButton>
      <PtButton :loading="saving" @click="submit">{{ kr ? $t("common.save") : $t("common.create") }}</PtButton>
    </template>
  </PtSheet>
</template>
