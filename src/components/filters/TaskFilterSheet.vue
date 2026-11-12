<script setup lang="ts">
import { computed } from "vue";
import { Building03Icon, Calendar03Icon, Flag02Icon, Folder01Icon, Tag01Icon, UserMultipleIcon } from "@hugeicons/core-free-icons";
import PtButton from "@/components/ui/PtButton.vue";
import PtSheet from "@/components/ui/PtSheet.vue";
import DateRangeField from "./DateRangeField.vue";
import FilterChips from "./FilterChips.vue";
import FilterSection from "./FilterSection.vue";
import { countTaskFilters, type TaskFilters } from "@/domain/filters";
import { PRIORITIES, PRIORITY_STYLE } from "@/domain/tasks";
import { useI18n } from "vue-i18n";
import type { Entity, Label, Project, User } from "@/types/models";

/**
 * Task filters: start / due ranges, priority, labels, people and (where tasks
 * span projects) projects. Edits apply live; `results` is the match count.
 */
const props = defineProps<{
  filters: TaskFilters;
  users: Pick<User, "id" | "name" | "avatar_url">[];
  labels: Label[];
  projects?: Project[];
  /** Entity filter (global managers only). */
  entities?: Entity[];
  /** Hide the people filter where every task is the viewer's own. */
  hidePeople?: boolean;
  results: number;
}>();
const open = defineModel<boolean>({ required: true });
const emit = defineEmits<{ reset: [] }>();
const { t } = useI18n();

const f = props.filters;
const priorityOptions = computed(() => PRIORITIES.map((p) => ({ value: p, label: t(`priority.${p}`), color: PRIORITY_STYLE[p].dot })));
const labelOptions = computed(() => props.labels.map((l) => ({ value: l.id, label: l.name, color: l.color })));
const userOptions = computed(() => props.users.map((u) => ({ value: u.id, label: u.name, avatar: u.avatar_url ?? null })));
const entityOptions = computed(() => (props.entities ?? []).map((e) => ({ value: e.id, label: e.name, color: e.color })));
const projectOptions = computed(() => (props.projects ?? []).map((p) => ({ value: p.id, label: p.name, color: p.color })));
const active = computed(() => countTaskFilters(f));
</script>

<template>
  <PtSheet v-model="open" :title="$t('filters.title')" width="32rem">
    <div class="divide-y divide-line/70 px-5 md:px-6">
      <FilterSection :title="$t('filters.startDate')" :icon="Calendar03Icon" :active="!!(f.start.from || f.start.to)" @clear="f.start = { from: '', to: '' }">
        <DateRangeField v-model="f.start" />
      </FilterSection>
      <FilterSection :title="$t('filters.dueDate')" :icon="Calendar03Icon" :active="!!(f.due.from || f.due.to)" @clear="f.due = { from: '', to: '' }">
        <DateRangeField v-model="f.due" />
      </FilterSection>
      <FilterSection :title="$t('priority.label')" :icon="Flag02Icon" :active="f.priorities.length > 0" @clear="f.priorities = []">
        <FilterChips v-model="f.priorities" :options="priorityOptions" />
      </FilterSection>
      <FilterSection v-if="labelOptions.length" :title="$t('tasks.labels')" :icon="Tag01Icon" :active="f.labelIds.length > 0" @clear="f.labelIds = []">
        <FilterChips v-model="f.labelIds" :options="labelOptions" />
      </FilterSection>
      <FilterSection v-if="userOptions.length && !hidePeople" :title="$t('tasks.assignees')" :icon="UserMultipleIcon" :active="f.userIds.length > 0" @clear="f.userIds = []">
        <FilterChips v-model="f.userIds" :options="userOptions" />
      </FilterSection>
      <FilterSection v-if="entityOptions.length" :title="$t('entities.entity')" :icon="Building03Icon" :active="f.entityIds.length > 0" @clear="f.entityIds = []">
        <FilterChips v-model="f.entityIds" :options="entityOptions" />
      </FilterSection>
      <FilterSection v-if="projectOptions.length" :title="$t('nav.projects')" :icon="Folder01Icon" :active="f.projectIds.length > 0" @clear="f.projectIds = []">
        <FilterChips v-model="f.projectIds" :options="projectOptions" />
      </FilterSection>
    </div>
    <template #footer>
      <PtButton variant="ghost" :disabled="!active" @click="emit('reset')">{{ $t("filters.reset") }}</PtButton>
      <PtButton class="flex-1 md:flex-none" @click="open = false">{{ $t("filters.show", results) }}</PtButton>
    </template>
  </PtSheet>
</template>
