import { defineStore } from "pinia";
import { ref } from "vue";
import { projectsApi } from "@/api/endpoints";
import type { Project } from "@/types/models";

/** Projects (with their tables) for navigation and pickers. */
export const useProjectsStore = defineStore("projects", () => {
  const projects = ref<Project[]>([]);
  const loaded = ref(false);
  // Latest-wins: overlapping loads can resolve out of order, so an older
  // response must never overwrite a newer one (stale list until refresh).
  let token = 0;

  async function load(force = false): Promise<Project[]> {
    if (loaded.value && !force) return projects.value;
    const mine = ++token;
    const result = await projectsApi.list();
    if (mine === token) {
      projects.value = result;
      loaded.value = true;
    }
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

  /** Drop everything (called on sign-out, so the next person starts clean). */
  function reset(): void {
    projects.value = [];
    loaded.value = false;
  }

  return { projects, loaded, load, upsert, remove, boards, reset };
});
