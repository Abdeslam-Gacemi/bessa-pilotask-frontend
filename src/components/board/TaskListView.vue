<script setup lang="ts">
import { statusName } from "@/domain/statusName";
import { ref } from "vue";
import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import PtIcon from "@/components/ui/PtIcon.vue";
import TaskRow from "@/components/tasks/TaskRow.vue";
import type { Status, Task } from "@/types/models";

/** Tasks grouped by status, collapsible, with a done checkbox per row. */
defineProps<{ columns: { status: Status; tasks: Task[] }[] }>();
defineEmits<{ open: [task: Task]; toggle: [task: Task] }>();

const collapsed = ref<Set<number>>(new Set());
function flip(id: number): void {
  const next = new Set(collapsed.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  collapsed.value = next;
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <section v-for="(column, ci) in columns" :key="column.status.id" v-stagger="ci" class="pt-card p-2">
      <button type="button" class="flex w-full items-center gap-2 rounded-2xl px-3 py-2.5 text-start" @click="flip(column.status.id)">
        <PtIcon
          :icon="ArrowDown01Icon"
          :size="16"
          class="text-muted transition"
          :class="collapsed.has(column.status.id) && '-rotate-90 rtl:rotate-90'"
        />
        <span class="size-2.5 rounded-full" :style="{ background: column.status.color }" />
        <h3 class="text-sm font-bold">{{ statusName(column.status) }}</h3>
        <span class="rounded-full bg-surface-3 px-2 py-0.5 text-xs font-bold text-muted">{{ column.tasks.length }}</span>
      </button>
      <div v-show="!collapsed.has(column.status.id)" class="divide-y divide-line/60">
        <TaskRow v-for="(task, i) in column.tasks" :key="task.id" v-stagger="i" :task="task" @open="$emit('open', $event)" @toggle="$emit('toggle', $event)" />
        <p v-if="!column.tasks.length" class="px-4 py-3 text-sm text-subtle">{{ $t("tasks.empty") }}</p>
      </div>
    </section>
  </div>
</template>
