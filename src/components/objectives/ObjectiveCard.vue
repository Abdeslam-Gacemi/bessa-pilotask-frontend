<script setup lang="ts">
import { computed } from "vue";
import HealthBadge from "./HealthBadge.vue";
import KeyResultRow from "./KeyResultRow.vue";
import PtAvatar from "@/components/ui/PtAvatar.vue";
import PtRing from "@/components/ui/PtRing.vue";
import { HEALTH_TONE, gap } from "@/domain/objectives";
import type { KeyResult, Objective } from "@/types/models";

/** An objective at a glance: ring, pace verdict and its key results. Click opens it. */
const props = defineProps<{ objective: Objective }>();
const emit = defineEmits<{ checkIn: [kr: KeyResult] }>();

const insight = computed(() => props.objective.insight!);
const delta = computed(() => gap(insight.value.progress, insight.value.expected));
</script>

<template>
  <!-- Stretched title link: the whole card opens the objective, while check-in buttons stay real buttons. -->
  <article class="pt-card group relative flex min-w-0 flex-col gap-4 p-5 transition hover:-translate-y-0.5 hover:shadow-float">
    <div class="flex items-start gap-4">
      <PtRing :value="insight.progress" :size="64" :stroke="7" :color="HEALTH_TONE[insight.health].color" track="var(--pt-surface-3)">
        <span class="text-sm font-bold tabular-nums">{{ Math.round(insight.progress) }}%</span>
      </PtRing>
      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center gap-2">
          <HealthBadge :health="insight.health" size="sm" />
          <span v-if="objective.entity" class="truncate text-xs font-semibold text-muted">{{ objective.entity.name }}</span>
          <span v-else class="text-xs font-semibold text-muted">{{ $t("objectives.companyWide") }}</span>
        </div>
        <h3 class="mt-1.5 line-clamp-2 text-base leading-snug font-bold">
          <RouterLink :to="`/objectives/${objective.id}`" class="after:absolute after:inset-0 after:rounded-card focus-visible:outline-none">{{ objective.title }}</RouterLink>
        </h3>
        <p class="mt-1 text-xs text-muted tabular-nums">
          <span :class="delta >= 0 ? 'text-success' : delta <= -10 ? 'text-danger' : 'text-warning'" class="font-semibold">
            {{ delta >= 0 ? $t("objectives.ahead", { n: delta }) : $t("objectives.behind", { n: -delta }) }}
          </span>
          · {{ $t("objectives.daysLeft", insight.days_left) }}
          <template v-if="insight.forecast !== null"> · {{ $t("objectives.forecastShort", { n: Math.round(insight.forecast) }) }}</template>
        </p>
      </div>
      <PtAvatar v-if="objective.owner" :name="objective.owner.name" :src="objective.owner.avatar_url" :size="30" :title="objective.owner.name" />
    </div>

    <div v-if="objective.key_results?.length" class="flex flex-col gap-4 border-t border-line/70 pt-4">
      <KeyResultRow v-for="kr in objective.key_results" :key="kr.id" :kr="kr" :signals="1" @check-in="emit('checkIn', kr)" />
    </div>
    <p v-else class="border-t border-line/70 pt-4 text-sm text-muted">{{ $t("objectives.noKeyResults") }}</p>
  </article>
</template>
