<script setup lang="ts">
import { statusName } from "@/domain/statusName";
import { computed } from "vue";
import { ArrowRight01Icon, Loading03Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { isTaskBusy } from "@/composables/useTaskBusy";
import PtIcon from "@/components/ui/PtIcon.vue";
import PtAvatarStack from "@/components/ui/PtAvatarStack.vue";
import DueChip from "./DueChip.vue";
import PriorityChip from "./PriorityChip.vue";
import { isClosed } from "@/domain/tasks";
import type { Task } from "@/types/models";

/** One line of a task list, with a done checkbox (for people allowed to move it). */
const props = defineProps<{ task: Task; showBoard?: boolean; dense?: boolean }>();
defineEmits<{ open: [task: Task]; toggle: [task: Task] }>();

const done = computed(() => props.task.status?.category === "done");
const closed = computed(() => isClosed(props.task.status?.category));
const busy = computed(() => isTaskBusy(props.task.id));
</script>

<template>
  <div
    class="group flex items-center gap-3 rounded-2xl px-3 transition hover:bg-surface-2"
    :class="[dense ? 'py-2' : 'py-3', busy && 'opacity-70']"
    :aria-busy="busy"
  >
    <button
      type="button"
      class="grid size-6 shrink-0 place-items-center rounded-full border-2 transition"
      :class="
        busy
          ? 'border-primary/40 text-primary'
          : done
            ? 'border-ink bg-ink text-on-ink'
            : 'border-line text-transparent hover:border-ink hover:text-subtle'
      "
      :disabled="!task.can?.move || busy"
      :aria-label="done ? $t('tasks.reopen') : $t('tasks.markDone')"
      :aria-pressed="done"
      @click.stop="$emit('toggle', task)"
    >
      <PtIcon v-if="busy" :icon="Loading03Icon" :size="13" class="animate-spin" />
      <PtIcon v-else :icon="Tick02Icon" :size="13" :stroke="3" />
    </button>
    <button type="button" class="min-w-0 flex-1 text-start" @click="$emit('open', task)">
      <p class="truncate text-sm font-semibold" :class="closed && 'text-muted'">{{ task.title }}</p>
      <p class="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted">
        <span v-if="showBoard && task.board" class="inline-flex items-center gap-1">
          <span class="size-1.5 rounded-full" :style="{ background: task.board.color ?? 'var(--pt-subtle)' }" />
          {{ task.board.name }}
        </span>
        <span v-if="showBoard && task.board && task.status">·</span>
        <span v-if="task.status">{{ statusName(task.status) }}</span>
      </p>
    </button>
    <PriorityChip class="max-sm:hidden" :priority="task.priority" compact />
    <DueChip :due="task.due_at" :overdue="task.is_overdue" :done="closed" />
    <PtAvatarStack class="max-sm:hidden" :users="task.assignees ?? []" :size="24" />
    <PtIcon :icon="ArrowRight01Icon" :size="16" class="text-subtle rtl:rotate-180" />
  </div>
</template>
