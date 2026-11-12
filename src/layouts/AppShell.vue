<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useLocalStorage } from "@vueuse/core";
import { useI18n } from "vue-i18n";
import {
  Activity01Icon,
  ArrowDown01Icon,
  Add01Icon,
  Analytics01Icon,
  Calendar03Icon,
  CheckListIcon,
  Folder01Icon,
  Home09Icon,
  Logout01Icon,
  Notification03Icon,
  Tag01Icon,
  UserMultipleIcon,
} from "@hugeicons/core-free-icons";
import AppLogo from "@/components/brand/AppLogo.vue";
import PtAvatar from "@/components/ui/PtAvatar.vue";
import PtIcon from "@/components/ui/PtIcon.vue";
import PtIconButton from "@/components/ui/PtIconButton.vue";
import TaskDrawer from "@/components/tasks/TaskDrawer.vue";
import TaskFormSheet from "@/components/tasks/TaskFormSheet.vue";
import CreateChooserSheet from "@/components/CreateChooserSheet.vue";
import BoardFormSheet from "@/components/projects/BoardFormSheet.vue";
import ProjectFormSheet from "@/components/projects/ProjectFormSheet.vue";
import SidebarPreferences from "@/components/settings/SidebarPreferences.vue";
import { useProfileSave } from "@/composables/useProfileSave";
import { usePreferencesStore } from "@/stores/preferences";
import { useShake } from "@/composables/useShake";
import { haptics } from "@/services/haptics";
import { useTaskUi } from "@/composables/useTaskUi";
import { useNotificationTarget } from "@/composables/useNotificationTarget";
import { useConfirm } from "@/composables/useConfirm";
import { hasOpenOverlay } from "@/composables/useOverlay";
import { useToast } from "@/composables/useToast";
import { tableIcon, type Icon } from "@/plugins/icons";
import { startPush, stopPush } from "@/services/push";
import { useMetaStore } from "@/stores/meta";
import { useNotificationsStore } from "@/stores/notifications";
import { useProjectsStore } from "@/stores/projects";
import { useSessionStore } from "@/stores/session";
import type { Board, Project, Task } from "@/types/models";

/**
 * Signed-in frame: a sidebar on desktop, a floating bottom bar with the
 * create button on phones, and the app-wide task drawer and form.
 */
const session = useSessionStore();
const meta = useMetaStore();
const projects = useProjectsStore();
const inbox = useNotificationsStore();
const taskUi = useTaskUi();
const openTarget = useNotificationTarget();

// Theme and language follow the account: saved wherever they are changed (sidebar or settings).
const prefs = usePreferencesStore();
const { saveSoon } = useProfileSave();
watch(() => prefs.theme, (theme) => void saveSoon({ theme }));
watch(() => prefs.locale, (locale) => void saveSoon({ locale }));
const router = useRouter();
const route = useRoute();

// Sidebar folding, remembered on this device.
const sidebar = useLocalStorage("pt.sidebar", { projectsCollapsed: false, foldedProjects: [] as number[] }, { mergeDefaults: true });
function toggleProject(id: number): void {
  const folded = sidebar.value.foldedProjects;
  sidebar.value.foldedProjects = folded.includes(id) ? folded.filter((x) => x !== id) : [...folded, id];
}
const toast = useToast();
const { confirmAction } = useConfirm();
const { t } = useI18n();

interface NavItem {
  to: string;
  label: string;
  icon: Icon;
  badge?: number;
}

const main = computed<NavItem[]>(() => [
  { to: "/", label: t("nav.home"), icon: Home09Icon },
  { to: "/my-tasks", label: t("nav.myTasks"), icon: CheckListIcon },
  { to: "/projects", label: t("nav.projects"), icon: Folder01Icon },
  { to: "/calendar", label: t("nav.calendar"), icon: Calendar03Icon },
  { to: "/notifications", label: t("nav.notifications"), icon: Notification03Icon, badge: inbox.unread },
]);

const admin = computed<NavItem[]>(() =>
  [
    session.hasOverview && { to: "/analytics", label: t("nav.analytics"), icon: Analytics01Icon },
    session.isSuperAdmin && { to: "/activity", label: t("nav.activity"), icon: Activity01Icon },
    session.canManage && { to: "/users", label: t("nav.users"), icon: UserMultipleIcon },
    session.canManage && { to: "/labels", label: t("nav.labels"), icon: Tag01Icon },
  ].filter(Boolean) as NavItem[],
);

const mobile = computed<NavItem[]>(() => [
  main.value[0]!,
  main.value[2]!,
  main.value[3]!,
  session.hasOverview ? admin.value[0]! : main.value[1]!,
]);

onMounted(async () => {
  await Promise.all([meta.load(), projects.load()]).catch(() => toast.error(t("errors.network")));
  inbox.start();
  void startPush({
    onMessage: () => void inbox.refresh(),
    onOpen: openTarget,
  });
});

onUnmounted(() => inbox.stop());

async function signOut(): Promise<void> {
  // The dialog keeps a spinner on its button until the sign-out is done.
  const done = await confirmAction("logout", undefined, undefined, async () => {
    await stopPush();
    await session.logout();
    inbox.stop();
  });
  if (done) await router.replace({ name: "login" });
}

function openCreate(): void {
  haptics.tap();
  taskUi.openCreate();
}

function onPick(kind: "task" | "board" | "project"): void {
  if (kind === "task") taskUi.createTask();
  else if (kind === "board") taskUi.createBoard();
  else taskUi.createProject();
}

function onProjectSaved(project: Project): void {
  haptics.success();
  projects.upsert({ ...project, boards: [] });
  toast.success(t("common.saved"));
  void router.push(`/projects/${project.id}`);
}

function onBoardSaved(board: Board): void {
  haptics.success();
  void projects.load(true);
  toast.success(t("common.saved"));
  void router.push(`/boards/${board.id}`);
}

// Shake the phone to open the "+" menu (managers only, and not on top of another sheet).
useShake(
  () => {
    if (hasOpenOverlay.value) return;
    haptics.bump();
    taskUi.openCreate();
  },
  computed(() => session.canCreate),
);

function onSaved(task: Task): void {
  haptics.success();
  taskUi.notifySaved(task);
  toast.success(t("common.saved"));
}
router.afterEach((to, from) => {
  if (to.path !== from.path) {
    const el = document.getElementById("pt-content-scroll");
    if (el) el.scrollTop = 0;
  }
});
</script>

<template>
  <div class="min-h-dvh md:flex">
    <!-- Desktop sidebar -->
    <aside class="sticky top-0 hidden h-dvh w-68 shrink-0 flex-col gap-1 border-e border-line bg-surface/70 px-4 py-5 backdrop-blur md:flex">
      <div class="mb-5 flex items-center justify-between gap-2 ps-2">
        <RouterLink to="/"><AppLogo :height="30" /></RouterLink>
        <PtIconButton v-if="session.canCreate" :icon="Add01Icon" variant="ink" :label="$t('create.title')" @click="openCreate" />
      </div>

      <nav class="flex flex-col gap-0.5">
        <RouterLink
          v-for="item in main"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted transition hover:bg-surface-3 hover:text-fg"
          exact-active-class="!bg-ink !text-on-ink"
        >
          <PtIcon :icon="item.icon" :size="19" />
          <span class="flex-1">{{ item.label }}</span>
          <span v-if="item.badge" class="rounded-full bg-danger px-1.5 text-[11px] leading-5 font-bold text-white">{{ item.badge }}</span>
        </RouterLink>
      </nav>

      <div class="mt-5 min-h-0 flex-1 overflow-y-auto">
        <!-- Projects: the section and each project fold; the state is remembered on this device. -->
        <button
          type="button"
          class="pt-label mb-1 flex w-full items-center gap-2 rounded-lg px-3 py-1.5 transition hover:text-fg"
          :aria-expanded="!sidebar.projectsCollapsed"
          @click="sidebar.projectsCollapsed = !sidebar.projectsCollapsed"
        >
          <span class="flex-1 text-start">{{ $t("nav.projects") }}</span>
          <span class="rounded-full bg-surface-3 px-1.5 text-[10px] leading-4">{{ projects.projects.length }}</span>
          <PtIcon :icon="ArrowDown01Icon" :size="14" class="transition duration-200" :class="sidebar.projectsCollapsed && '-rotate-90 rtl:rotate-90'" />
        </button>
        <div v-show="!sidebar.projectsCollapsed" class="flex flex-col gap-0.5">
          <div v-for="project in projects.projects" :key="project.id">
            <div class="group flex items-center rounded-xl transition hover:bg-surface-3" :class="route.path === `/projects/${project.id}` && 'bg-surface-3'">
              <RouterLink :to="`/projects/${project.id}`" class="flex min-w-0 flex-1 items-center gap-3 py-2 ps-3 text-sm font-semibold">
                <span class="grid size-7 shrink-0 place-items-center rounded-lg text-white shadow-soft" :style="{ background: project.color ?? 'var(--pt-ink)' }">
                  <PtIcon :icon="tableIcon(project.icon)" :size="15" />
                </span>
                <span class="min-w-0 flex-1 truncate">{{ project.name }}</span>
              </RouterLink>
              <button
                v-if="project.boards?.length"
                type="button"
                class="me-1 grid size-7 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-surface hover:text-fg"
                :aria-label="project.name"
                :aria-expanded="!sidebar.foldedProjects.includes(project.id)"
                @click="toggleProject(project.id)"
              >
                <PtIcon :icon="ArrowDown01Icon" :size="14" class="transition duration-200" :class="sidebar.foldedProjects.includes(project.id) && '-rotate-90 rtl:rotate-90'" />
              </button>
            </div>
            <div v-show="!sidebar.foldedProjects.includes(project.id)" class="ms-6.5 mt-0.5 mb-1.5 flex flex-col border-s border-line ps-2">
              <RouterLink
                v-for="board in project.boards"
                :key="board.id"
                :to="`/boards/${board.id}`"
                class="flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-[13px] text-muted transition hover:bg-surface-3 hover:text-fg"
                active-class="!bg-surface-3 !text-fg font-semibold"
              >
                <span class="size-2 shrink-0 rounded-full" :style="{ background: board.color ?? 'var(--pt-subtle)' }" />
                <span class="truncate">{{ board.name }}</span>
              </RouterLink>
            </div>
          </div>
        </div>

        <template v-if="admin.length">
          <p class="pt-label mt-5 mb-1.5 px-3">{{ $t("nav.admin") }}</p>
          <RouterLink
            v-for="item in admin"
            :key="item.to"
            :to="item.to"
            class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted transition hover:bg-surface-3 hover:text-fg"
            active-class="!bg-ink !text-on-ink"
          >
            <PtIcon :icon="item.icon" :size="19" />
            {{ item.label }}
          </RouterLink>
        </template>
      </div>

      <SidebarPreferences class="mt-3 border-t border-line pt-3" />

      <div v-if="session.user" class="mt-2 flex items-center gap-2 rounded-2xl border border-line bg-surface p-2">
        <RouterLink to="/settings" class="flex min-w-0 flex-1 items-center gap-3 rounded-xl p-1 transition hover:bg-surface-2">
          <PtAvatar :name="session.user.name" :src="session.user.avatar_url" :size="38" />
          <span class="min-w-0 flex-1">
            <span class="block text-sm leading-tight font-bold break-words">{{ session.user.name }}</span>
            <span class="mt-0.5 block text-xs text-muted">{{ $t(`users.roles.${session.user.role}`) }}</span>
          </span>
        </RouterLink>
        <PtIconButton :icon="Logout01Icon" :size="18" class="rtl:rotate-180" :label="$t('auth.signOut')" @click="signOut" />
      </div>
    </aside>

    <!-- Content -->
    <div id="pt-content-scroll" class="min-w-0 flex-1 overflow-y-auto h-dvh">
      <header class="pt-safe-top sticky top-0 z-30 flex items-center gap-2 bg-bg/80 px-4 pb-2 backdrop-blur md:hidden">
        <RouterLink to="/" class="py-3"><AppLogo variant="mark" :height="26" /></RouterLink>
        <span class="flex-1" />
        <PtIconButton :icon="Notification03Icon" :label="$t('nav.notifications')" :badge="inbox.unread || false" @click="router.push('/notifications')" />
        <RouterLink v-if="session.user" to="/settings" :aria-label="$t('nav.settings')">
          <PtAvatar :name="session.user.name" :src="session.user.avatar_url" :size="36" />
        </RouterLink>
      </header>

      <!-- Bottom padding keeps the last item clear of the floating bottom bar on phones. -->
      <main class="mx-auto w-full max-w-7xl px-4 pt-2 pb-[calc(9rem+env(safe-area-inset-bottom))] md:px-8 md:pt-8 md:pb-12">
        <RouterView v-slot="{ Component }">
          <Transition name="pt-fade" mode="out-in">
            <component :is="Component" />
          </Transition>
        </RouterView>
      </main>
    </div>

    <!-- Mobile bottom bar -->
    <nav class="pt-safe-bottom fixed inset-x-0 bottom-0 z-40 flex items-end gap-3 px-4 md:hidden">
      <div class="flex flex-1 items-center justify-around rounded-full border border-line bg-surface/90 px-2 py-2 shadow-float backdrop-blur">
        <RouterLink
          v-for="item in mobile"
          :key="item.to"
          :to="item.to"
          :aria-label="item.label"
          class="grid size-11 place-items-center rounded-full text-muted transition"
          exact-active-class="!bg-ink !text-on-ink"
        >
          <PtIcon :icon="item.icon" :size="21" />
        </RouterLink>
      </div>
      <button
        type="button"
        class="mb-0.5 grid size-15 shrink-0 place-items-center rounded-full bg-ink text-on-ink shadow-float transition active:scale-95"
        :aria-label="session.canCreate ? $t('create.title') : $t('nav.myTasks')"
        @click="session.canCreate ? openCreate() : router.push('/my-tasks')"
      >
        <PtIcon :icon="session.canCreate ? Add01Icon : CheckListIcon" :size="24" />
      </button>
    </nav>

    <CreateChooserSheet v-model="taskUi.state.chooserOpen" @pick="onPick" />
    <ProjectFormSheet v-model="taskUi.state.projectFormOpen" @saved="onProjectSaved" />
    <BoardFormSheet v-model="taskUi.state.boardFormOpen" @saved="onBoardSaved" />

    <TaskDrawer
      v-model="taskUi.state.drawerOpen"
      :task-id="taskUi.state.taskId"
      @updated="taskUi.notifySaved"
      @deleted="taskUi.notifyDeleted"
    />
    <TaskFormSheet
      v-model="taskUi.state.formOpen"
      :board="taskUi.state.formBoard"
      :status-id="taskUi.state.formStatusId"
      :default-due="taskUi.state.formDue"
      @saved="onSaved"
    />
  </div>
</template>
