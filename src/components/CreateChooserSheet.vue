<script setup lang="ts">
import { useSessionStore } from "@/stores/session";
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { ArrowRight01Icon, CheckListIcon, DashboardSquare01Icon, Folder01Icon } from "@hugeicons/core-free-icons";
import PtIcon from "@/components/ui/PtIcon.vue";
import PtSheet from "@/components/ui/PtSheet.vue";
import { haptics } from "@/services/haptics";
import type { Icon } from "@/plugins/icons";

/** What to create from the "+" button (or a shake): a task, a table or a project. */
const open = defineModel<boolean>({ required: true });
const emit = defineEmits<{ pick: [kind: "task" | "board" | "project"] }>();
const { t } = useI18n();
const session = useSessionStore();

const options = computed<{ kind: "task" | "board" | "project"; icon: Icon; title: string; hint: string; tone: string }[]>(() => [
  { kind: "task", icon: CheckListIcon, title: t("create.task"), hint: t("create.taskHint"), tone: "bg-primary-soft text-primary" },
  { kind: "board", icon: DashboardSquare01Icon, title: t("create.board"), hint: t("create.boardHint"), tone: "bg-success-soft text-success" },
  ...(session.canManage
    ? [{ kind: "project" as const, icon: Folder01Icon, title: t("create.project"), hint: t("create.projectHint"), tone: "bg-warning-soft text-warning" }]
    : []),
]);

function pick(kind: "task" | "board" | "project"): void {
  haptics.tap();
  open.value = false;
  emit("pick", kind);
}
</script>

<template>
  <PtSheet v-model="open" :title="$t('create.title')" width="28rem">
    <div class="flex flex-col gap-2.5 pb-2">
      <button
        v-for="(option, i) in options"
        :key="option.kind"
        v-stagger="i"
        type="button"
        class="flex items-center gap-4 rounded-2xl border border-line bg-surface-2 p-4 text-start transition hover:bg-surface-3 active:scale-[0.98]"
        @click="pick(option.kind)"
      >
        <span class="grid size-12 shrink-0 place-items-center rounded-2xl" :class="option.tone"><PtIcon :icon="option.icon" :size="22" /></span>
        <span class="min-w-0 flex-1">
          <span class="block font-bold">{{ option.title }}</span>
          <span class="block text-xs text-muted">{{ option.hint }}</span>
        </span>
        <PtIcon :icon="ArrowRight01Icon" :size="18" class="text-subtle rtl:rotate-180" />
      </button>
      <p class="mt-1 text-center text-xs text-subtle md:hidden">{{ $t("create.shakeHint") }}</p>
    </div>
  </PtSheet>
</template>
