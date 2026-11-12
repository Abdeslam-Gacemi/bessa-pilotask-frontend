<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from "vue";
import { EditorContent, useEditor, VueRenderer } from "@tiptap/vue-3";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extensions";
import Mention from "@tiptap/extension-mention";
import type { SuggestionProps } from "@tiptap/suggestion";
import {
  Image01Icon,
  LeftToRightListBulletIcon,
  LeftToRightListNumberIcon,
  Link01Icon,
  Loading03Icon,
  QuoteDownIcon,
  TextBoldIcon,
  TextItalicIcon,
  TextStrikethroughIcon,
  TextUnderlineIcon,
  Unlink01Icon,
} from "@hugeicons/core-free-icons";
import PtIcon from "@/components/ui/PtIcon.vue";
import PtPopover from "@/components/ui/PtPopover.vue";
import MentionList from "./MentionList.vue";
import { ImageNode, reportUploadProgress } from "./imageNode";
import { uploadsApi, usersApi } from "@/api/endpoints";
import { useApiError } from "@/composables/useApiError";
import type { Icon } from "@/plugins/icons";
import type { User } from "@/types/models";

/**
 * WYSIWYG editor for descriptions and comments: formatting, links and images
 * (picked, pasted or dropped; uploaded to the API). With `mentions`, typing @
 * suggests people (scoped to a project when given). HTML in, HTML out.
 */
const props = withDefaults(
  defineProps<{ placeholder?: string; mentions?: boolean; projectId?: number; minHeight?: string; compact?: boolean; images?: boolean }>(),
  { minHeight: "7rem", images: true },
);
const model = defineModel<string>({ default: "" });
const emit = defineEmits<{ submit: [] }>();
const errors = useApiError();

const uploading = ref(0);
const fileInput = ref<HTMLInputElement | null>(null);
const linkOpen = ref(false);
const linkUrl = ref("");
const linkInput = ref<HTMLInputElement | null>(null);

// @mention suggestions: the list opens at once with a loading state, and the
// people arrive from the directory (latest query wins). Matches already
// fetched are shown meanwhile, filtered locally.
let mentionRenderer: VueRenderer | null = null;
let mentionCache: User[] = [];
let mentionQuery = 0;

async function fetchMentions(query: string): Promise<void> {
  const ticket = ++mentionQuery;
  mentionRenderer?.updateProps({ loading: true });
  try {
    const found = (await usersApi.directory({ search: query || undefined, project_id: props.projectId })).slice(0, 6);
    if (ticket !== mentionQuery) return;
    mentionCache = found;
    mentionRenderer?.updateProps({ items: found, loading: false });
  } catch {
    if (ticket === mentionQuery) mentionRenderer?.updateProps({ loading: false });
  }
}

const mention = Mention.configure({
  HTMLAttributes: { class: "mention" },
  renderHTML: ({ node }) => ["span", { class: "mention", "data-id": node.attrs.id }, `@${node.attrs.label ?? node.attrs.id}`],
  suggestion: {
    items: ({ query }: { query: string }) => {
      void fetchMentions(query);
      const q = query.toLowerCase();
      return mentionCache.filter((u) => u.name.toLowerCase().includes(q));
    },
    render: () => {
      let unmount: (() => void) | null = null;
      return {
        onStart: (suggestion: SuggestionProps<User>) => {
          mentionRenderer = new VueRenderer(MentionList, { props: { ...suggestion, loading: true }, editor: suggestion.editor });
          if (mentionRenderer.element) unmount = suggestion.mount(mentionRenderer.element as HTMLElement);
        },
        onUpdate: (suggestion: SuggestionProps<User>) => mentionRenderer?.updateProps(suggestion),
        onKeyDown: ({ event }: { event: KeyboardEvent }) => {
          if (event.key === "Escape") return false;
          return (mentionRenderer?.ref as { onKeyDown?: (e: KeyboardEvent) => boolean } | null)?.onKeyDown?.(event) ?? false;
        },
        onExit: () => {
          mentionQuery++;
          unmount?.();
          mentionRenderer?.destroy();
          mentionRenderer = null;
        },
      };
    },
  },
});

const imageFiles = (list: FileList | null | undefined) => [...(list ?? [])].filter((file) => file.type.startsWith("image/"));

/** Finds the image node of an upload and replaces its attributes (or removes it). */
function patchUpload(uploadId: string, attrs: Record<string, unknown> | null): void {
  const ed = editor.value;
  if (!ed) return;
  ed.state.doc.descendants((node, pos) => {
    if (node.type.name !== "image" || node.attrs.uploadId !== uploadId) return true;
    const tr = attrs ? ed.state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...attrs }) : ed.state.tr.delete(pos, pos + node.nodeSize);
    ed.view.dispatch(tr.setMeta("addToHistory", false));
    return false;
  });
}

/**
 * Uploads images: each one appears at once (local preview with a progress
 * ring) at the cursor or drop position, then switches to the uploaded file.
 */
async function insertImages(files: File[], position?: number): Promise<void> {
  await Promise.all(
    files.map(async (file) => {
      const uploadId = `up-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const preview = URL.createObjectURL(file);
      const content = { type: "image", attrs: { src: preview, alt: file.name.replace(/\.[^.]+$/, ""), uploadId } };
      const chain = editor.value?.chain().focus();
      (position !== undefined ? chain?.insertContentAt(position, content) : chain?.insertContent(content))?.run();

      uploading.value++;
      try {
        const { url } = await uploadsApi.image(file, (percent) => reportUploadProgress(uploadId, percent));
        // Keep the preview on screen until the real file is ready, so it never flashes.
        await new Promise<void>((resolve) => {
          const probe = new Image();
          probe.onload = probe.onerror = () => resolve();
          probe.src = url;
        });
        patchUpload(uploadId, { src: url, uploadId: null });
      } catch (error) {
        patchUpload(uploadId, null);
        errors.report(error);
      } finally {
        uploading.value--;
        URL.revokeObjectURL(preview);
      }
    }),
  );
}

const editor = useEditor({
  content: model.value,
  extensions: [
    StarterKit.configure({ link: { openOnClick: false, autolink: true, defaultProtocol: "https" }, heading: { levels: [1, 2, 3] } }),
    Placeholder.configure({ placeholder: () => props.placeholder ?? "" }),
    ...(props.images ? [ImageNode] : []),
    ...(props.mentions ? [mention] : []),
  ],
  editorProps: {
    attributes: { class: "pt-prose outline-none" },
    handleKeyDown: (_view, event) => {
      if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
        emit("submit");
        return true;
      }
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        openLink();
        return true;
      }
      return false;
    },
    handlePaste: (_view, event) => {
      const files = props.images ? imageFiles(event.clipboardData?.files) : [];
      if (!files.length) return false;
      void insertImages(files);
      return true;
    },
    handleDrop: (view, event) => {
      const files = props.images ? imageFiles(event.dataTransfer?.files) : [];
      if (!files.length) return false;
      event.preventDefault();
      const position = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos;
      void insertImages(files, position);
      return true;
    },
  },
  onUpdate: ({ editor: e }) => {
    model.value = e.isEmpty ? "" : e.getHTML();
  },
});

watch(model, (value) => {
  if (editor.value && value !== editor.value.getHTML() && !(value === "" && editor.value.isEmpty)) {
    editor.value.commands.setContent(value || "", { emitUpdate: false });
  }
});

/** Ids of the people mentioned in the current content. */
function mentionIds(): number[] {
  const ids = new Set<number>();
  editor.value?.state.doc.descendants((node) => {
    if (node.type.name === "mention" && node.attrs.id != null) ids.add(Number(node.attrs.id));
  });
  return [...ids];
}

function clear(): void {
  editor.value?.commands.clearContent(true);
}

async function openLink(): Promise<void> {
  linkUrl.value = (editor.value?.getAttributes("link").href as string | undefined) ?? "";
  linkOpen.value = true;
  await nextTick();
  linkInput.value?.focus();
}

function applyLink(): void {
  const raw = linkUrl.value.trim();
  const chain = editor.value?.chain().focus().extendMarkRange("link");
  if (!raw) chain?.unsetLink().run();
  else {
    const href = /^(https?:|mailto:|tel:)/i.test(raw) ? raw : `https://${raw}`;
    // With no selection, insert the address itself as the link text.
    if (editor.value?.state.selection.empty && !editor.value.isActive("link")) {
      chain?.insertContent({ type: "text", text: raw, marks: [{ type: "link", attrs: { href } }] }).run();
    } else {
      chain?.setLink({ href }).run();
    }
  }
  linkOpen.value = false;
}

function removeLink(): void {
  editor.value?.chain().focus().extendMarkRange("link").unsetLink().run();
  linkOpen.value = false;
}

function pickImages(event: Event): void {
  const input = event.target as HTMLInputElement;
  void insertImages(imageFiles(input.files));
  input.value = "";
}

type Tool = { icon: Icon; label: string; active: string; run: () => void };
const tools: Tool[] = [
  { icon: TextBoldIcon, label: "Bold", active: "bold", run: () => editor.value?.chain().focus().toggleBold().run() },
  { icon: TextItalicIcon, label: "Italic", active: "italic", run: () => editor.value?.chain().focus().toggleItalic().run() },
  { icon: TextUnderlineIcon, label: "Underline", active: "underline", run: () => editor.value?.chain().focus().toggleUnderline().run() },
  { icon: TextStrikethroughIcon, label: "Strike", active: "strike", run: () => editor.value?.chain().focus().toggleStrike().run() },
  { icon: LeftToRightListBulletIcon, label: "Bullets", active: "bulletList", run: () => editor.value?.chain().focus().toggleBulletList().run() },
  { icon: LeftToRightListNumberIcon, label: "Numbers", active: "orderedList", run: () => editor.value?.chain().focus().toggleOrderedList().run() },
  { icon: QuoteDownIcon, label: "Quote", active: "blockquote", run: () => editor.value?.chain().focus().toggleBlockquote().run() },
];

onBeforeUnmount(() => editor.value?.destroy());

defineExpose({ mentionIds, clear, focus: () => editor.value?.commands.focus() });
</script>

<template>
  <div class="rounded-2xl border border-line bg-surface-2 transition focus-within:border-sky focus-within:bg-surface focus-within:ring-4 focus-within:ring-sky/15">
    <div v-if="editor" class="flex flex-wrap items-center gap-0.5 border-b border-line px-2 py-1.5" :class="compact && 'hidden sm:flex'">
      <button
        v-for="tool in tools"
        :key="tool.label"
        type="button"
        :title="tool.label"
        :aria-label="tool.label"
        :aria-pressed="editor.isActive(tool.active)"
        class="grid size-8 place-items-center rounded-lg text-muted transition hover:bg-surface-3 hover:text-fg"
        :class="editor.isActive(tool.active) && 'bg-surface-3 text-fg'"
        @click="tool.run"
      >
        <PtIcon :icon="tool.icon" :size="16" />
      </button>

      <span class="mx-1 h-5 w-px bg-line" />

      <PtPopover v-model="linkOpen" width="18rem">
        <template #trigger>
          <button
            type="button"
            :title="$t('editor.link')"
            :aria-label="$t('editor.link')"
            :aria-pressed="editor.isActive('link')"
            class="grid size-8 place-items-center rounded-lg text-muted transition hover:bg-surface-3 hover:text-fg"
            :class="editor.isActive('link') && 'bg-surface-3 text-primary'"
            @click="openLink"
          >
            <PtIcon :icon="Link01Icon" :size="16" />
          </button>
        </template>
        <form class="flex flex-col gap-2 p-1" @submit.prevent="applyLink">
          <input ref="linkInput" v-model="linkUrl" type="url" inputmode="url" class="pt-field py-2" placeholder="https://…" dir="ltr" />
          <div class="flex gap-2">
            <button type="submit" class="h-9 flex-1 rounded-full bg-ink text-xs font-semibold text-on-ink">{{ $t("common.apply") }}</button>
            <button
              v-if="editor.isActive('link')"
              type="button"
              class="grid size-9 place-items-center rounded-full border border-line text-danger"
              :aria-label="$t('editor.unlink')"
              @click="removeLink"
            >
              <PtIcon :icon="Unlink01Icon" :size="16" />
            </button>
          </div>
        </form>
      </PtPopover>

      <template v-if="images">
        <button
          type="button"
          :title="$t('editor.image')"
          :aria-label="$t('editor.image')"
          class="grid size-8 place-items-center rounded-lg text-muted transition hover:bg-surface-3 hover:text-fg"
          @click="fileInput?.click()"
        >
          <PtIcon :icon="uploading ? Loading03Icon : Image01Icon" :size="16" :class="uploading && 'animate-spin'" />
        </button>
        <input ref="fileInput" type="file" accept="image/*" multiple class="hidden" @change="pickImages" />
      </template>
      <slot name="toolbar-end" />
    </div>
    <EditorContent :editor="editor" class="px-4 py-3" :style="{ minHeight }" />
  </div>
</template>

<style scoped>
:deep(.ProseMirror) {
  min-height: inherit;
}
:deep(.ProseMirror img.ProseMirror-selectednode) {
  outline: 3px solid var(--pt-sky);
}
</style>
