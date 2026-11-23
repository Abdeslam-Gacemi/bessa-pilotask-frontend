<script setup lang="ts">
import { computed, ref, watch } from "vue";
import PtProgress from "@/components/ui/PtProgress.vue";
import { tasksApi } from "@/api/endpoints";
import { useApiError } from "@/composables/useApiError";
import type { Task } from "@/types/models";

/** Optional self-reported progress: a slider, quick steps, and live save. */
const props = defineProps<{ task: Task; editable: boolean }>();
const emit = defineEmits<{ updated: [task: Task] }>();
const errors = useApiError();

const done = computed(() => !!props.task.completed_at);
const value = ref(props.task.progress ?? 0);
const tracked = ref(props.task.progress != null);
watch(
  () => props.task.progress,
  (p) => {
    value.value = p ?? 0;
    tracked.value = p != null;
  },
);

const shown = computed(() => (done.value ? 100 : value.value));
const accent = computed(() => (shown.value >= 100 ? "#22A06B" : "#53AEFF"));
const saving = ref(false);

// Update the card right away (optimistic), then save in the background. The
// card never waits on the server, so the value always lands even if the sheet
// closes mid-save.
async function persist(next: number | null): Promise<void> {
  emit("updated", { ...props.task, progress: next });
  saving.value = true;
  try {
    emit("updated", await tasksApi.setProgress(props.task.id, next));
  } catch (error) {
    errors.report(error);
  } finally {
    saving.value = false;
  }
}

// Dragging only moves the local value (smooth); the save happens on release.
function onSlide(v: number): void {
  value.value = v;
  tracked.value = true;
}
function commit(): void {
  void persist(value.value);
}
function setValue(v: number): void {
  value.value = v;
  tracked.value = true;
  void persist(v);
}
</script>

<template>
  <!-- Nothing to show when not tracked and we can't edit. -->
  <div v-if="done || tracked || editable" class="flex w-full flex-col gap-2" :aria-busy="saving">
    <!-- Offer to start tracking (only when editable and not yet set). -->
    <button
      v-if="!done && !tracked && editable"
      type="button"
      class="self-start rounded-full bg-surface-2 px-3 py-1.5 text-xs font-semibold text-muted transition hover:bg-surface-3 hover:text-fg"
      @click="setValue(0)"
    >
      {{ $t("tasks.progressAdd") }}
    </button>

    <template v-else>
      <input
        v-if="editable && !done"
        type="range"
        min="0"
        max="100"
        step="5"
        :value="value"
        :aria-label="$t('tasks.progress')"
        class="pt-range h-2 w-full cursor-pointer appearance-none rounded-full"
        :style="{ color: accent, accentColor: accent, background: `linear-gradient(90deg, ${accent} ${value}%, var(--pt-surface-3) ${value}%)` }"
        @input="onSlide(+($event.target as HTMLInputElement).value)"
        @change="commit"
      />
      <PtProgress v-else :value="shown" :color="accent" :height="8" />

      <div class="flex items-center justify-between gap-3">
        <span class="text-2xl font-bold tabular-nums" :style="{ color: accent }">{{ shown }}%</span>
        <span v-if="done" class="text-xs font-semibold text-success">{{ $t("tasks.completed") }}</span>
        <button
          v-else-if="editable"
          type="button"
          class="shrink-0 rounded-full bg-surface-2 px-3 py-1.5 text-xs font-semibold text-subtle transition hover:bg-danger-soft hover:text-danger"
          @click="(tracked = false), persist(null)"
        >
          {{ $t("tasks.progressClear") }}
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
/* A clean track + thumb for the range, themed to the fill colour. */
.pt-range::-webkit-slider-thumb {
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 9999px;
  background: #fff;
  border: 3px solid currentColor;
  box-shadow: 0 1px 3px rgb(0 0 0 / 0.25);
}
.pt-range::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 9999px;
  background: #fff;
  border: 3px solid currentColor;
}
</style>
