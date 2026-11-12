import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { authApi, type CaptchaProof } from "@/api/endpoints";
import { onUnauthorized } from "@/api/client";
import { tokenStore } from "@/services/tokenStore";
import { cancelAllRequests } from "@/services/requests";
import type { User } from "@/types/models";

/** Who is signed in, and what their role lets them do. */
export const useSessionStore = defineStore("session", () => {
  const user = ref<User | null>(null);
  const ready = ref(false);

  const isAuthenticated = computed(() => user.value !== null);
  const isSuperAdmin = computed(() => user.value?.role === "super_admin");
  const canManage = computed(() => user.value?.role === "super_admin" || user.value?.role === "admin");
  const isViewer = computed(() => user.value?.role === "viewer");
  /** Managers and viewers see whole projects and the analytics, not only their own tasks. */
  const seesWorkspace = computed(() => canManage.value || isViewer.value);
  /** No entity = all entities. */
  const isGlobal = computed(() => isSuperAdmin.value || !(user.value?.entity_ids?.length ?? 0));
  /** Projects this simple user manages (a role inside those projects only). */
  const managedProjectIds = computed(() => user.value?.managed_project_ids ?? []);
  const isProjectManager = computed(() => managedProjectIds.value.length > 0);
  /** Gets the overview (managers' home, analytics): managers, viewers, project managers. */
  const hasOverview = computed(() => seesWorkspace.value || isProjectManager.value);
  /** Can create tasks / tables somewhere. */
  const canCreate = computed(() => canManage.value || isProjectManager.value);
  const managesProject = (projectId: number | null | undefined) =>
    canManage.value || (projectId != null && managedProjectIds.value.includes(projectId));

  /** Restores a saved session at start-up. */
  async function init(): Promise<void> {
    if (ready.value) return;
    try {
      if (await tokenStore.load()) user.value = await authApi.me();
    } catch {
      await tokenStore.set(null);
    } finally {
      ready.value = true;
    }
  }

  async function login(email: string, password: string, device = "web", proof: CaptchaProof = {}): Promise<User> {
    const result = await authApi.login(email, password, proof, device);
    await tokenStore.set(result.token);
    user.value = result.user;
    return result.user;
  }

  async function logout(): Promise<void> {
    try {
      await authApi.logout();
    } catch {
      /* the token may already be gone */
    }
    await clear();
  }

  async function clear(): Promise<void> {
    cancelAllRequests();
    await tokenStore.set(null);
    user.value = null;
  }

  function setUser(next: User): void {
    user.value = next;
  }

  onUnauthorized(() => {
    if (user.value) void clear().then(() => window.location.assign("/login"));
  });

  return { user, ready, isAuthenticated, isSuperAdmin, canManage, isViewer, seesWorkspace, isGlobal, managedProjectIds, isProjectManager, hasOverview, canCreate, managesProject, init, login, logout, setUser };
});
