<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import PaceBar from "./PaceBar.vue";
import PtButton from "@/components/ui/PtButton.vue";
import PtField from "@/components/ui/PtField.vue";
import PtSegmented from "@/components/ui/PtSegmented.vue";
import PtSheet from "@/components/ui/PtSheet.vue";
import PtSwitch from "@/components/ui/PtSwitch.vue";
import { keyResultsApi } from "@/api/endpoints";
import { useApiError } from "@/composables/useApiError";
import { useDates } from "@/composables/useDates";
import { HEALTHS, measure } from "@/domain/objectives";
import type { Health, KeyResult } from "@/types/models";

/** The weekly word on a key result: new value (metrics), done (milestones), confidence and a note. */
const props = defineProps<{ kr: KeyResult | null }>();
const open = defineModel<boolean>({ required: true });
const emit = defineEmits<{ saved: [] }>();
const { t } = useI18n();
const { fmt } = useDates();
const errors = useApiError();

const form = reactive({ value: null as number | null, done: false, confidence: "on_track" as Health, note: "" });
const saving = ref(false);
const healthOptions = computed(() => HEALTHS.map((h) => ({ value: h, label: t(`objectives.health.${h}`) })));

watch(open, (value) => {
  if (!value || !props.kr) return;
  Object.assign(form, {
    value: props.kr.current_value ?? props.kr.start_value,
    done: (props.kr.current_value ?? 0) >= 1,
    confidence: props.kr.last_check_in?.confidence ?? props.kr.insight?.health ?? "on_track",
    note: "",
  });
});

async function submit(): Promise<void> {
  if (!props.kr) return;
  saving.value = true;
  try {
    await keyResultsApi.checkIn(props.kr.id, {
      confidence: form.confidence,
      note: form.note.trim() || null,
      ...(props.kr.type === "metric" ? { value: form.value } : {}),
      ...(props.kr.type === "milestone" ? { done: form.done } : {}),
    });
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
  <PtSheet v-model="open" :title="$t('objectives.checkIn')" width="30rem">
    <form v-if="kr" class="flex flex-col gap-5 pt-2" @submit.prevent="submit">
      <div class="rounded-2xl bg-surface-2 p-4">
        <p class="font-semibold">{{ kr.title }}</p>
        <p class="mt-0.5 text-xs text-muted tabular-nums">{{ measure(kr, t) }}</p>
        <PaceBar v-if="kr.insight" class="mt-3" :progress="kr.insight.progress" :expected="kr.insight.expected" :forecast="kr.insight.forecast" :health="kr.insight.health" />
        <p v-if="kr.last_check_in" class="mt-2 text-xs text-muted">
          {{ $t("objectives.lastCheckIn", { when: fmt.relative(kr.last_check_in.created_at) }) }}
        </p>
      </div>

      <PtField v-if="kr.type === 'metric'" :label="$t('objectives.form.currentValue')" :hint="kr.unit ?? undefined">
        <input v-model.number="form.value" type="number" step="any" class="pt-field" required autofocus />
      </PtField>
      <PtSwitch v-else-if="kr.type === 'milestone'" v-model="form.done" :label="$t('objectives.form.milestoneDone')" />
      <p v-else class="text-sm text-muted">{{ $t("objectives.form.tasksMoveThemselves") }}</p>

      <PtField :label="$t('objectives.form.confidence')">
        <PtSegmented v-model="form.confidence" :options="healthOptions" block />
      </PtField>
      <PtField :label="$t('objectives.form.note')" optional>
        <textarea v-model="form.note" rows="3" class="pt-field resize-none" maxlength="1000" :placeholder="$t('objectives.form.notePlaceholder')" />
      </PtField>
      <button type="submit" class="hidden" />
    </form>
    <template #footer>
      <PtButton variant="ghost" @click="open = false">{{ $t("common.cancel") }}</PtButton>
      <PtButton :loading="saving" @click="submit">{{ $t("common.save") }}</PtButton>
    </template>
  </PtSheet>
</template>
