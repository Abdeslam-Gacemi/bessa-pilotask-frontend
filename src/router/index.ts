import { createRouter, createWebHistory, type RouteRecordRaw } from "vue-router";
import { useSessionStore } from "@/stores/session";
import { closeAllOverlays } from "@/composables/useOverlay";

declare module "vue-router" {
  interface RouteMeta {
    guest?: boolean;
    manager?: boolean;
    superAdmin?: boolean;
    workspace?: boolean;
    decider?: boolean;
    title?: string;
  }
}

const routes: RouteRecordRaw[] = [
  { path: "/login", name: "login", component: () => import("@/views/Auth/LoginView.vue"), meta: { guest: true } },
  {
    path: "/",
    component: () => import("@/layouts/AppShell.vue"),
    children: [
      { path: "", name: "home", component: () => import("@/views/Home/DashboardView.vue"), meta: { title: "nav.home" } },
      { path: "projects", name: "projects", component: () => import("@/views/Project/ProjectsView.vue"), meta: { title: "nav.projects" } },
      { path: "projects/:id(\\d+)", name: "project", component: () => import("@/views/Project/ProjectView.vue"), props: (r) => ({ id: Number(r.params.id) }) },
      { path: "boards/:id(\\d+)", name: "board", component: () => import("@/views/Board/BoardView.vue"), props: (r) => ({ id: Number(r.params.id) }) },
      { path: "tasks/:id(\\d+)", name: "task", component: () => import("@/views/Task/TaskView.vue"), props: (r) => ({ id: Number(r.params.id) }) },
      { path: "my-tasks", name: "my-tasks", component: () => import("@/views/Task/MyTasksView.vue"), meta: { title: "nav.myTasks" } },
      { path: "calendar", name: "calendar", component: () => import("@/views/Calendar/CalendarView.vue"), meta: { title: "nav.calendar" } },
      { path: "analytics", name: "analytics", component: () => import("@/views/Analytics/AnalyticsView.vue"), meta: { workspace: true, title: "nav.analytics" } },
      { path: "my-performance", name: "my-performance", component: () => import("@/views/Analytics/MyPerformanceView.vue"), meta: { title: "nav.myPerformance" } },
      { path: "observer-requests", name: "observer-requests", component: () => import("@/views/Observer/ObserverRequestsView.vue"), meta: { decider: true, title: "observer.inbox" } },
      { path: "my-observer-requests", name: "my-observer-requests", component: () => import("@/views/Observer/MyObserverRequestsView.vue"), meta: { title: "observer.myRequestsTitle" } },
      { path: "activity", name: "activity", component: () => import("@/views/Activity/ActivityView.vue"), meta: { superAdmin: true, title: "nav.activity" } },
      { path: "users", name: "users", component: () => import("@/views/User/UsersView.vue"), meta: { superAdmin: true, title: "nav.users" } },
      { path: "entities", name: "entities", component: () => import("@/views/Entity/EntitiesView.vue"), meta: { superAdmin: true, title: "nav.entities" } },
      { path: "labels", name: "labels", component: () => import("@/views/Label/LabelsView.vue"), meta: { manager: true, title: "nav.labels" } },
      { path: "notifications", name: "notifications", component: () => import("@/views/Notification/NotificationsView.vue"), meta: { title: "nav.notifications" } },
      { path: "help", name: "help", component: () => import("@/views/Help/HelpView.vue"), meta: { title: "help.title" } },
      { path: "settings", name: "settings", component: () => import("@/views/Settings/SettingsView.vue"), meta: { title: "nav.settings" } },
      {
        path: "settings/:section(notifications|security|reports|access|mentions|apikeys)",
        name: "settings-section",
        component: () => import("@/views/Settings/SettingsSectionView.vue"),
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
  if (to.meta.decider && !session.canCreate) return { name: "home" };
  // The mentions setting (who may @mention you) is for managers/super admins only.
  if (to.name === "settings-section" && to.params.section === "mentions" && !session.canManage) return { name: "settings" };
  return true;
});

// A new screen never inherits an open sheet or popup.
router.afterEach((to, from) => {
  if (to.path !== from.path) closeAllOverlays();
});
