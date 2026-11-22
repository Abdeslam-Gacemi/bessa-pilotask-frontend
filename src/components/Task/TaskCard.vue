<script setup lang="ts">
import { computed } from "vue";
import { Comment01Icon, Loading03Icon } from "@hugeicons/core-free-icons";
import { isTaskBusy } from "@/composables/useTaskBusy";
import PtAvatarStack from "@/components/ui/PtAvatarStack.vue";
import PtIcon from "@/components/ui/PtIcon.vue";
import DueChip from "./DueChip.vue";
import PriorityChip from "./PriorityChip.vue";
import { isClosed, taskAccent } from "@/domain/tasks";
import type { Task } from "@/types/models";

/** The task card of the kanban board. */
const props = defineProps<{ task: Task; showBoard?: boolean }>();
defineEmits<{ open: [task: Task] }>();

const closed = computed(() => isClosed(props.task.status?.category));
const busy = computed(() => isTaskBusy(props.task.id));
</script>

<template>
  <article
    class="pt-task-card group relative cursor-grab overflow-hidden rounded-2xl border border-line bg-surface p-3.5 shadow-soft transition-shadow duration-200 select-none [-webkit-touch-callout:none] hover:shadow-float active:cursor-grabbing"
    :class="busy && 'pt-card-busy'"
    :aria-busy="busy"
    tabindex="0"
    @click="$emit('open', task)"
    @keydown.enter="$emit('open', task)"
  >
    <span class="absolute inset-y-3 start-0 w-1 rounded-e-full" :style="{ background: taskAccent(task) }" />
    <!-- Saving a status change: a running bar on top and a small spinner; the card stays readable. -->
    <template v-if="busy">
      <span class="pt-bar-loading absolute inset-x-0 top-0 h-0.5" />
      <span class="absolute end-2.5 top-2.5 grid size-6 place-items-center rounded-full bg-surface text-primary shadow-soft">
        <PtIcon :icon="Loading03Icon" :size="14" class="animate-spin" />
      </span>
    </template>
    <div class="flex flex-wrap items-center gap-1.5 ps-1.5">
      <PriorityChip :priority="task.priority" compact />
      <span
        v-for="label in task.labels"
        :key="label.id"
        class="rounded-full px-2 py-0.5 text-[11px] font-semibold"
        :style="{ background: `color-mix(in oklab, ${label.color} 15%, transparent)`, color: label.color }"
      >
        {{ label.name }}
      </span>
    </div>
    <h3 class="mt-2 ps-1.5 text-sm leading-snug font-semibold" :class="closed && 'text-muted'">
      {{ task.title }}
    </h3>
    <p v-if="showBoard && task.board" class="mt-1 ps-1.5 text-xs text-muted">{{ task.board.name }}</p>
    <footer class="mt-3 flex items-center gap-2 ps-1.5">
      <DueChip :due="task.due_at" :overdue="task.is_overdue" :done="closed" />
      <span v-if="task.comments_count" class="inline-flex items-center gap-1 text-[11px] font-semibold text-muted">
        <PtIcon :icon="Comment01Icon" :size="14" />
        {{ task.comments_count }}
      </span>
      <PtAvatarStack class="ms-auto" :users="task.assignees ?? []" :size="24" />
    </footer>
  </article>
</template>
