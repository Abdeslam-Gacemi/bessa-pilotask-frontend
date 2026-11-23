<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import PriorityChip from "@/components/Task/PriorityChip.vue";
import PtAvatarStack from "@/components/ui/PtAvatarStack.vue";
import PtIcon from "@/components/ui/PtIcon.vue";
import type { DashboardBucket } from "@/api/endpoints";
import { dayjs } from "@/plugins/dayjs";
import type { Task } from "@/types/models";

/** One task of a decision tile (managers' home and its "See all" list), with why it's there. */
const props = defineProps<{ task: Task; bucket: DashboardBucket; now: Date }>();
defineEmits<{ open: [id: number] }>();
const { t } = useI18n();

const TONES: Record<DashboardBucket, string> = {
  overdue: "bg-danger-soft text-danger",
  due_soon: "bg-warning-soft text-warning",
  unassigned: "bg-primary-soft text-primary",
  stalled: "bg-surface-3 text-muted",
};

/** Why this task is in the list, in a few words. */
const reason = computed(() => {
  const { task, now } = props;
  const days = (iso: string | null | undefined) => Math.max(1, Math.abs(dayjs(now).diff(dayjs(iso), "day")));
  switch (props.bucket) {
    case "overdue":
      return t("manager.reasons.late", { n: days(task.due_at) }, days(task.due_at));
    case "due_soon":
      return dayjs(task.due_at).from(dayjs(now));
    case "unassigned":
      return task.due_at ? t("manager.reasons.noOwnerDue", { when: dayjs(task.due_at).from(dayjs(now)) }) : t("manager.reasons.noOwner");
    default:
      return t("manager.reasons.idle", { n: days(task.updated_at) }, days(task.updated_at));
  }
});
</script>

<template>
  <button type="button" class="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-start transition hover:bg-surface-2" @click="$emit('open', task.id)">
    <span class="size-2.5 shrink-0 rounded-full" :style="{ background: task.board?.color ?? 'var(--pt-subtle)' }" />
    <span class="min-w-0 flex-1">
      <span class="block truncate text-sm font-semibold">{{ task.title }}</span>
      <span class="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted">
        {{ task.board?.name }}
        <PriorityChip v-if="task.priority === 'urgent' || task.priority === 'high'" :priority="task.priority" compact />
      </span>
    </span>
    <span class="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold whitespace-nowrap" :class="TONES[bucket]">{{ reason }}</span>
    <PtAvatarStack v-if="task.assignees?.length" class="max-sm:hidden" :users="task.assignees" :size="24" />
    <PtIcon :icon="ArrowRight01Icon" :size="16" class="shrink-0 text-subtle rtl:rotate-180" />
  </button>
</template>
