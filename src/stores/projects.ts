import { defineStore } from "pinia";
import { ref } from "vue";
import { projectsApi } from "@/api/endpoints";
import type { Project } from "@/types/models";

/** Projects (with their tables) for navigation and pickers. */
export const useProjectsStore = defineStore("projects", () => {
  const projects = ref<Project[]>([]);
  const loaded = ref(false);

  async function load(force = false): Promise<Project[]> {
    if (loaded.value && !force) return projects.value;
    projects.value = await projectsApi.list();
    loaded.value = true;
    return projects.value;
  }

  function upsert(project: Project): void {
    const index = projects.value.findIndex((p) => p.id === project.id);
    if (index === -1) projects.value.unshift(project);
    else projects.value[index] = { ...projects.value[index], ...project };
  }

  function remove(id: number): void {
    projects.value = projects.value.filter((p) => p.id !== id);
  }

  const boards = () => projects.value.flatMap((p) => (p.boards ?? []).map((b) => ({ ...b, project: p })));

  return { projects, loaded, load, upsert, remove, boards };
});
