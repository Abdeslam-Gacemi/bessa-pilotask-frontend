<script setup lang="ts">
import { computed } from "vue";
import PtAvatar from "@/components/ui/PtAvatar.vue";
import type { User } from "@/types/models";

/**
 * Open work per person as one bar each: late part in red, due within 48 h in
 * amber, the rest neutral. Bars share one scale, so the most loaded person
 * reads at a glance. Used on the managers' home and in analytics.
 */
export interface LoadRow {
  user: Pick<User, "id" | "name" | "avatar_url"> | null;
  open: number;
  overdue: number;
  due_soon?: number;
}

const props = withDefaults(defineProps<{ rows: LoadRow[]; limit?: number }>(), { limit: 8 });
defineEmits<{ pick: [row: LoadRow] }>();

const sorted = computed(() =>
  [...props.rows]
    .filter((r) => r.user && r.open > 0)
    .sort((a, b) => b.overdue - a.overdue || b.open - a.open)
    .slice(0, props.limit),
);
const max = computed(() => Math.max(1, ...sorted.value.map((r) => r.open)));
</script>

<template>
  <ul class="flex flex-col gap-3.5">
    <li v-for="(row, i) in sorted" :key="row.user!.id" v-stagger="i">
      <button type="button" class="flex w-full items-center gap-3 text-start" @click="$emit('pick', row)">
        <PtAvatar :name="row.user!.name" :src="row.user!.avatar_url" :size="34" />
        <span class="min-w-0 flex-1">
          <span class="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
            <span class="truncate font-semibold">{{ row.user!.name }}</span>
            <span class="shrink-0 text-xs text-muted tabular-nums">
              {{ $t("manager.open", { n: row.open }) }}
              <b v-if="row.overdue" class="text-danger"> · {{ $t("manager.late", { n: row.overdue }) }}</b>
            </span>
          </span>
          <span class="block h-2 rounded-full bg-surface-3">
            <span class="flex h-full overflow-hidden rounded-full transition-[width] duration-500" :style="{ width: `${Math.max(8, (row.open / max) * 100)}%` }">
              <span class="bg-danger" :style="{ width: `${(row.overdue / row.open) * 100}%` }" />
              <span class="bg-warning" :style="{ width: `${((row.due_soon ?? 0) / row.open) * 100}%` }" />
              <span class="flex-1 bg-primary/45" />
            </span>
          </span>
        </span>
      </button>
    </li>
  </ul>
  <p v-if="!sorted.length" class="py-4 text-center text-sm text-muted">—</p>
  <p v-else class="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted">
    <span class="inline-flex items-center gap-1.5"><span class="size-2 rounded-full bg-danger" />{{ $t("manager.legend.late") }}</span>
    <span class="inline-flex items-center gap-1.5"><span class="size-2 rounded-full bg-warning" />{{ $t("manager.legend.soon") }}</span>
    <span class="inline-flex items-center gap-1.5"><span class="size-2 rounded-full bg-primary/45" />{{ $t("manager.legend.rest") }}</span>
  </p>
</template>
