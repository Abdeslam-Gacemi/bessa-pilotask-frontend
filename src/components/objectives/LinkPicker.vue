<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { refDebounced } from "@vueuse/core";
import { Add01Icon, CheckListIcon, Folder01Icon, LayoutTable01Icon, Search01Icon, Tag01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import PtIcon from "@/components/ui/PtIcon.vue";
import { tasksApi } from "@/api/endpoints";
import { useRequest } from "@/composables/useRequest";
import { useMetaStore } from "@/stores/meta";
import { useProjectsStore } from "@/stores/projects";
import type { Icon } from "@/plugins/icons";
import type { KeyResultLink, KeyResultLinkType } from "@/types/models";

/**
 * Work a key result counts, mixed freely: whole projects, tables, labels
 * (every task carrying it, new ones included) or single tasks from anywhere.
 */
const model = defineModel<KeyResultLink[]>({ default: () => [] });
const { t } = useI18n();
const projects = useProjectsStore();
const meta = useMetaStore();
const request = useRequest();

type Option =Required<Pick<KeyResultLink, "type" | "id">> & { name: string; color: string | null; context: string | null };

const ICONS: Record<KeyResultLinkType, Icon> = { project: Folder01Icon, board: LayoutTable01Icon, label: Tag01Icon, task: CheckListIcon };
const open = ref(false);
const tab = ref<KeyResultLinkType>("project");
const search = ref("");
const debounced = refDebounced(search, 250);
const taskResults = ref<Option[]>([]);

const tabs = computed(() => (["project", "board", "label", "task"] as const).map((v) => ({ value: v, label: t(`objectives.links.${v}`), icon: ICONS[v] })));

const options = computed<Option[]>(() => {
  const q = search.value.trim().toLowerCase();
  const match = (o: Option) => !q || o.name.toLowerCase().includes(q) || (o.context ?? "").toLowerCase().includes(q);
  switch (tab.value) {
    case "project":
      return projects.projects.map((p) => ({ type: "project" as const, id: p.id, name: p.name, color: p.color, context: null })).filter(match);
    case "board":
      return projects.boards().map((b) => ({ type: "board" as const, id: b.id, name: b.name, color: b.color ?? null, context: b.project.name })).filter(match);
    case "label":
      return meta.labels.map((l) => ({ type: "label" as const, id: l.id, name: l.name, color: l.color, context: null })).filter(match);
    default:
      return taskResults.value;
  }
});

watch([open, tab, debounced], async ([isOpen, kind]) => {
  if (!isOpen || kind !== "task") return;
  const found = await request.run((signal) => tasksApi.list({ search: debounced.value || undefined }, { signal })).catch(() => undefined);
  if (found) taskResults.value = found.slice(0, 50).map((task) => ({ type: "task", id: task.id, name: task.title, color: null, context: task.board?.name ?? null }));
});

const key = (l: Pick<KeyResultLink, "type" | "id">) => `${l.type}:${l.id}`;
const selected = computed(() => new Set(model.value.map(key)));

function toggle(option: Option): void {
  model.value = selected.value.has(key(option)) ? model.value.filter((l) => key(l) !== key(option)) : [...model.value, option];
}

void projects.load();
</script>

<template>
  <!-- Inline panel (not a popover): it lives in a sheet and grows with it, nothing to clip or teleport. -->
  <div class="flex flex-col gap-2">
    <div class="flex flex-wrap items-center gap-2">
      <button type="button" class="pt-chip h-9 border-dashed text-muted hover:text-fg" :aria-expanded="open" @click="open = !open">
        <PtIcon :icon="Add01Icon" :size="16" class="transition" :class="open && 'rotate-45'" />
        {{ $t("objectives.links.add") }}
      </button>
      <button
        v-for="link in model"
        :key="key(link)"
        type="button"
        class="pt-chip h-9 max-w-64 hover:border-danger/40"
        :title="$t('common.delete')"
        @click="model = model.filter((l) => key(l) !== key(link))"
      >
        <PtIcon :icon="ICONS[link.type]" :size="15" :style="{ color: link.color ?? undefined }" />
        <span class="truncate">{{ link.name ?? "—" }}</span>
        <span v-if="link.context" class="truncate font-normal text-muted">· {{ link.context }}</span>
      </button>
    </div>
    <div v-if="open" class="rounded-2xl border border-line bg-surface p-1.5">
      <div class="mb-2 grid grid-cols-4 gap-1 rounded-xl bg-surface-2 p-1" role="tablist">
        <button
          v-for="option in tabs"
          :key="option.value"
          type="button"
          role="tab"
          :aria-selected="tab === option.value"
          class="flex flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-[11px] font-semibold transition"
          :class="tab === option.value ? 'bg-ink text-on-ink shadow-soft' : 'text-muted hover:text-fg'"
          @click="tab = option.value"
        >
          <PtIcon :icon="option.icon" :size="15" />
          {{ option.label }}
        </button>
      </div>
      <div class="relative mb-1.5">
        <PtIcon :icon="Search01Icon" :size="16" class="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-subtle" />
        <input v-model="search" class="pt-field py-2 ps-9" :placeholder="$t('common.search')" />
      </div>
      <div class="max-h-64 overflow-y-auto" :aria-busy="request.loading.value">
        <button
          v-for="option in options"
          :key="key(option)"
          type="button"
          class="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-start transition hover:bg-surface-3"
          @click="toggle(option)"
        >
          <span class="grid size-7 shrink-0 place-items-center rounded-lg text-white" :style="{ background: option.color ?? 'var(--pt-subtle)' }">
            <PtIcon :icon="ICONS[option.type]" :size="14" />
          </span>
          <span class="min-w-0 flex-1">
            <span class="block truncate text-sm font-semibold">{{ option.name }}</span>
            <span v-if="option.context" class="block truncate text-xs text-muted">{{ option.context }}</span>
          </span>
          <PtIcon v-if="selected.has(key(option))" :icon="Tick02Icon" :size="18" class="text-primary" />
        </button>
        <p v-if="!options.length" class="px-2 py-4 text-center text-sm text-muted">{{ $t("common.noResults") }}</p>
      </div>
    </div>
  </div>
</template>
