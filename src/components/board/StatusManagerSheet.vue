<script setup lang="ts">
import { statusName } from "@/domain/statusName";
import { computed, reactive, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { VueDraggable } from "vue-draggable-plus";
import { Add01Icon, Delete02Icon, DragDropVerticalIcon } from "@hugeicons/core-free-icons";
import PtButton from "@/components/ui/PtButton.vue";
import PtColorPicker from "@/components/ui/PtColorPicker.vue";
import PtIcon from "@/components/ui/PtIcon.vue";
import PtIconButton from "@/components/ui/PtIconButton.vue";
import PtSheet from "@/components/ui/PtSheet.vue";
import PtField from "@/components/ui/PtField.vue";
import { boardsApi } from "@/api/endpoints";
import { useApiError } from "@/composables/useApiError";
import { useConfirm } from "@/composables/useConfirm";
import { useMetaStore } from "@/stores/meta";
import type { Board, Status } from "@/types/models";

/**
 * Per-table statuses: rename, recolour, reorder by drag, add free custom ones.
 * The four defaults carry the global structure (todo, in progress, done,
 * canceled) and cannot be removed; custom statuses are independent.
 */
const props = defineProps<{ board: Board }>();
const open = defineModel<boolean>({ required: true });
const emit = defineEmits<{ changed: [statuses: Status[]] }>();

const { t } = useI18n();
const meta = useMetaStore();
const errors = useApiError();
const { confirm, confirmAction } = useConfirm();

const statuses = ref<Status[]>([]);
const draft = reactive({ name: "", color: "#8B6CF0" as string | null });

watch(open, (value) => {
  if (value) statuses.value = [...(props.board.statuses ?? [])];
});

function publish(): void {
  emit("changed", [...statuses.value]);
}

async function reorder(): Promise<void> {
  try {
    statuses.value = await boardsApi.reorderStatuses(props.board.id, statuses.value.map((s) => s.id));
    publish();
  } catch (error) {
    errors.report(error);
  }
}

async function save(status: Status, patch: Partial<Pick<Status, "name" | "color">>, field?: HTMLInputElement | HTMLSelectElement): Promise<void> {
  const changed = Object.entries(patch).some(([key, value]) => status[key as keyof Status] !== value && value !== "");
  if (!changed) {
    if (field) field.value = String(status[field instanceof HTMLSelectElement ? "color" : "name"]);
    return;
  }
  if (!(await confirmAction("update", "status", status.name))) {
    // Cancelled: put the field back to the saved value.
    if (field) field.value = String(status[field instanceof HTMLSelectElement ? "color" : "name"]);
    return;
  }
  try {
    Object.assign(status, await boardsApi.updateStatus(status.id, patch));
    publish();
  } catch (error) {
    errors.report(error);
  }
}

async function add(): Promise<void> {
  if (!draft.name.trim()) return;
  if (!(await confirmAction("create", "status", draft.name.trim()))) return;
  try {
    statuses.value.push(await boardsApi.addStatus(props.board.id, { name: draft.name.trim(), color: draft.color ?? undefined }));
    draft.name = "";
    publish();
  } catch (error) {
    errors.report(error);
  }
}

// Removing a status that holds tasks: pick where they go first (the server logs each move and tells their people).
const removing = ref<Status | null>(null);
const moveTo = ref<number | null>(null);
const removingBusy = ref(false);
const removingOpen = computed({
  get: () => removing.value !== null,
  set: (value) => {
    if (!value && !removingBusy.value) removing.value = null;
  },
});
const targets = computed(() => statuses.value.filter((s) => s.id !== removing.value?.id));

function forget(status: Status, target?: number): void {
  statuses.value = statuses.value
    .filter((s) => s.id !== status.id)
    .map((s) => (s.id === target ? { ...s, tasks_count: (s.tasks_count ?? 0) + (status.tasks_count ?? 0) } : s));
  publish();
}

async function remove(status: Status): Promise<void> {
  if (status.tasks_count) {
    removing.value = status;
    moveTo.value = statuses.value.find((s) => s.category === "todo")?.id ?? targets.value[0]?.id ?? null;
    return;
  }
  try {
    const run = () => boardsApi.removeStatus(status.id);
    if (!(await confirm({ title: t("boards.deleteStatusConfirm", { name: status.name }), danger: true, confirmLabel: t("common.delete"), run }))) return;
    forget(status);
  } catch (error) {
    errors.report(error);
  }
}

async function confirmMove(): Promise<void> {
  const status = removing.value;
  if (!status || !moveTo.value) return;
  removingBusy.value = true;
  try {
    await boardsApi.removeStatus(status.id, moveTo.value);
    forget(status, moveTo.value);
    removingBusy.value = false;
    removing.value = null;
  } catch (error) {
    errors.report(error);
  } finally {
    removingBusy.value = false;
  }
}
</script>

<template>
  <PtSheet v-model="open" :title="$t('boards.statuses')" width="38rem">
    <p class="mb-4 text-sm text-muted">{{ $t("boards.statusesHint") }}</p>
    <VueDraggable v-model="statuses" handle=".pt-handle" :animation="160" class="flex flex-col gap-2" @end="reorder">
      <div v-for="(status, index) in statuses" :key="status.id" v-stagger="index" class="flex items-center gap-2 rounded-2xl border border-line bg-surface-2 p-2">
        <button type="button" class="pt-handle grid size-8 cursor-grab place-items-center text-subtle active:cursor-grabbing" :aria-label="$t('boards.statusesHint')">
          <PtIcon :icon="DragDropVerticalIcon" :size="18" />
        </button>
        <label class="relative size-7 shrink-0 overflow-hidden rounded-full" :style="{ background: status.color }">
          <select
            class="absolute inset-0 cursor-pointer opacity-0"
            :value="status.color"
            :aria-label="$t('projects.color')"
            @change="save(status, { color: ($event.target as HTMLSelectElement).value }, $event.target as HTMLSelectElement)"
          >
            <option v-for="(hex, name) in meta.meta?.colors" :key="hex" :value="hex">{{ name }}</option>
          </select>
        </label>
        <input
          :value="statusName(status)"
          class="min-w-0 flex-1 rounded-xl bg-transparent px-2 py-1.5 text-sm font-semibold outline-none focus:bg-surface"
          maxlength="60"
          @change="save(status, { name: ($event.target as HTMLInputElement).value.trim() }, $event.target as HTMLInputElement)"
        />
        <span
          v-if="status.tasks_count"
          class="rounded-full bg-surface px-2 py-0.5 text-[11px] font-bold text-muted tabular-nums ring-1 ring-line"
          :title="$t('boards.tasksInStatus', status.tasks_count)"
        >
          {{ status.tasks_count }}
        </span>
        <span v-if="status.is_default" class="rounded-full bg-surface px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap text-muted ring-1 ring-line">
          {{ $t("boards.default") }}
        </span>
        <PtIconButton v-else :icon="Delete02Icon" :size="16" :label="$t('common.delete')" class="text-danger" @click="remove(status)" />
      </div>
    </VueDraggable>

    <form class="mt-5 flex flex-col gap-3 rounded-2xl border border-dashed border-line p-3" @submit.prevent="add">
      <div class="flex gap-2">
        <input v-model="draft.name" class="pt-field flex-1 py-2" :placeholder="$t('boards.statusName')" maxlength="60" />
        <PtButton type="submit" size="sm" class="h-auto" :icon="Add01Icon" :disabled="!draft.name.trim()">{{ $t("boards.addStatus") }}</PtButton>
      </div>
      <PtColorPicker v-model="draft.color" />
    </form>
  </PtSheet>

  <PtSheet v-model="removingOpen" :title="$t('boards.deleteStatusConfirm', { name: removing?.name ?? '' })" width="28rem">
    <div class="flex flex-col gap-4 pt-1">
      <p class="text-sm text-muted">{{ $t("boards.moveTasksHint", { n: removing?.tasks_count ?? 0, name: removing?.name ?? "" }) }}</p>
      <PtField :label="$t('boards.moveTasksTo')">
        <select v-model="moveTo" class="pt-field">
          <option v-for="target in targets" :key="target.id" :value="target.id">{{ target.name }}</option>
        </select>
      </PtField>
    </div>
    <template #footer>
      <PtButton variant="ghost" :disabled="removingBusy" @click="removing = null">{{ $t("common.cancel") }}</PtButton>
      <PtButton variant="danger" :icon="Delete02Icon" :loading="removingBusy" :disabled="!moveTo" @click="confirmMove">
        {{ $t("boards.moveAndDelete") }}
      </PtButton>
    </template>
  </PtSheet>
</template>
