<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { CheckListIcon, Folder01Icon, LayoutTable01Icon, Tag01Icon } from "@hugeicons/core-free-icons";
import HealthBadge from "./HealthBadge.vue";
import PtAvatar from "@/components/ui/PtAvatar.vue";
import PtAvatarStack from "@/components/ui/PtAvatarStack.vue";
import PtIcon from "@/components/ui/PtIcon.vue";
import PtSkeleton from "@/components/ui/PtSkeleton.vue";
import { keyResultsApi } from "@/api/endpoints";
import { useDates } from "@/composables/useDates";
import { useRequest } from "@/composables/useRequest";
import { signalText } from "@/domain/objectives";
import type { Icon } from "@/plugins/icons";
import type { KeyResult, KeyResultLinkType, LinkedTask } from "@/types/models";

/** Behind a key result: every signal, the linked work, the tasks it counts, and the check-in history. */
const props = defineProps<{ kr: KeyResult }>();
const { t } = useI18n();
const { fmt, dueLabel } = useDates();
const request = useRequest();
const tasks = ref<LinkedTask[] | null>(null);
const ICONS: Record<KeyResultLinkType, Icon> = { project: Folder01Icon, board: LayoutTable01Icon, label: Tag01Icon, task: CheckListIcon };

onMounted(async () => {
  if (props.kr.type !== "tasks") return;
  tasks.value = (await request.run((signal) => keyResultsApi.tasks(props.kr.id, { signal })).catch(() => [])) ?? [];
});

const late = (task: LinkedTask) => task.status.category !== "done" && task.due_at !== null && new Date(task.due_at) < new Date();
</script>

<template>
  <div class="flex flex-col gap-5 ps-11">
    <ul v-if="kr.insight?.signals.length" class="flex flex-col gap-1 text-sm">
      <li v-for="signal in kr.insight.signals" :key="signal.code" class="flex items-center gap-2">
        <span class="size-1.5 rounded-full bg-warning" />
        {{ signalText(signal, t) }}
      </li>
    </ul>

    <div v-if="kr.links?.length">
      <p class="pt-label mb-2">{{ $t("objectives.form.linkedWork") }}</p>
      <div class="flex flex-wrap gap-1.5">
        <RouterLink
          v-for="link in kr.links"
          :key="`${link.type}:${link.id}`"
          :to="link.type === 'project' ? `/projects/${link.id}` : link.type === 'board' ? `/boards/${link.id}` : link.type === 'task' ? `/tasks/${link.id}` : '/labels'"
          class="pt-chip max-w-72 hover:bg-surface-3"
        >
          <PtIcon :icon="ICONS[link.type]" :size="14" :style="{ color: link.color ?? undefined }" />
          <span class="truncate">{{ link.name }}</span>
          <span v-if="link.context" class="truncate font-normal text-muted">· {{ link.context }}</span>
        </RouterLink>
      </div>
    </div>

    <div v-if="kr.type === 'tasks'">
      <p class="pt-label mb-2">{{ $t("objectives.countedTasks") }}</p>
      <div v-if="tasks === null" class="flex flex-col gap-2"><PtSkeleton v-for="i in 3" :key="i" class="h-9 rounded-xl" /></div>
      <p v-else-if="!tasks.length" class="text-sm text-muted">{{ $t("objectives.noTasks") }}</p>
      <ul v-else class="max-h-80 divide-y divide-line/70 overflow-y-auto rounded-2xl border border-line">
        <li v-for="task in tasks" :key="task.id">
          <RouterLink :to="`/tasks/${task.id}`" class="flex items-center gap-3 px-3 py-2 text-sm transition hover:bg-surface-2">
            <span class="size-2.5 shrink-0 rounded-full" :style="{ background: task.status.color }" :title="task.status.name" />
            <span class="min-w-0 flex-1 truncate" :class="task.status.category === 'done' && 'text-muted line-through'">{{ task.title }}</span>
            <span class="hidden truncate text-xs text-muted sm:block">{{ task.board.name }}</span>
            <span v-if="task.due_at && task.status.category !== 'done'" class="text-xs font-semibold whitespace-nowrap" :class="late(task) ? 'text-danger' : 'text-muted'">{{ dueLabel(task.due_at) }}</span>
            <PtAvatarStack v-if="task.assignees.length" :users="task.assignees" :max="3" :size="22" />
          </RouterLink>
        </li>
      </ul>
    </div>

    <div v-if="kr.check_ins?.length">
      <p class="pt-label mb-2">{{ $t("objectives.history") }}</p>
      <ol class="relative flex flex-col gap-4 border-s border-line ps-5">
        <li v-for="c in kr.check_ins" :key="c.id" class="relative">
          <span class="absolute -start-[25px] top-1 size-2.5 rounded-full ring-4 ring-surface" :class="{ 'bg-success': c.confidence === 'on_track', 'bg-warning': c.confidence === 'at_risk', 'bg-danger': c.confidence === 'off_track' }" />
          <div class="flex flex-wrap items-center gap-2 text-xs text-muted">
            <PtAvatar v-if="c.user" :name="c.user.name" :src="c.user.avatar_url" :size="20" />
            <span class="font-semibold text-fg">{{ c.user?.name }}</span>
            <span>{{ fmt.relative(c.created_at) }}</span>
            <HealthBadge :health="c.confidence" size="sm" />
            <span class="font-semibold text-fg tabular-nums">{{ c.progress }}%</span>
            <span v-if="c.value !== null && kr.type === 'metric'" class="tabular-nums">· {{ c.value }} {{ kr.unit }}</span>
          </div>
          <p v-if="c.note" class="mt-1 text-sm whitespace-pre-line">{{ c.note }}</p>
        </li>
      </ol>
    </div>
  </div>
</template>
