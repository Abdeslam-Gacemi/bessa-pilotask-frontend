<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useLocalStorage } from "@vueuse/core";
import { Add01Icon, Alert02Icon, ArrowLeft01Icon, ArrowRight01Icon, CheckmarkCircle02Icon, Clock01Icon, Target02Icon } from "@hugeicons/core-free-icons";
import AttentionList from "@/components/objectives/AttentionList.vue";
import CheckInSheet from "@/components/objectives/CheckInSheet.vue";
import ObjectiveCard from "@/components/objectives/ObjectiveCard.vue";
import ObjectiveFormSheet from "@/components/objectives/ObjectiveFormSheet.vue";
import PaceBar from "@/components/objectives/PaceBar.vue";
import StatTile from "@/components/analytics/StatTile.vue";
import PtEmpty from "@/components/ui/PtEmpty.vue";
import PtIconButton from "@/components/ui/PtIconButton.vue";
import PtSegmented from "@/components/ui/PtSegmented.vue";
import PtSkeleton from "@/components/ui/PtSkeleton.vue";
import { objectivesApi } from "@/api/endpoints";
import { useAccess } from "@/composables/useAccess";
import { useApiError } from "@/composables/useApiError";
import { useRequest } from "@/composables/useRequest";
import { HEALTH_TONE, HEALTHS, currentQuarter, gap, period, type PeriodKey } from "@/domain/objectives";
import type { KeyResult, ObjectivesOverview } from "@/types/models";

/** Objectives of a period: how the organisation is doing, what needs attention, then each objective. */
const { t } = useI18n();
const access = useAccess();
const errors = useApiError();
const request = useRequest();

const now = currentQuarter();
const view = useLocalStorage("pt.objectives", { key: now.key as PeriodKey, year: now.year, entityId: null as number | null }, { mergeDefaults: true });
const current = computed(() => period(view.value.key, view.value.year));
const periods = computed(() => (["q1", "q2", "q3", "q4", "year"] as const).map((k) => ({ value: k, label: t(`objectives.periods.${k}`) })));

const overview = ref<ObjectivesOverview | null>(null);
const creating = ref(false);
const checkInOpen = ref(false);
const checkingIn = ref<KeyResult | null>(null);

async function load(): Promise<void> {
  try {
    const result = await request.run((signal) =>
      objectivesApi.list({ from: current.value.from, to: current.value.to, entity_id: view.value.entityId }, { signal }),
    );
    if (result) overview.value = result;
  } catch (error) {
    errors.report(error);
  }
}
watch([current, () => view.value.entityId], load, { immediate: true });

const summary = computed(() => overview.value?.summary);
const watching = computed(() => (summary.value ? summary.value.health_counts.at_risk + summary.value.health_counts.off_track : 0));
const delta = computed(() => (summary.value ? gap(summary.value.progress, summary.value.expected) : 0));

function checkIn(kr: KeyResult): void {
  checkingIn.value = kr;
  checkInOpen.value = true;
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <header class="flex flex-wrap items-end gap-3">
      <div class="me-auto">
        <h1 class="text-3xl font-bold">{{ $t("objectives.title") }}</h1>
        <p class="mt-1 text-sm text-muted">{{ $t("objectives.subtitle") }}</p>
      </div>
      <div class="flex items-center gap-1">
        <PtIconButton :icon="ArrowLeft01Icon" :size="18" class="rtl:rotate-180" :label="$t('objectives.previousYear')" @click="view.year--" />
        <span class="w-12 text-center text-sm font-bold tabular-nums">{{ view.year }}</span>
        <PtIconButton :icon="ArrowRight01Icon" :size="18" class="rtl:rotate-180" :label="$t('objectives.nextYear')" @click="view.year++" />
      </div>
      <PtSegmented v-model="view.key" :options="periods" size="sm" />
      <select v-if="access.filtersByEntity.value" v-model="view.entityId" class="pt-field w-auto py-2" :aria-label="$t('entities.entity')">
        <option :value="null">{{ $t("objectives.allEntities") }}</option>
        <option v-for="entity in access.entities.entities" :key="entity.id" :value="entity.id">{{ entity.name }}</option>
      </select>
      <PtIconButton v-if="access.canManage.value" :icon="Add01Icon" variant="ink" :label="$t('objectives.form.new')" @click="creating = true" />
    </header>

    <!-- First load -->
    <template v-if="!overview">
      <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <PtSkeleton v-for="i in 4" :key="i" class="h-32 rounded-card" />
      </div>
      <div class="grid gap-4 lg:grid-cols-2"><PtSkeleton v-for="i in 2" :key="i" class="h-72 rounded-card" /></div>
    </template>

    <PtEmpty v-else-if="!overview.data.length" :icon="Target02Icon" :title="$t('objectives.empty')" :hint="$t('objectives.emptyHint')" />

    <template v-else-if="summary">
      <!-- Headline: where we are vs where we should be, and how many objectives need a look. -->
      <section class="grid grid-cols-2 gap-3 lg:grid-cols-4" :class="request.loading.value && 'opacity-60 transition'">
        <div class="pt-card col-span-2 flex flex-col gap-3 p-4 lg:col-span-1">
          <span class="text-xs font-semibold text-muted">{{ $t("objectives.kpi.progress") }}</span>
          <p class="text-3xl font-bold tracking-tight tabular-nums">{{ Math.round(summary.progress) }}%</p>
          <PaceBar :progress="summary.progress" :expected="summary.expected" :health="delta >= -10 ? 'on_track' : delta >= -25 ? 'at_risk' : 'off_track'" />
          <p class="text-xs text-muted">{{ $t("objectives.kpi.expected", { n: Math.round(summary.expected) }) }}</p>
        </div>
        <StatTile :label="$t('objectives.health.on_track')" :value="summary.health_counts.on_track" :hint="$t('objectives.kpi.ofObjectives', { n: summary.objectives })" :icon="CheckmarkCircle02Icon" tone="success" />
        <StatTile
          :label="$t('objectives.kpi.watch')"
          :value="watching"
          :hint="$t('objectives.kpi.offTrack', summary.health_counts.off_track)"
          :icon="Alert02Icon"
          :tone="summary.health_counts.off_track ? 'danger' : watching ? 'warning' : 'neutral'"
        />
        <StatTile :label="$t('objectives.kpi.stale')" :value="summary.stale" :hint="$t('objectives.kpi.staleHint')" :icon="Clock01Icon" :tone="summary.stale ? 'warning' : 'neutral'" />
      </section>

      <!-- Objectives by health, as one bar -->
      <div class="flex h-2 overflow-hidden rounded-full bg-surface-3" role="img" :aria-label="HEALTHS.map((h) => `${$t(`objectives.health.${h}`)}: ${summary!.health_counts[h]}`).join(', ')">
        <span v-for="h in HEALTHS" :key="h" :class="HEALTH_TONE[h].bg" :style="{ flexGrow: summary.health_counts[h] }" />
      </div>

      <div class="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section class="grid min-w-0 grid-cols-[repeat(auto-fill,minmax(min(100%,24rem),1fr))] gap-4">
          <ObjectiveCard v-for="(objective, i) in overview.data" :key="objective.id" v-stagger="i" :objective="objective" @check-in="checkIn" />
        </section>
        <aside class="pt-card p-4 xl:sticky xl:top-4">
          <h2 class="mb-1 font-bold">{{ $t("objectives.attention") }}</h2>
          <p class="mb-2 text-xs text-muted">{{ $t("objectives.attentionHint") }}</p>
          <AttentionList v-if="summary.attention.length" :items="summary.attention" />
          <p v-else class="py-6 text-center text-sm text-muted">{{ $t("objectives.allGood") }}</p>
        </aside>
      </div>
    </template>

    <ObjectiveFormSheet v-model="creating" />
    <CheckInSheet v-model="checkInOpen" :kr="checkingIn" @saved="load" />
  </div>
</template>
