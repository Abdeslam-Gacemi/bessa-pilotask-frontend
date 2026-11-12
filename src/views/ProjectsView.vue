<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { Add01Icon, Folder01Icon } from "@hugeicons/core-free-icons";
import PtAvatarStack from "@/components/ui/PtAvatarStack.vue";
import PtButton from "@/components/ui/PtButton.vue";
import PtIconButton from "@/components/ui/PtIconButton.vue";
import PtEmpty from "@/components/ui/PtEmpty.vue";
import PtIcon from "@/components/ui/PtIcon.vue";
import PtProgress from "@/components/ui/PtProgress.vue";
import PtSkeleton from "@/components/ui/PtSkeleton.vue";
import FilterButton from "@/components/filters/FilterButton.vue";
import ProjectFilterSheet from "@/components/filters/ProjectFilterSheet.vue";
import { countProjectFilters, emptyProjectFilters, matchProject, uniqueUsers, useFilters } from "@/domain/filters";
import ProjectFormSheet from "@/components/projects/ProjectFormSheet.vue";
import { projectsApi } from "@/api/endpoints";
import { useRequest } from "@/composables/useRequest";
import { useAccess } from "@/composables/useAccess";
import { tableIcon } from "@/plugins/icons";
import { useProjectsStore } from "@/stores/projects";
import { useSessionStore } from "@/stores/session";
import type { Project } from "@/types/models";

const session = useSessionStore();
const store = useProjectsStore();
const projects = ref<Project[]>([]);
const request = useRequest();
const loading = request.loading;
const { filters, reset } = useFilters(emptyProjectFilters);
const archived = computed(() => filters.archived);
const showFilters = ref(false);
const filterCount = computed(() => countProjectFilters(filters));
const visible = computed(() => projects.value.filter((p) => matchProject(p, filters)));
const access = useAccess();
// Members only mean something to managers; simple users reach projects through their tasks.
const members = computed(() => (access.canManage.value ? uniqueUsers(projects.value.map((p) => p.members)) : []));
const creating = ref(false);

async function load(): Promise<void> {
  const result = await request.run((signal) => projectsApi.list(archived.value, { signal }));
  if (result) projects.value = result;
}

function onSaved(project: Project): void {
  store.upsert({ ...project, boards: [] });
  void load();
}

const progress = (p: Project) => (p.tasks_count ? Math.round(((p.done_count ?? 0) / p.tasks_count) * 100) : 0);

watch(archived, load);
onMounted(() => {
  void load();
  void access.entities.load().catch(() => undefined);
});
</script>

<template>
  <div class="flex flex-col gap-6">
    <header class="flex flex-wrap items-center gap-3">
      <div class="flex-1">
        <h1 class="text-3xl font-bold">{{ $t("projects.title") }}</h1>
      </div>
      <FilterButton class="h-10" :count="filterCount" @click="showFilters = true" />
      <PtIconButton v-if="session.canManage" :icon="Add01Icon" variant="ink" :label="$t('projects.new')" @click="creating = true" />
    </header>

    <div v-if="loading" class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"><PtSkeleton v-for="i in 6" :key="i" class="h-48" /></div>
    <PtEmpty v-else-if="!projects.length" :icon="Folder01Icon" :title="$t('projects.empty')" :hint="$t('projects.emptyHint')">
      <PtButton v-if="session.canManage" :icon="Add01Icon" @click="creating = true">{{ $t("projects.new") }}</PtButton>
    </PtEmpty>
    <PtEmpty v-else-if="!visible.length" :icon="Folder01Icon" :title="$t('filters.empty')">
      <PtButton variant="secondary" @click="reset">{{ $t("filters.clearAll") }}</PtButton>
    </PtEmpty>
    <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <RouterLink
        v-for="(project, i) in visible"
        :key="project.id"
        v-stagger="i"
        :to="`/projects/${project.id}`"
        class="pt-card group flex flex-col gap-4 p-5 transition hover:-translate-y-0.5 hover:shadow-float"
        :class="project.archived_at && 'opacity-70'"
      >
        <div class="flex items-start gap-3">
          <span class="grid size-12 shrink-0 place-items-center rounded-2xl text-white shadow-soft" :style="{ background: project.color ?? 'var(--pt-ink)' }">
            <PtIcon :icon="tableIcon(project.icon)" :size="24" />
          </span>
          <div class="min-w-0 flex-1">
            <h2 class="truncate text-lg font-bold">{{ project.name }}</h2>
            <p class="line-clamp-2 text-sm text-muted">{{ project.description || $t("projects.tables", project.boards?.length ?? 0) }}</p>
          </div>
        </div>
        <div class="flex flex-wrap gap-1.5">
          <span v-for="board in project.boards?.slice(0, 4)" :key="board.id" class="pt-chip py-1">
            <span class="size-1.5 rounded-full" :style="{ background: board.color ?? 'var(--pt-subtle)' }" />
            {{ board.name }}
          </span>
        </div>
        <div class="mt-auto">
          <div class="mb-1.5 flex justify-between text-xs font-semibold">
            <span class="text-muted">{{ project.done_count ?? 0 }} / {{ project.tasks_count ?? 0 }}</span>
            <span class="tabular-nums">{{ progress(project) }}%</span>
          </div>
          <PtProgress :value="progress(project)" :color="project.color ?? undefined" />
        </div>
        <PtAvatarStack :users="project.members ?? []" :max="5" />
      </RouterLink>
    </div>

    <ProjectFormSheet v-model="creating" @saved="onSaved" />
    <ProjectFilterSheet
      v-model="showFilters"
      :filters="filters"
      :users="members"
      :entities="access.filtersByEntity.value ? access.entities.entities : []"
      :results="visible.length"
      @reset="reset"
    />
  </div>
</template>
