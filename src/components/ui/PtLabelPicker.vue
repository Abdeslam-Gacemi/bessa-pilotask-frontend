<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { Add01Icon, Cancel01Icon, Search01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import PtIcon from "./PtIcon.vue";
import PtPopover from "./PtPopover.vue";
import { labelsApi } from "@/api/endpoints";
import { useApiError } from "@/composables/useApiError";
import { useMetaStore } from "@/stores/meta";
import { useSessionStore } from "@/stores/session";
import type { Label } from "@/types/models";

/**
 * Multi-select of the global labels. Only the chosen labels are shown, as
 * removable chips; the rest live behind a searchable list, so the field stays
 * tidy however many labels exist. Managers can create a missing label from
 * the search box without leaving the form.
 */
defineProps<{ disabled?: boolean }>();
const model = defineModel<number[]>({ default: () => [] });
const meta = useMetaStore();
const session = useSessionStore();
const errors = useApiError();
const creating = ref(false);

const open = ref(false);
const search = ref("");
watch(open, (isOpen) => {
  if (!isOpen) search.value = "";
});

const selected = computed(() => new Set(model.value));
const chosen = computed(() => model.value.map((id) => meta.labels.find((l) => l.id === id)).filter((l): l is Label => Boolean(l)));

/** Case- and accent-insensitive, so "urgent" finds "Urgent" and "echeance" finds "Échéance". */
const fold = (text: string): string => text.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase();
const results = computed(() => {
  const query = fold(search.value.trim());
  return query ? meta.labels.filter((l) => fold(l.name).includes(query)) : meta.labels;
});

function toggle(id: number): void {
  model.value = selected.value.has(id) ? model.value.filter((x) => x !== id) : [...model.value, id];
}

/** The typed name, when it matches no label exactly and the person may create labels. */
const newName = computed(() => {
  const name = search.value.trim();
  if (!name || !session.canManage) return "";
  return meta.labels.some((l) => fold(l.name) === fold(name)) ? "" : name;
});

async function create(): Promise<void> {
  if (!newName.value || creating.value) return;
  creating.value = true;
  try {
    const palette = meta.palette();
    const color = palette.length ? palette[meta.labels.length % palette.length]! : "#64748b";
    const label = await labelsApi.create({ name: newName.value, color });
    meta.labels = [...meta.labels, label].sort((a, b) => a.name.localeCompare(b.name));
    model.value = [...model.value, label.id];
    search.value = "";
  } catch (error) {
    errors.report(error);
  } finally {
    creating.value = false;
  }
}

/** Enter picks the first match (or creates the label), so it's a few keystrokes and a return. */
function pickFirst(): void {
  const first = results.value[0];
  if (!first) return void create();
  toggle(first.id);
  search.value = "";
}
</script>

<template>
  <!-- The add button comes first, so it (and its popover) stays put while labels are added. -->
  <div class="flex flex-wrap items-center gap-2">
    <PtPopover v-if="!disabled" v-model="open" width="18rem">
      <template #trigger="{ toggle: toggleOpen }">
        <button type="button" class="pt-chip h-9 border-dashed text-muted hover:text-fg" @click="toggleOpen">
          <PtIcon :icon="Add01Icon" :size="16" />
          {{ $t("common.add") }}
        </button>
      </template>
      <div class="relative mb-1.5">
        <PtIcon :icon="Search01Icon" :size="16" class="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-subtle" />
        <input v-model="search" class="pt-field py-2 ps-9" :placeholder="$t('common.search')" autofocus @keydown.enter.prevent="pickFirst" />
      </div>
      <div class="max-h-64 overflow-y-auto">
        <button
          v-for="label in results"
          :key="label.id"
          type="button"
          class="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-start transition hover:bg-surface-3"
          @click="toggle(label.id)"
        >
          <span class="size-2.5 shrink-0 rounded-full" :style="{ background: label.color }" />
          <span class="min-w-0 flex-1 truncate text-sm font-semibold">{{ label.name }}</span>
          <PtIcon v-if="selected.has(label.id)" :icon="Tick02Icon" :size="18" class="text-primary" />
        </button>
        <button
          v-if="newName"
          type="button"
          class="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-start text-sm font-semibold text-primary transition hover:bg-surface-3"
          :disabled="creating"
          @click="create"
        >
          <PtIcon :icon="Add01Icon" :size="16" />
          <span class="min-w-0 flex-1 truncate">{{ $t("labels.createNamed", { name: newName }) }}</span>
        </button>
        <p v-else-if="!results.length" class="px-2 py-4 text-center text-sm text-muted">
          {{ meta.labels.length ? $t("common.noResults") : $t("labels.empty") }}
        </p>
      </div>
    </PtPopover>
    <button
      v-for="(label, i) in chosen"
      :key="label.id"
      v-stagger="i"
      type="button"
      class="pt-chip group h-9"
      :style="{ background: label.color, borderColor: label.color, color: '#fff' }"
      :disabled="disabled"
      :title="$t('common.delete')"
      @click="toggle(label.id)"
    >
      {{ label.name }}
      <PtIcon v-if="!disabled" :icon="Cancel01Icon" :size="14" class="opacity-70 transition group-hover:opacity-100" />
    </button>
  </div>
</template>
