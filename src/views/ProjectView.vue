<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { Add01Icon, Analytics01Icon, Archive01Icon, Delete02Icon, DashboardSquare01Icon, MoreHorizontalIcon, PencilEdit02Icon } from "@hugeicons/core-free-icons";
import PtAvatarStack from "@/components/ui/PtAvatarStack.vue";
import PtEmpty from "@/components/ui/PtEmpty.vue";
import PtIcon from "@/components/ui/PtIcon.vue";
import PtIconButton from "@/components/ui/PtIconButton.vue";
import PtMenuItem from "@/components/ui/PtMenuItem.vue";
import PtPopover from "@/components/ui/PtPopover.vue";
import PtProgress from "@/components/ui/PtProgress.vue";
import PtSkeleton from "@/components/ui/PtSkeleton.vue";
import BoardFormSheet from "@/components/projects/BoardFormSheet.vue";
import ProjectFormSheet from "@/components/projects/ProjectFormSheet.vue";
import { projectsApi } from "@/api/endpoints";
import { useApiError } from "@/composables/useApiError";
import { useConfirm } from "@/composables/useConfirm";
import { useRequest } from "@/composables/useRequest";
import { useToast } from "@/composables/useToast";
import { tableIcon } from "@/plugins/icons";
import { useProjectsStore } from "@/stores/projects";
import type { Board, Project } from "@/types/models";

const props = defineProps<{ id: number }>();
const { t } = useI18n();
const router = useRouter();
const store = useProjectsStore();
const { confirm, confirmAction } = useConfirm();
const toast = useToast();
const errors = useApiError();

const request = useRequest();
const project = ref<Project | null>(null);
const editing = ref(false);
const addingBoard = ref(false);
const menu = ref(false);

async function load(): Promise<void> {
  project.value = null;
  try {
    const result = await request.run((signal) => projectsApi.get(props.id, { signal }));
    if (result) project.value = result;
  } catch (error) {
    errors.report(error);
    await router.replace("/projects");
  }
}

function onProjectSaved(saved: Project): void {
  project.value = { ...project.value!, ...saved };
  store.upsert(saved);
}

function onBoardSaved(board: Board): void {
  void store.load(true);
  void router.push(`/boards/${board.id}`);
}

async function toggleArchive(): Promise<void> {
  if (!project.value) return;
  menu.value = false;
  const current = project.value;
  const result: { saved?: Project } = {};
  const run = async () => (result.saved = await projectsApi.update(current.id, { archived: !current.archived_at }));
  if (!(await confirmAction(current.archived_at ? "unarchive" : "archive", "project", current.name, run)) || !result.saved) return;
  onProjectSaved(result.saved);
  void store.load(true);
  menu.value = false;
}

async function remove(): Promise<void> {
  if (!project.value) return;
  menu.value = false;
  const id = project.value.id;
  const ok = await confirm({ title: t("projects.deleteConfirm", { name: project.value.name }), danger: true, confirmLabel: t("common.delete"), run: () => projectsApi.remove(id) });
  if (!ok) return;
  store.remove(id);
  toast.show(t("common.deleted"));
  await router.replace("/projects");
}

const overall = computed(() => {
  const boards = project.value?.boards ?? [];
  const total = boards.reduce((sum, b) => sum + (b.tasks_count ?? 0), 0);
  const done = boards.reduce((sum, b) => sum + (b.done_count ?? 0), 0);
  return total ? Math.round((done / total) * 100) : 0;
});

const progress = (b: Board) => (b.tasks_count ? Math.round(((b.done_count ?? 0) / b.tasks_count) * 100) : 0);

watch(() => props.id, load);
onMounted(load);
</script>

<template>
  <div v-if="!project" class="flex flex-col gap-4"><PtSkeleton class="h-28" /><PtSkeleton class="h-64" /></div>
  <div v-else class="flex flex-col gap-7">
    <header
      v-stagger="0"
      class="relative overflow-hidden rounded-(--radius-sheet) border border-line p-5 shadow-soft md:p-7"
      :style="{
        background: `radial-gradient(90% 140% at 100% 0%, color-mix(in oklab, ${project.color ?? '#171E23'} 22%, transparent), transparent 70%), var(--pt-surface)`,
      }"
    >
      <PtIcon :icon="tableIcon(project.icon)" :size="180" class="pointer-events-none absolute -end-8 -bottom-10 opacity-[0.07]" />
      <!-- Top row: identity on one side, actions on the other; the title gets the full width below. -->
      <div class="relative flex items-center justify-between gap-3">
        <span class="grid size-12 shrink-0 place-items-center rounded-2xl text-white shadow-soft" :style="{ background: project.color ?? 'var(--pt-ink)' }">
          <PtIcon :icon="tableIcon(project.icon)" :size="24" />
        </span>
        <div v-if="project.can?.update" class="flex items-center gap-1 rounded-full border border-line bg-surface/80 p-1 shadow-soft backdrop-blur">
          <PtIconButton
            :icon="Analytics01Icon"
            :size="18"
            :label="$t('nav.analytics')"
            @click="router.push({ path: '/analytics', query: { scope: 'project', id: project.id } })"
          />
          <PtIconButton :icon="PencilEdit02Icon" :size="18" :label="$t('projects.edit')" @click="editing = true" />
          <PtPopover v-if="project.can?.administer" v-model="menu" align="end" width="14rem">
            <template #trigger="{ toggle }">
              <PtIconButton :icon="MoreHorizontalIcon" :size="18" :label="$t('common.more')" @click="toggle" />
            </template>
            <PtMenuItem :icon="Archive01Icon" @click="toggleArchive">{{ project.archived_at ? $t("projects.unarchive") : $t("projects.archive") }}</PtMenuItem>
            <PtMenuItem :icon="Delete02Icon" danger @click="remove">{{ $t("common.delete") }}</PtMenuItem>
          </PtPopover>
        </div>
      </div>
      <h1 class="relative mt-4 text-2xl leading-tight font-bold break-words md:text-3xl">{{ project.name }}</h1>
      <p v-if="project.starts_on || project.ends_on" class="relative mt-1.5 text-xs font-semibold text-muted">
        {{ project.starts_on ?? "…" }} <span class="pt-arrow">→</span> {{ project.ends_on ?? "…" }}
      </p>
      <p v-if="project.description" class="relative mt-3 max-w-3xl text-sm leading-relaxed text-muted">{{ project.description }}</p>
      <div class="relative mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-line/70 pt-4">
        <div class="flex items-center gap-2.5">
          <PtAvatarStack :users="project.members ?? []" :max="6" :size="30" />
          <span class="text-xs font-semibold text-muted">{{ $t("projects.membersCount", project.members?.length ?? 0) }}</span>
        </div>
        <div class="flex min-w-48 flex-1 items-center gap-3">
          <span class="text-xs font-semibold text-muted">{{ $t("projects.progress") }}</span>
          <PtProgress class="flex-1" :value="overall" :color="project.color ?? undefined" />
          <span class="text-sm font-bold tabular-nums">{{ overall }}%</span>
        </div>
      </div>
    </header>

    <section>
      <div class="mb-3 flex items-center justify-between">
        <h2 class="text-xl font-bold">{{ $t("boards.title") }}</h2>
        <PtIconButton v-if="project.can?.manage" :icon="Add01Icon" variant="ink" :label="$t('boards.new')" @click="addingBoard = true" />
      </div>
      <PtEmpty v-if="!project.boards?.length" :icon="DashboardSquare01Icon" :title="$t('boards.empty')" :hint="$t('boards.emptyHint')" />
      <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <RouterLink
          v-for="(board, i) in project.boards"
          :key="board.id"
          v-stagger="i + 1"
          :to="`/boards/${board.id}`"
          class="pt-card flex items-center gap-4 p-4 transition hover:-translate-y-0.5 hover:shadow-float"
        >
          <span
            class="grid size-12 shrink-0 place-items-center rounded-2xl"
            :style="{ background: `color-mix(in oklab, ${board.color ?? '#171E23'} 16%, transparent)`, color: board.color ?? 'var(--pt-ink)' }"
          >
            <PtIcon :icon="tableIcon(board.icon)" :size="22" />
          </span>
          <div class="min-w-0 flex-1">
            <h3 class="truncate font-bold">{{ board.name }}</h3>
            <p class="mb-2 text-xs text-muted">{{ board.done_count ?? 0 }} / {{ board.tasks_count ?? 0 }} · {{ progress(board) }}%</p>
            <PtProgress :value="progress(board)" :color="board.color ?? undefined" :height="5" />
          </div>
        </RouterLink>
      </div>
    </section>

    <ProjectFormSheet v-model="editing" :project="project" @saved="onProjectSaved" />
    <BoardFormSheet v-model="addingBoard" :project-id="project.id" @saved="onBoardSaved" />
  </div>
</template>
