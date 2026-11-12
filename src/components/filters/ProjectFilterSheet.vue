<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { Archive02Icon, Building03Icon, Calendar03Icon, ChartLineData01Icon, UserMultipleIcon } from "@hugeicons/core-free-icons";
import PtButton from "@/components/ui/PtButton.vue";
import PtSheet from "@/components/ui/PtSheet.vue";
import PtSwitch from "@/components/ui/PtSwitch.vue";
import DateRangeField from "./DateRangeField.vue";
import FilterChips from "./FilterChips.vue";
import FilterSection from "./FilterSection.vue";
import { countProjectFilters, type ProjectFilters, type ProjectState } from "@/domain/filters";
import type { Entity, User } from "@/types/models";

/** Project filters: archived, start / end ranges, progress state and members. */
const props = defineProps<{
  filters: ProjectFilters;
  users: Pick<User, "id" | "name" | "avatar_url">[];
  /** Entity filter (global managers only). */
  entities?: Entity[];
  results: number;
}>();
const open = defineModel<boolean>({ required: true });
const emit = defineEmits<{ reset: [] }>();
const { t } = useI18n();

const f = props.filters;
const STATES: { value: ProjectState; color: string }[] = [
  { value: "notStarted", color: "#9AA0A4" },
  { value: "inProgress", color: "#53AEFF" },
  { value: "completed", color: "#22A06B" },
];
const stateOptions = computed(() => STATES.map((s) => ({ value: s.value, label: t(`filters.states.${s.value}`), color: s.color })));
const userOptions = computed(() => props.users.map((u) => ({ value: u.id, label: u.name, avatar: u.avatar_url ?? null })));
const entityOptions = computed(() => (props.entities ?? []).map((e) => ({ value: e.id, label: e.name, color: e.color })));
const active = computed(() => countProjectFilters(f));
</script>

<template>
  <PtSheet v-model="open" :title="$t('filters.title')" width="32rem">
    <div class="divide-y divide-line/70 px-5 md:px-6">
      <FilterSection :title="$t('projects.archived')" :icon="Archive02Icon">
        <PtSwitch v-model="f.archived" :label="$t('projects.showArchived')" />
      </FilterSection>
      <FilterSection :title="$t('filters.progress')" :icon="ChartLineData01Icon" :active="f.states.length > 0" @clear="f.states = []">
        <FilterChips v-model="f.states" :options="stateOptions" />
      </FilterSection>
      <FilterSection :title="$t('projects.startsOn')" :icon="Calendar03Icon" :active="!!(f.start.from || f.start.to)" @clear="f.start = { from: '', to: '' }">
        <DateRangeField v-model="f.start" />
      </FilterSection>
      <FilterSection :title="$t('projects.endsOn')" :icon="Calendar03Icon" :active="!!(f.end.from || f.end.to)" @clear="f.end = { from: '', to: '' }">
        <DateRangeField v-model="f.end" />
      </FilterSection>
      <FilterSection v-if="entityOptions.length" :title="$t('entities.entity')" :icon="Building03Icon" :active="f.entityIds.length > 0" @clear="f.entityIds = []">
        <FilterChips v-model="f.entityIds" :options="entityOptions" />
      </FilterSection>
      <FilterSection v-if="userOptions.length" :title="$t('projects.members')" :icon="UserMultipleIcon" :active="f.memberIds.length > 0" @clear="f.memberIds = []">
        <FilterChips v-model="f.memberIds" :options="userOptions" />
      </FilterSection>
    </div>
    <template #footer>
      <PtButton variant="ghost" :disabled="!active" @click="emit('reset')">{{ $t("filters.reset") }}</PtButton>
      <PtButton class="flex-1 md:flex-none" @click="open = false">{{ $t("filters.show", results) }}</PtButton>
    </template>
  </PtSheet>
</template>
