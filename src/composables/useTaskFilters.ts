import { computed, onMounted, ref, type Ref } from "vue";
import { countTaskFilters, emptyTaskFilters, matchTask, uniqueUsers, useFilters } from "@/domain/filters";
import { useMetaStore } from "@/stores/meta";
import { useProjectsStore } from "@/stores/projects";
import { useEntitiesStore } from "@/stores/entities";
import type { Task } from "@/types/models";

/**
 * Filter state for task lists that span projects (my tasks, calendar):
 * people come from the loaded tasks, projects from the projects store.
 */
export function useTaskFilters(source: Ref<Task[]>) {
  const meta = useMetaStore();
  const projectsStore = useProjectsStore();
  const { filters, reset } = useFilters(emptyTaskFilters);
  const open = ref(false);

  const boardToProject = computed(() => new Map(projectsStore.boards().map((b) => [b.id, b.project_id])));
  const projectToEntity = computed(() => new Map(projectsStore.projects.map((p) => [p.id, p.entity_id ?? null])));
  const filtered = computed(() =>
    source.value.filter((task) =>
      matchTask(task, filters, (id) => boardToProject.value.get(id), (id) => projectToEntity.value.get(id)),
    ),
  );

  const entitiesStore = useEntitiesStore();
  onMounted(() => {
    void projectsStore.load().catch(() => undefined);
    void entitiesStore.load().catch(() => undefined);
  });

  return {
    filters,
    reset,
    open,
    filtered,
    count: computed(() => countTaskFilters(filters)),
    people: computed(() => uniqueUsers(source.value.map((task) => task.assignees))),
    labels: computed(() => meta.labels),
    projects: computed(() => projectsStore.projects),
  };
}
