import { createRouter, createWebHistory, type RouteRecordRaw } from "vue-router";
import { useSessionStore } from "@/stores/session";
import { closeAllOverlays } from "@/composables/useOverlay";

declare module "vue-router" {
  interface RouteMeta {
    guest?: boolean;
    manager?: boolean;
    superAdmin?: boolean;
    title?: string;
    /**
     * Without network: "copy" screens read the phone's offline copy (Android
     * app), "always" ones need no data; the others show an offline notice.
     */
    offline?: "copy" | "always";
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
      { path: "tasks/:id(\\d+)", name: "task", component: () => import("@/views/TaskView.vue"), props: (r) => ({ id: Number(r.params.id) }), meta: { offline: "copy" } },
      { path: "my-tasks", name: "my-tasks", component: () => import("@/views/MyTasksView.vue"), meta: { title: "nav.myTasks", offline: "copy" } },
      { path: "calendar", name: "calendar", component: () => import("@/views/CalendarView.vue"), meta: { title: "nav.calendar" } },
      { path: "analytics", name: "analytics", component: () => import("@/views/AnalyticsView.vue"), meta: { workspace: true, title: "nav.analytics" } },
      { path: "activity", name: "activity", component: () => import("@/views/ActivityView.vue"), meta: { superAdmin: true, title: "nav.activity" } },
      { path: "users", name: "users", component: () => import("@/views/UsersView.vue"), meta: { manager: true, title: "nav.users" } },
      { path: "entities", name: "entities", component: () => import("@/views/EntitiesView.vue"), meta: { superAdmin: true, title: "nav.entities" } },
      { path: "labels", name: "labels", component: () => import("@/views/LabelsView.vue"), meta: { manager: true, title: "nav.labels" } },
      { path: "notifications", name: "notifications", component: () => import("@/views/NotificationsView.vue"), meta: { title: "nav.notifications", offline: "copy" } },
      { path: "help", name: "help", component: () => import("@/views/HelpView.vue"), meta: { title: "help.title", offline: "always" } },
      { path: "settings", name: "settings", component: () => import("@/views/SettingsView.vue"), meta: { title: "nav.settings", offline: "always" } },
      {
        path: "settings/:section(notifications|security|reports|access|offline)",
        name: "settings-section",
        component: () => import("@/views/SettingsSectionView.vue"),
        props: true,
        meta: { title: "nav.settings", offline: "always" },
      },
      { path: ":pathMatch(.*)*", name: "not-found", component: () => import("@/views/NotFoundView.vue"), meta: { offline: "always" } },
    ],
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
  // The app scrolls inside #pt-content-scroll, not the window. AppShell resets it once the
  // old screen has faded out; resetting here would jump the old screen to the top first.
  scrollBehavior: () => false,
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
