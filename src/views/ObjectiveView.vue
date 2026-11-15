<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { Add01Icon, ArrowDown01Icon, ArrowLeft01Icon, Delete02Icon, PencilEdit02Icon, Target02Icon } from "@hugeicons/core-free-icons";
import CheckInSheet from "@/components/objectives/CheckInSheet.vue";
import HealthBadge from "@/components/objectives/HealthBadge.vue";
import KeyResultDetails from "@/components/objectives/KeyResultDetails.vue";
import KeyResultFormSheet from "@/components/objectives/KeyResultFormSheet.vue";
import KeyResultRow from "@/components/objectives/KeyResultRow.vue";
import ObjectiveFormSheet from "@/components/objectives/ObjectiveFormSheet.vue";
import ProgressPlanChart from "@/components/objectives/ProgressPlanChart.vue";
import PtAvatar from "@/components/ui/PtAvatar.vue";
import PtButton from "@/components/ui/PtButton.vue";
import PtEmpty from "@/components/ui/PtEmpty.vue";
import PtIcon from "@/components/ui/PtIcon.vue";
import PtIconButton from "@/components/ui/PtIconButton.vue";
import PtRing from "@/components/ui/PtRing.vue";
import PtSkeleton from "@/components/ui/PtSkeleton.vue";
import { keyResultsApi, objectivesApi } from "@/api/endpoints";
import { useApiError } from "@/composables/useApiError";
import { useConfirm } from "@/composables/useConfirm";
import { useDates } from "@/composables/useDates";
import { useRequest } from "@/composables/useRequest";
import { HEALTH_TONE, gap } from "@/domain/objectives";
import type { KeyResult, ObjectiveDetail } from "@/types/models";

/** One objective: the verdict (progress, plan, forecast), the trend, and each key result with what is behind it. */
const props = defineProps<{ id: number }>();
const { t } = useI18n();
const router = useRouter();
const { fmt } = useDates();
const errors = useApiError();
const { confirm } = useConfirm();
const request = useRequest();

const detail = ref<ObjectiveDetail | null>(null);
const missing = ref(false);
const editing = ref(false);
const krOpen = ref(false);
const krEditing = ref<KeyResult | null>(null);
const checkInOpen = ref(false);
const checkingIn = ref<KeyResult | null>(null);
const expanded = ref<Set<number>>(new Set());

async function load(): Promise<void> {
  try {
    const result = await request.run((signal) => objectivesApi.get(props.id, { signal }));
    if (result) detail.value = result;
  } catch (error) {
    missing.value = true;
    errors.report(error);
  }
}
watch(() => props.id, load, { immediate: true });

const objective = computed(() => detail.value?.data);
const insight = computed(() => objective.value?.insight);
const delta = computed(() => (insight.value ? gap(insight.value.progress, insight.value.expected) : 0));

/** The verdict in one sentence a director can repeat. */
const verdict = computed(() => {
  const i = insight.value;
  if (!i) return "";
  if (i.progress >= 100) return t("objectives.verdict.done");
  if (i.expected <= 0) return t("objectives.verdict.notStarted");
  const pace = delta.value >= 0 ? t("objectives.ahead", { n: delta.value }) : t("objectives.behind", { n: -delta.value });
  return i.forecast !== null ? t("objectives.verdict.withForecast", { pace, n: Math.round(i.forecast) }) : pace;
});

function toggle(id: number): void {
  const next = new Set(expanded.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  expanded.value = next;
}

function editKr(kr: KeyResult | null): void {
  krEditing.value = kr;
  krOpen.value = true;
}

function checkIn(kr: KeyResult): void {
  checkingIn.value = kr;
  checkInOpen.value = true;
}

async function removeKr(kr: KeyResult): Promise<void> {
  await confirm({ title: t("objectives.deleteKeyResult", { name: kr.title }), danger: true, confirmLabel: t("common.delete"), run: async () => {
    await keyResultsApi.remove(kr.id);
    await load();
  } });
}

async function removeObjective(): Promise<void> {
  if (!objective.value) return;
  const done = await confirm({ title: t("objectives.deleteObjective", { name: objective.value.title }), danger: true, confirmLabel: t("common.delete"), run: () => objectivesApi.remove(props.id) });
  if (done) void router.replace("/objectives");
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <RouterLink to="/objectives" class="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-muted transition hover:text-fg">
      <PtIcon :icon="ArrowLeft01Icon" :size="16" class="rtl:rotate-180" />
      {{ $t("objectives.title") }}
    </RouterLink>

    <PtEmpty v-if="missing && !objective" :icon="Target02Icon" :title="$t('errors.notFound')" />

    <template v-else-if="!objective || !insight || !detail">
      <PtSkeleton class="h-10 w-2/3 rounded-xl" />
      <div class="grid gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]"><PtSkeleton class="h-72 rounded-card" /><PtSkeleton class="h-72 rounded-card" /></div>
      <PtSkeleton v-for="i in 3" :key="i" class="h-24 rounded-card" />
    </template>

    <template v-else>
      <header class="flex flex-wrap items-start gap-3">
        <div class="me-auto min-w-0">
          <div class="flex flex-wrap items-center gap-2 text-xs font-semibold text-muted">
            <HealthBadge :health="insight.health" />
            <span>{{ objective.entity?.name ?? $t("objectives.companyWide") }}</span>
            <span>·</span>
            <span class="tabular-nums">{{ fmt.day(objective.starts_on) }} → {{ fmt.day(objective.ends_on) }}</span>
            <span>·</span>
            <span>{{ $t("objectives.daysLeft", insight.days_left) }}</span>
          </div>
          <h1 class="mt-2 text-3xl font-bold text-balance">{{ objective.title }}</h1>
          <p v-if="objective.description" class="mt-2 max-w-3xl text-sm text-muted">{{ objective.description }}</p>
        </div>
        <div class="flex items-center gap-2">
          <span v-if="objective.owner" class="flex items-center gap-2 rounded-full border border-line py-1 ps-1 pe-3 text-sm font-semibold">
            <PtAvatar :name="objective.owner.name" :src="objective.owner.avatar_url" :size="26" />
            {{ objective.owner.name }}
          </span>
          <PtIconButton v-if="objective.can.update" :icon="PencilEdit02Icon" :size="18" :label="$t('common.edit')" @click="editing = true" />
          <PtIconButton v-if="objective.can.delete" :icon="Delete02Icon" :size="18" class="text-danger" :label="$t('common.delete')" @click="removeObjective" />
        </div>
      </header>

      <!-- Verdict and trend -->
      <section class="grid gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <div class="pt-card flex flex-col items-center gap-4 p-5 text-center">
          <PtRing :value="insight.progress" :size="148" :stroke="12" :color="HEALTH_TONE[insight.health].color" track="var(--pt-surface-3)">
            <span>
              <span class="block text-4xl font-bold tracking-tight tabular-nums">{{ Math.round(insight.progress) }}%</span>
              <span class="text-xs text-muted">{{ $t("objectives.kpi.progress") }}</span>
            </span>
          </PtRing>
          <p class="text-sm font-semibold text-balance">{{ verdict }}</p>
          <dl class="grid w-full grid-cols-2 gap-2 text-start">
            <div class="rounded-2xl bg-surface-2 p-3">
              <dt class="text-xs text-muted">{{ $t("objectives.expectedToday") }}</dt>
              <dd class="text-xl font-bold tabular-nums">{{ Math.round(insight.expected) }}%</dd>
            </div>
            <div class="rounded-2xl bg-surface-2 p-3">
              <dt class="text-xs text-muted">{{ $t("objectives.forecastEnd") }}</dt>
              <dd class="text-xl font-bold tabular-nums">{{ insight.forecast === null ? "—" : `${Math.round(insight.forecast)}%` }}</dd>
            </div>
          </dl>
        </div>
        <div class="pt-card p-5">
          <h2 class="mb-3 font-bold">{{ $t("objectives.chart.title") }}</h2>
          <ProgressPlanChart :timeline="detail.timeline" />
        </div>
      </section>

      <!-- Key results -->
      <section class="flex flex-col gap-3">
        <div class="flex items-center gap-3">
          <h2 class="me-auto text-lg font-bold">{{ $t("objectives.keyResults") }}</h2>
          <PtButton v-if="objective.can.update" size="sm" variant="secondary" @click="editKr(null)">
            <PtIcon :icon="Add01Icon" :size="16" /> {{ $t("objectives.form.newKeyResult") }}
          </PtButton>
        </div>
        <p v-if="!objective.key_results?.length" class="pt-card p-6 text-center text-sm text-muted">{{ $t("objectives.noKeyResults") }}</p>
        <article v-for="(kr, i) in objective.key_results" :key="kr.id" v-stagger="i" class="pt-card p-4">
          <div class="flex items-start gap-2">
            <KeyResultRow class="min-w-0 flex-1" :kr="kr" :signals="expanded.has(kr.id) ? 0 : 2" @check-in="checkIn(kr)" />
            <PtIconButton v-if="objective.can.update" :icon="PencilEdit02Icon" :size="16" :label="$t('common.edit')" @click="editKr(kr)" />
            <PtIconButton v-if="objective.can.update" :icon="Delete02Icon" :size="16" class="text-danger" :label="$t('common.delete')" @click="removeKr(kr)" />
            <PtIconButton
              :icon="ArrowDown01Icon"
              :size="16"
              :class="expanded.has(kr.id) && 'rotate-180'"
              class="transition"
              :label="$t('objectives.details')"
              :aria-expanded="expanded.has(kr.id)"
              @click="toggle(kr.id)"
            />
          </div>
          <KeyResultDetails v-if="expanded.has(kr.id)" :kr="kr" class="mt-4 border-t border-line/70 pt-4" />
        </article>
      </section>

      <ObjectiveFormSheet v-model="editing" :objective="objective" @saved="load" />
      <KeyResultFormSheet v-model="krOpen" :objective-id="objective.id" :kr="krEditing" @saved="load" />
      <CheckInSheet v-model="checkInOpen" :kr="checkingIn" @saved="load" />
    </template>
  </div>
</template>
