<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { Attachment01Icon, CloudUploadIcon, Delete02Icon, PencilEdit02Icon, SentIcon } from "@hugeicons/core-free-icons";
import PtAvatar from "@/components/ui/PtAvatar.vue";
import PtButton from "@/components/ui/PtButton.vue";
import PtIcon from "@/components/ui/PtIcon.vue";
import PtIconButton from "@/components/ui/PtIconButton.vue";
import RichEditor from "@/components/editor/RichEditor.vue";
import AttachmentTray from "@/components/attachments/AttachmentTray.vue";
import AttachmentGallery from "@/components/attachments/AttachmentGallery.vue";
import { commentsApi } from "@/api/endpoints";
import { useApiError } from "@/composables/useApiError";
import { useAttachmentUploads } from "@/composables/useAttachmentUploads";
import { useConfirm } from "@/composables/useConfirm";
import { useDates } from "@/composables/useDates";
import { acceptOf } from "@/services/uploads";
import { useSessionStore } from "@/stores/session";
import type { Comment, Task } from "@/types/models";

/** Discussion on a task, with @mentions that notify the people tagged, and files (pictures, PDF, Office). */
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
const saving = ref(false);

const uploads = useAttachmentUploads(() => props.task.id);
const editUploads = useAttachmentUploads(() => props.task.id);
const accept = computed(() => acceptOf(uploads.rules.value));

/** Text or an inline picture: an empty editor still holds "<p></p>". */
const hasContent = (html: string | null | undefined) => !!html && (/<img\b/i.test(html) || html.replace(/<[^>]*>|&nbsp;/g, "").trim() !== "");

const canSend = computed(
  () => !sending.value && !uploads.busy.value && !uploads.failed.value && (hasContent(draft.value) || uploads.ids.value.length > 0),
);
const canSave = computed(
  () => !saving.value && !editUploads.busy.value && !editUploads.failed.value && (hasContent(editDraft.value) || editUploads.ids.value.length > 0),
);

onMounted(async () => {
  comments.value = await commentsApi.list(props.task.id);
});

// Files picked but never sent are deleted at once rather than waiting for the nightly purge.
onBeforeUnmount(() => {
  uploads.discard();
  editUploads.discard();
});

async function send(): Promise<void> {
  if (!canSend.value) return;
  sending.value = true;
  try {
    const body = hasContent(draft.value) ? draft.value : "";
    const comment = await commentsApi.create(props.task.id, body, editor.value?.mentionIds() ?? [], uploads.ids.value);
    comments.value.unshift(comment);
    editor.value?.clear();
    draft.value = "";
    uploads.reset();
    emit("changed", comments.value.length);
  } catch (error) {
    errors.report(error);
  } finally {
    sending.value = false;
  }
}

/* ---------- picking and dropping files ---------- */

const fileInput = ref<HTMLInputElement | null>(null);
const dragging = ref(false);
let dragDepth = 0;

function pick(event: Event): void {
  const input = event.target as HTMLInputElement;
  uploads.add(input.files ?? []);
  input.value = "";
}

const carriesFiles = (event: DragEvent) => [...(event.dataTransfer?.types ?? [])].includes("Files");

function onDragEnter(event: DragEvent): void {
  if (!carriesFiles(event)) return;
  dragDepth++;
  dragging.value = true;
}
function onDragLeave(): void {
  dragDepth = Math.max(0, dragDepth - 1);
  if (!dragDepth) dragging.value = false;
}
/** Pictures dropped onto the text go inline (the editor takes them); anything else becomes an attachment. */
function onDrop(event: DragEvent): void {
  dragDepth = 0;
  dragging.value = false;
  const files = [...(event.dataTransfer?.files ?? [])];
  if (!files.length) return;
  const onText = (event.target as HTMLElement | null)?.closest(".ProseMirror");
  if (onText && files.every((f) => f.type.startsWith("image/"))) return;
  event.preventDefault();
  event.stopPropagation();
  uploads.add(files);
}

/* ---------- editing ---------- */

// Refs inside v-for are arrays; only one comment is edited at a time.
function bindEditEditor(el: unknown): void {
  editEditor.value = el as InstanceType<typeof RichEditor> | null;
}

const editInput = ref<HTMLInputElement | null>(null);
function bindEditInput(el: unknown): void {
  editInput.value = el as HTMLInputElement | null;
}

function startEdit(comment: Comment): void {
  editUploads.discard();
  editingId.value = comment.id;
  editDraft.value = comment.body ?? "";
  editUploads.seed(comment.attachments ?? []);
}

function cancelEdit(): void {
  editUploads.discard();
  editingId.value = null;
}

function pickForEdit(event: Event): void {
  const input = event.target as HTMLInputElement;
  editUploads.add(input.files ?? []);
  input.value = "";
}

async function saveEdit(comment: Comment): Promise<void> {
  if (!canSave.value || !(await confirmAction("update", "comment"))) return;
  // Mentions survive an edit as long as the name is still in the text.
  const kept = (comment.mentions ?? []).filter((u) => editDraft.value.includes(`@${u.name}`)).map((u) => u.id);
  const ids = [...new Set([...kept, ...(editEditor.value?.mentionIds() ?? [])])];
  saving.value = true;
  try {
    const body = hasContent(editDraft.value) ? editDraft.value : "";
    const updated = await commentsApi.update(comment.id, body, ids, editUploads.ids.value);
    comments.value = comments.value.map((c) => (c.id === updated.id ? updated : c));
    editUploads.reset();
    editingId.value = null;
  } catch (error) {
    errors.report(error);
  } finally {
    saving.value = false;
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
      <PtAvatar v-if="session.user" :name="session.user.name" :src="session.user.avatar_url" :size="34" class="mt-1 max-sm:hidden" />
      <div class="relative min-w-0 flex-1" @dragenter.prevent="onDragEnter" @dragover.prevent @dragleave="onDragLeave" @drop.capture="onDrop">
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

        <AttachmentTray class="mt-2" :items="uploads.items.value" :size="uploads.size" @remove="uploads.remove" @retry="uploads.retry" />

        <div class="mt-2 flex items-center gap-2">
          <input ref="fileInput" type="file" multiple :accept="accept" class="hidden" @change="pick" />
          <button
            type="button"
            class="flex h-9 items-center gap-1.5 rounded-xl px-2.5 text-sm font-semibold text-muted transition hover:bg-surface-2 hover:text-ink active:scale-95"
            :title="$t('attachments.hint')"
            @click="fileInput?.click()"
          >
            <PtIcon :icon="Attachment01Icon" :size="18" />
            <span class="max-sm:sr-only">{{ $t("attachments.attach") }}</span>
          </button>
          <p class="min-w-0 flex-1 truncate text-xs text-muted tabular-nums" aria-live="polite">
            <template v-if="uploads.busy.value">{{ $t("attachments.uploading", { percent: uploads.progress.value }) }}</template>
            <span v-else-if="uploads.failed.value" class="font-semibold text-danger">{{ $t("attachments.fixErrors") }}</span>
          </p>
          <PtButton size="sm" :icon="SentIcon" flip :loading="sending" :disabled="!canSend" @click="send">{{ $t("tasks.addComment") }}</PtButton>
        </div>

        <Transition enter-active-class="transition duration-150" enter-from-class="opacity-0" leave-active-class="transition duration-150" leave-to-class="opacity-0">
          <div
            v-if="dragging"
            class="pointer-events-none absolute -inset-1.5 z-10 grid place-items-center rounded-2xl border-2 border-dashed border-primary bg-primary-soft/85 backdrop-blur-[1px]"
          >
            <span class="flex items-center gap-2 text-sm font-bold text-primary">
              <PtIcon :icon="CloudUploadIcon" :size="22" />{{ $t("attachments.dropHere") }}
            </span>
          </div>
        </Transition>
      </div>
    </div>

    <p v-if="!comments.length" class="py-6 text-center text-sm text-muted">{{ $t("tasks.noComments") }}</p>

    <TransitionGroup tag="ul" class="flex flex-col gap-4" enter-active-class="transition duration-300" enter-from-class="opacity-0 -translate-y-1">
      <li v-for="(comment, i) in comments" :key="comment.id" v-stagger="i" class="group flex gap-3">
        <PtAvatar :name="comment.author?.name ?? '?'" :src="comment.author?.avatar_url" :size="34" />
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <span class="truncate text-sm font-bold">{{ comment.author?.name }}</span>
            <time class="shrink-0 text-xs text-subtle" :title="fmt.dateTime(comment.created_at)">{{ fmt.relative(comment.created_at) }}</time>
            <span v-if="comment.edited_at" class="shrink-0 text-xs text-subtle">· {{ $t("tasks.edited") }}</span>
            <div class="ms-auto flex opacity-0 transition group-hover:opacity-100 focus-within:opacity-100 max-md:opacity-100">
              <PtIconButton v-if="comment.can.update" :icon="PencilEdit02Icon" :size="16" :label="$t('common.edit')" @click="startEdit(comment)" />
              <PtIconButton v-if="comment.can.delete" :icon="Delete02Icon" :size="16" :label="$t('common.delete')" @click="remove(comment)" />
            </div>
          </div>
          <div v-if="editingId === comment.id" class="mt-2">
            <RichEditor :ref="bindEditEditor" v-model="editDraft" mentions compact :project-id="task.board?.project_id" min-height="3rem" />
            <AttachmentTray class="mt-2" :items="editUploads.items.value" :size="editUploads.size" @remove="editUploads.remove" @retry="editUploads.retry" />
            <div class="mt-2 flex items-center gap-2">
              <input :ref="bindEditInput" type="file" multiple :accept="accept" class="hidden" @change="pickForEdit" />
              <PtIconButton :icon="Attachment01Icon" :size="18" :label="$t('attachments.attach')" @click="editInput?.click()" />
              <span class="flex-1" />
              <PtButton size="sm" variant="ghost" @click="cancelEdit">{{ $t("common.cancel") }}</PtButton>
              <PtButton size="sm" :loading="saving" :disabled="!canSave" @click="saveEdit(comment)">{{ $t("common.save") }}</PtButton>
            </div>
          </div>
          <template v-else>
            <!-- Body is sanitised server-side (HTMLPurifier) before storage. -->
            <div v-if="hasContent(comment.body)" v-media class="pt-prose mt-1 rounded-2xl rounded-ss-md bg-surface-2 px-3.5 py-2.5" v-html="comment.body" />
            <AttachmentGallery v-if="comment.attachments?.length" :attachments="comment.attachments" />
          </template>
        </div>
      </li>
    </TransitionGroup>
  </div>
</template>
