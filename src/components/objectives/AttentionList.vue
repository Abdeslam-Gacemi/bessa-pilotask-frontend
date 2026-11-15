<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import HealthBadge from "./HealthBadge.vue";
import PtAvatar from "@/components/ui/PtAvatar.vue";
import PtIcon from "@/components/ui/PtIcon.vue";
import { signalText } from "@/domain/objectives";
import type { AttentionItem } from "@/types/models";

/** The few key results to look at first, worst first, each with the reason in words. */
defineProps<{ items: AttentionItem[] }>();
const { t } = useI18n();
</script>

<template>
  <ul class="divide-y divide-line/70">
    <li v-for="item in items" :key="item.key_result_id">
      <RouterLink :to="`/objectives/${item.objective_id}`" class="group flex items-center gap-3 px-1 py-3 transition hover:bg-surface-2">
        <HealthBadge :health="item.health" size="sm" />
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-semibold">{{ item.title }}</p>
          <p class="truncate text-xs text-muted">
            {{ item.objective_title }}
            <template v-if="item.signals.length"> · <span class="text-fg">{{ item.signals.slice(0, 2).map((s) => signalText(s, t)).join(" · ") }}</span></template>
          </p>
        </div>
        <span class="text-sm font-bold tabular-nums">{{ Math.round(item.progress) }}%</span>
        <PtAvatar v-if="item.owner" :name="item.owner.name" :size="24" />
        <PtIcon :icon="ArrowRight01Icon" :size="16" class="text-subtle transition group-hover:translate-x-0.5 group-hover:text-fg rtl:rotate-180" />
      </RouterLink>
    </li>
  </ul>
</template>
