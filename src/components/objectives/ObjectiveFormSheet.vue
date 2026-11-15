<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import PtButton from "@/components/ui/PtButton.vue";
import PtField from "@/components/ui/PtField.vue";
import PtSheet from "@/components/ui/PtSheet.vue";
import PtUserPicker from "@/components/ui/PtUserPicker.vue";
import { objectivesApi } from "@/api/endpoints";
import { useApiError } from "@/composables/useApiError";
import { currentQuarter, period, type PeriodKey } from "@/domain/objectives";
import { useEntitiesStore } from "@/stores/entities";
import { useSessionStore } from "@/stores/session";
import type { Objective, Person, User } from "@/types/models";

/** Creates or edits an objective: what, for whom (entity or company), who owns it and over which period. */
const props = defineProps<{ objective?: Objective | null }>();
const open = defineModel<boolean>({ required: true });
const emit = defineEmits<{ saved: [id: number] }>();
const { t } = useI18n();
const router = useRouter();
const errors = useApiError();
const session = useSessionStore();
const entities = useEntitiesStore();

const form = reactive({ title: "", description: "", entity_id: null as number | null, owner: [] as (User | Person)[], starts_on: "", ends_on: "" });
const saving = ref(false);
const titleError = ref("");
const year = computed(() => Number((form.starts_on || currentQuarter().from).slice(0, 4)));
const presets: PeriodKey[] = ["q1", "q2", "q3", "q4", "s1", "s2", "year"];

function pick(key: PeriodKey): void {
  const p = period(key, year.value);
  form.starts_on = p.from;
  form.ends_on = p.to;
}
const isPreset = (key: PeriodKey) => {
  const p = period(key, year.value);
  return p.from === form.starts_on && p.to === form.ends_on;
};

watch(open, (value) => {
  if (!value) return;
  const o = props.objective;
  const q = currentQuarter();
  Object.assign(form, {
    title: o?.title ?? "",
    description: o?.description ?? "",
    entity_id: o ? o.entity_id : session.isGlobal ? null : (entities.entities[0]?.id ?? null),
    owner: o?.owner ? [o.owner] : session.user ? [session.user] : [],
    starts_on: o?.starts_on ?? q.from,
    ends_on: o?.ends_on ?? q.to,
  });
  titleError.value = "";
  void entities.load().catch(() => undefined);
});

async function submit(): Promise<void> {
  if (!form.title.trim()) {
    titleError.value = t("common.required");
    return;
  }
  saving.value = true;
  const payload = {
    title: form.title.trim(),
    description: form.description.trim() || null,
    entity_id: form.entity_id,
    owner_id: form.owner[form.owner.length - 1]?.id ?? null,
    starts_on: form.starts_on,
    ends_on: form.ends_on,
  };
  try {
    const saved = props.objective ? await objectivesApi.update(props.objective.id, payload) : await objectivesApi.create(payload);
    open.value = false;
    emit("saved", saved.data.id);
    if (!props.objective) void router.push(`/objectives/${saved.data.id}`);
  } catch (error) {
    errors.report(error);
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <PtSheet v-model="open" :title="objective ? $t('objectives.form.edit') : $t('objectives.form.new')" width="36rem">
    <form class="flex flex-col gap-5 pt-2" @submit.prevent="submit">
      <PtField :label="$t('objectives.form.title')" :error="titleError" :hint="$t('objectives.form.titleHint')">
        <input v-model="form.title" class="pt-field" maxlength="160" autofocus :placeholder="$t('objectives.form.titlePlaceholder')" />
      </PtField>
      <PtField :label="$t('objectives.form.why')" optional>
        <textarea v-model="form.description" rows="2" class="pt-field resize-none" maxlength="2000" />
      </PtField>
      <PtField :label="$t('objectives.form.period')">
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="key in presets"
            :key="key"
            type="button"
            class="pt-chip"
            :class="isPreset(key) && '!border-transparent !bg-ink !text-on-ink'"
            @click="pick(key)"
          >
            {{ $t(`objectives.periods.${key}`) }} {{ year }}
          </button>
        </div>
        <div class="mt-2 grid grid-cols-2 gap-3">
          <input v-model="form.starts_on" type="date" class="pt-field" required :aria-label="$t('projects.startsOn')" />
          <input v-model="form.ends_on" type="date" class="pt-field" required :min="form.starts_on" :aria-label="$t('projects.endsOn')" />
        </div>
      </PtField>
      <PtField v-if="session.isGlobal || entities.entities.length > 1" :label="$t('entities.entity')">
        <select v-model="form.entity_id" class="pt-field">
          <option v-if="session.isGlobal" :value="null">{{ $t("objectives.companyWide") }}</option>
          <option v-for="entity in entities.entities" :key="entity.id" :value="entity.id">{{ entity.name }}</option>
        </select>
      </PtField>
      <PtField :label="$t('objectives.form.owner')" optional>
        <PtUserPicker :model-value="form.owner as User[]" @update:model-value="(v) => (form.owner = v.slice(-1))" />
      </PtField>
      <button type="submit" class="hidden" />
    </form>
    <template #footer>
      <PtButton variant="ghost" @click="open = false">{{ $t("common.cancel") }}</PtButton>
      <PtButton :loading="saving" @click="submit">{{ objective ? $t("common.save") : $t("common.create") }}</PtButton>
    </template>
  </PtSheet>
</template>
