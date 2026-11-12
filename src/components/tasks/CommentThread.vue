<script setup lang="ts">
import { onMounted, ref } from "vue";
import { Delete02Icon, PencilEdit02Icon, SentIcon } from "@hugeicons/core-free-icons";
import PtAvatar from "@/components/ui/PtAvatar.vue";
import PtButton from "@/components/ui/PtButton.vue";
import PtIconButton from "@/components/ui/PtIconButton.vue";
import RichEditor from "@/components/editor/RichEditor.vue";
import { commentsApi } from "@/api/endpoints";
import { useApiError } from "@/composables/useApiError";
import { useConfirm } from "@/composables/useConfirm";
import { useDates } from "@/composables/useDates";
import { useSessionStore } from "@/stores/session";
import type { Comment, Task } from "@/types/models";

/** Discussion on a task, with @mentions that notify the people tagged. */
const props = defineProps<{ task: Task }>();
const emit = defineEmits<{ changed: [count: number] }>();

const session = useSessionStore();
const { fmt } = useDates();
const { confirmAction } = useConfirm();
const errors = useApiError();

const comments = ref<Comment[]>([]);
const draft = ref("");
const sending = ref(false);
const editor = ref<InstanceType<typeof RichEditor> | null>(null);
const editingId = ref<number | null>(null);
const editDraft = ref("");
const editEditor = ref<InstanceType<typeof RichEditor> | null>(null);

onMounted(async () => {
  comments.value = await commentsApi.list(props.task.id);
});

async function send(): Promise<void> {
  if (!draft.value.trim() || sending.value) return;
  sending.value = true;
  try {
    const comment = await commentsApi.create(props.task.id, draft.value, editor.value?.mentionIds() ?? []);
    comments.value.unshift(comment);
    editor.value?.clear();
    draft.value = "";
    emit("changed", comments.value.length);
  } catch (error) {
    errors.report(error);
  } finally {
    sending.value = false;
  }
}

// Refs inside v-for are arrays; only one comment is edited at a time.
function bindEditEditor(el: unknown): void {
  editEditor.value = el as InstanceType<typeof RichEditor> | null;
}

function startEdit(comment: Comment): void {
  editingId.value = comment.id;
  editDraft.value = comment.body;
}

async function saveEdit(comment: Comment): Promise<void> {
  if (!(await confirmAction("update", "comment"))) return;
  // Mentions survive an edit as long as the name is still in the text.
  const kept = (comment.mentions ?? []).filter((u) => editDraft.value.includes(`@${u.name}`)).map((u) => u.id);
  const ids = [...new Set([...kept, ...(editEditor.value?.mentionIds() ?? [])])];
  try {
    const updated = await commentsApi.update(comment.id, editDraft.value, ids);
    comments.value = comments.value.map((c) => (c.id === updated.id ? updated : c));
    editingId.value = null;
  } catch (error) {
    errors.report(error);
  }
}

async function remove(comment: Comment): Promise<void> {
  if (!(await confirmAction("delete", "comment", undefined, () => commentsApi.remove(comment.id)))) return;
  comments.value = comments.value.filter((c) => c.id !== comment.id);
  emit("changed", comments.value.length);
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <p v-if="task.can && !task.can.comment" class="rounded-2xl bg-surface-2 px-4 py-3 text-sm text-muted">{{ $t("tasks.readOnly") }}</p>
    <div v-else class="flex gap-3">
      <PtAvatar v-if="session.user" :name="session.user.name" :src="session.user.avatar_url" :size="34" class="mt-1" />
      <div class="flex-1">
        <RichEditor
          ref="editor"
          v-model="draft"
          mentions
          compact
          :project-id="task.board?.project_id"
          :placeholder="$t('tasks.commentPlaceholder')"
          min-height="3.5rem"
          @submit="send"
        />
        <div class="mt-2 flex justify-end">
          <PtButton size="sm" :icon="SentIcon" flip :loading="sending" :disabled="!draft" @click="send">{{ $t("tasks.addComment") }}</PtButton>
        </div>
      </div>
    </div>

    <p v-if="!comments.length" class="py-6 text-center text-sm text-muted">{{ $t("tasks.noComments") }}</p>

    <TransitionGroup tag="ul" class="flex flex-col gap-4" enter-active-class="transition duration-300" enter-from-class="opacity-0 -translate-y-1">
      <li v-for="(comment, i) in comments" :key="comment.id" v-stagger="i" class="group flex gap-3">
        <PtAvatar :name="comment.author?.name ?? '?'" :src="comment.author?.avatar_url" :size="34" />
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <span class="text-sm font-bold">{{ comment.author?.name }}</span>
            <time class="text-xs text-subtle" :title="fmt.dateTime(comment.created_at)">{{ fmt.relative(comment.created_at) }}</time>
            <span v-if="comment.edited_at" class="text-xs text-subtle">· {{ $t("tasks.edited") }}</span>
            <div class="ms-auto flex opacity-0 transition group-hover:opacity-100 focus-within:opacity-100 max-md:opacity-100">
              <PtIconButton v-if="comment.can.update" :icon="PencilEdit02Icon" :size="16" :label="$t('common.edit')" @click="startEdit(comment)" />
              <PtIconButton v-if="comment.can.delete" :icon="Delete02Icon" :size="16" :label="$t('common.delete')" @click="remove(comment)" />
            </div>
          </div>
          <div v-if="editingId === comment.id" class="mt-2">
            <RichEditor :ref="bindEditEditor" v-model="editDraft" mentions compact :project-id="task.board?.project_id" min-height="3rem" />
            <div class="mt-2 flex justify-end gap-2">
              <PtButton size="sm" variant="ghost" @click="editingId = null">{{ $t("common.cancel") }}</PtButton>
              <PtButton size="sm" @click="saveEdit(comment)">{{ $t("common.save") }}</PtButton>
            </div>
          </div>
          <!-- Body is sanitised server-side (HTMLPurifier) before storage. -->
          <div v-else v-media class="pt-prose mt-1 rounded-2xl rounded-ss-md bg-surface-2 px-3.5 py-2.5" v-html="comment.body" />
        </div>
      </li>
    </TransitionGroup>
  </div>
</template>
