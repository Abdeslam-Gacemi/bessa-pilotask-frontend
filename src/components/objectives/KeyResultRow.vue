<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { CheckListIcon, Flag02Icon, ChartLineData01Icon, Message01Icon } from "@hugeicons/core-free-icons";
import HealthBadge from "./HealthBadge.vue";
import PaceBar from "./PaceBar.vue";
import PtAvatar from "@/components/ui/PtAvatar.vue";
import PtIcon from "@/components/ui/PtIcon.vue";
import { HEALTH_TONE, measure, signalText } from "@/domain/objectives";
import type { KeyResult } from "@/types/models";

/** One key result: what it measures, where it stands against the plan, and why it may need attention. */
const props = withDefaults(defineProps<{ kr: KeyResult; signals?: number }>(), { signals: 2 });
const emit = defineEmits<{ checkIn: [] }>();
const { t } = useI18n();

const TYPE_ICON = { tasks: CheckListIcon, metric: ChartLineData01Icon, milestone: Flag02Icon };
const insight = computed(() => props.kr.insight);
const shown = computed(() => (insight.value?.signals ?? []).slice(0, props.signals));
</script>

<template>
  <div v-if="insight" class="flex flex-col gap-2">
    <div class="flex items-center gap-3">
      <span class="grid size-8 shrink-0 place-items-center rounded-xl bg-surface-3 text-muted" :title="$t(`objectives.types.${kr.type}`)">
        <PtIcon :icon="TYPE_ICON[kr.type]" :size="16" />
      </span>
      <div class="min-w-0 flex-1">
        <p class="truncate text-sm font-semibold">{{ kr.title }}</p>
        <p class="truncate text-xs text-muted tabular-nums">{{ measure(kr, t) }}</p>
      </div>
      <span v-if="insight.stale" class="size-2 shrink-0 rounded-full bg-warning" :title="$t('objectives.signals.stale')" />
      <PtAvatar v-if="kr.owner" :name="kr.owner.name" :src="kr.owner.avatar_url" :size="24" :title="kr.owner.name" />
      <span class="w-10 text-end text-sm font-bold tabular-nums">{{ Math.round(insight.progress) }}%</span>
    </div>
    <div class="flex items-center gap-3 ps-11">
      <PaceBar class="flex-1" :progress="insight.progress" :expected="insight.expected" :forecast="insight.forecast" :health="insight.health" :height="6" />
      <HealthBadge :health="insight.health" size="sm" />
      <button
        v-if="kr.can.check_in"
        type="button"
        class="relative z-10 grid size-7 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-surface-3 hover:text-fg"
        :aria-label="$t('objectives.checkIn')"
        :title="$t('objectives.checkIn')"
        @click.stop="emit('checkIn')"
      >
        <PtIcon :icon="Message01Icon" :size="15" />
      </button>
    </div>
    <ul v-if="shown.length" class="flex flex-wrap gap-1.5 ps-11">
      <li
        v-for="signal in shown"
        :key="signal.code"
        class="rounded-md px-1.5 py-0.5 text-[11px] font-semibold"
        :class="[HEALTH_TONE[insight.health === 'on_track' ? 'at_risk' : insight.health].soft, HEALTH_TONE[insight.health === 'on_track' ? 'at_risk' : insight.health].text]"
      >
        {{ signalText(signal, t) }}
      </li>
    </ul>
  </div>
</template>
