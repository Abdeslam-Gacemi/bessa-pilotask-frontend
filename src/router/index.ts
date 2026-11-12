import { createRouter, createWebHistory, type RouteRecordRaw } from "vue-router";
import { useSessionStore } from "@/stores/session";
import { closeAllOverlays } from "@/composables/useOverlay";

declare module "vue-router" {
  interface RouteMeta {
    guest?: boolean;
    manager?: boolean;
    superAdmin?: boolean;
    title?: string;
  }
}

const routes: RouteRecordRaw[] = [
  { path: "/login", name: "login", component: () => import("@/views/LoginView.vue"), meta: { guest: true } },
  {
    path: "/",
    component: () => import("@/layouts/AppShell.vue"),
    children: [
      { path: "", name: "home", component: () => import("@/views/DashboardView.vue"), meta: { title: "nav.home" } },
      { path: "projects", name: "projects", component: () => import("@/views/ProjectsView.vue"), meta: { title: "nav.projects" } },
      { path: "projects/:id(\\d+)", name: "project", component: () => import("@/views/ProjectView.vue"), props: (r) => ({ id: Number(r.params.id) }) },
      { path: "boards/:id(\\d+)", name: "board", component: () => import("@/views/BoardView.vue"), props: (r) => ({ id: Number(r.params.id) }) },
      { path: "tasks/:id(\\d+)", name: "task", component: () => import("@/views/TaskView.vue"), props: (r) => ({ id: Number(r.params.id) }) },
      { path: "my-tasks", name: "my-tasks", component: () => import("@/views/MyTasksView.vue"), meta: { title: "nav.myTasks" } },
      { path: "calendar", name: "calendar", component: () => import("@/views/CalendarView.vue"), meta: { title: "nav.calendar" } },
      { path: "analytics", name: "analytics", component: () => import("@/views/AnalyticsView.vue"), meta: { workspace: true, title: "nav.analytics" } },
      { path: "activity", name: "activity", component: () => import("@/views/ActivityView.vue"), meta: { superAdmin: true, title: "nav.activity" } },
      { path: "users", name: "users", component: () => import("@/views/UsersView.vue"), meta: { manager: true, title: "nav.users" } },
      { path: "entities", name: "entities", component: () => import("@/views/EntitiesView.vue"), meta: { superAdmin: true, title: "nav.entities" } },
      { path: "labels", name: "labels", component: () => import("@/views/LabelsView.vue"), meta: { manager: true, title: "nav.labels" } },
      { path: "notifications", name: "notifications", component: () => import("@/views/NotificationsView.vue"), meta: { title: "nav.notifications" } },
      { path: "settings", name: "settings", component: () => import("@/views/SettingsView.vue"), meta: { title: "nav.settings" } },
      {
        path: "settings/:section(notifications|security|reports|access)",
        name: "settings-section",
        component: () => import("@/views/SettingsSectionView.vue"),
        props: true,
        meta: { title: "nav.settings" },
      },
      { path: ":pathMatch(.*)*", name: "not-found", component: () => import("@/views/NotFoundView.vue") },
    ],
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: (to, from) => {
    if (to.fullPath === from.fullPath) return false;
    const scrollContainer = document.getElementById("pt-content-scroll") ?? document.querySelector(".overflow-y-auto");
    if (scrollContainer) scrollContainer.scrollTop = 0;
    return { top: 0 };
  },
});

router.beforeEach(async (to) => {
  const session = useSessionStore();
  await session.init();

  if (to.meta.guest) return session.isAuthenticated ? { name: "home" } : true;
  if (!session.isAuthenticated) return { name: "login", query: to.fullPath !== "/" ? { redirect: to.fullPath } : undefined };
  if (to.meta.superAdmin && !session.isSuperAdmin) return { name: "home" };
  if (to.meta.manager && !session.canManage) return { name: "home" };
  if (to.meta.workspace && !session.hasOverview) return { name: "home" };
  return true;
});

// A new screen never inherits an open sheet or popup.
router.afterEach((to, from) => {
  if (to.path !== from.path) closeAllOverlays();
});
