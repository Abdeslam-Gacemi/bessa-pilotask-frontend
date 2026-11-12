<script setup lang="ts">
import { computed } from "vue";
import { Calendar03Icon, Clock01Icon, DragDropVerticalIcon, Flag02Icon, SortByDown01Icon, SortByUp01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import PtButton from "@/components/ui/PtButton.vue";
import PtIcon from "@/components/ui/PtIcon.vue";
import PtSheet from "@/components/ui/PtSheet.vue";
import PtSwitch from "@/components/ui/PtSwitch.vue";
import type { SortKey, TaskSort } from "@/domain/sort";
import type { Icon } from "@/plugins/icons";

/** Order picker: board order, priority, deadline or start date; plus ascending / descending. */
const props = withDefaults(defineProps<{ sort: TaskSort; manual?: boolean }>(), { manual: true });
const open = defineModel<boolean>({ required: true });
const emit = defineEmits<{ pick: [key: SortKey]; direction: [desc: boolean] }>();

const OPTIONS = computed<{ key: SortKey; icon: Icon }[]>(() => [
  ...(props.manual ? [{ key: "manual" as SortKey, icon: DragDropVerticalIcon }] : []),
  { key: "priority", icon: Flag02Icon },
  { key: "due_at", icon: Clock01Icon },
  { key: "start_at", icon: Calendar03Icon },
]);
</script>

<template>
  <PtSheet v-model="open" :title="$t('sort.title')" width="26rem">
    <div class="flex flex-col gap-1.5 pt-1" role="radiogroup" :aria-label="$t('sort.title')">
      <button
        v-for="option in OPTIONS"
        :key="option.key"
        type="button"
        role="radio"
        :aria-checked="sort.key === option.key"
        class="flex items-center gap-3 rounded-2xl border px-3.5 py-3 text-start transition active:scale-[0.99]"
        :class="sort.key === option.key ? 'border-ink bg-ink text-on-ink shadow-soft' : 'border-line bg-surface-2 hover:bg-surface-3'"
        @click="emit('pick', option.key)"
      >
        <PtIcon :icon="option.icon" :size="18" />
        <span class="min-w-0 flex-1">
          <span class="block text-sm font-semibold">{{ $t(`sort.keys.${option.key}`) }}</span>
          <span class="block text-xs opacity-70">{{ $t(`sort.hints.${option.key}`) }}</span>
        </span>
        <PtIcon v-if="sort.key === option.key" :icon="Tick02Icon" :size="18" />
      </button>
    </div>

    <div class="mt-4 flex items-center gap-3 rounded-2xl bg-surface-2 px-4 py-3" :class="sort.key === 'manual' && 'pointer-events-none opacity-50'">
      <PtIcon :icon="sort.desc ? SortByDown01Icon : SortByUp01Icon" :size="18" class="text-muted" />
      <PtSwitch
        class="flex-1"
        :model-value="sort.desc"
        :disabled="sort.key === 'manual'"
        :label="$t('sort.descending')"
        :hint="$t(`sort.directions.${sort.key}.${sort.desc ? 'desc' : 'asc'}`)"
        @update:model-value="(v) => emit('direction', v)"
      />
    </div>
    <p v-if="sort.key !== 'manual' && manual" class="mt-3 px-1 text-xs text-muted">{{ $t("sort.dragOff") }}</p>

    <template #footer>
      <PtButton class="flex-1 md:flex-none" @click="open = false">{{ $t("common.close") }}</PtButton>
    </template>
  </PtSheet>
</template>
