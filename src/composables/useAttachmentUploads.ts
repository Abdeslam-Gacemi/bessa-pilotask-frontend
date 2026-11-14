import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { attachmentsApi } from "@/api/endpoints";
import { useApiError } from "@/composables/useApiError";
import { useToast } from "@/composables/useToast";
import { useMetaStore } from "@/stores/meta";
import { DEFAULT_UPLOAD_RULES, classify, formatSize, prepareImage, type UploadKind } from "@/services/uploads";
import type { Attachment } from "@/types/models";

export interface UploadItem {
  key: string;
  name: string;
  size: number;
  kind: UploadKind;
  extension: string;
  /** Local preview of a picture while it uploads, or its server preview. */
  preview: string | null;
  progress: number;
  /** queued → preparing (shrinking a photo) → uploading → processing (server) → done | error */
  status: "queued" | "preparing" | "uploading" | "processing" | "done" | "error";
  error?: string;
  attachment?: Attachment;
  /** Already sent with the comment being edited. */
  existing?: boolean;
  file?: File;
  controller?: AbortController;
}

const CONCURRENT = 2;

/**
 * Files of one comment being written: each one uploads at once, with its own
 * progress, cancel and retry, so the comment is sent instantly afterwards.
 */
export function useAttachmentUploads(taskId: () => number) {
  const { t, locale } = useI18n();
  const toast = useToast();
  const errors = useApiError();
  const meta = useMetaStore();
  const rules = computed(() => meta.meta?.uploads ?? DEFAULT_UPLOAD_RULES);
  const items = ref<UploadItem[]>([]);
  let seq = 0;

  const size = (bytes: number) => formatSize(bytes, t("attachments.units").split(","), locale.value);

  function add(files: Iterable<File>): void {
    for (const file of files) {
      if (items.value.length >= rules.value.max_per_comment) {
        toast.error(t("attachments.tooMany", { max: rules.value.max_per_comment }));
        break;
      }
      const checked = classify(file, rules.value);
      if (!checked.ok) {
        toast.error(t(`attachments.errors.${checked.reason}`, { name: file.name, max: checked.max ? size(checked.max) : "" }));
        continue;
      }
      items.value.push({
        key: `up-${++seq}`,
        name: file.name,
        size: file.size,
        kind: checked.kind,
        extension: checked.extension,
        preview: checked.kind === "image" ? URL.createObjectURL(file) : null,
        progress: 0,
        status: "queued",
        file,
      });
    }
    pump();
  }

  /** Starts queued uploads, a couple at a time. */
  function pump(): void {
    const running = items.value.filter((i) => ["preparing", "uploading", "processing"].includes(i.status)).length;
    items.value
      .filter((i) => i.status === "queued")
      .slice(0, Math.max(0, CONCURRENT - running))
      .forEach((item) => void upload(item));
  }

  async function upload(item: UploadItem): Promise<void> {
    if (!item.file) return;
    // Work on the reactive copy, so progress shows.
    const live = items.value.find((i) => i.key === item.key) ?? item;
    live.controller = new AbortController();
    live.error = undefined;
    try {
      live.status = "preparing";
      const file = live.kind === "image" ? await prepareImage(live.file!, rules.value.image_edge) : live.file!;
      live.status = "uploading";
      live.progress = 0;
      const attachment = await attachmentsApi.upload(
        taskId(),
        file,
        (percent) => {
          live.progress = percent;
          if (percent >= 100) live.status = "processing";
        },
        live.controller.signal,
      );
      if (!items.value.includes(live)) {
        void attachmentsApi.remove(attachment.id).catch(() => undefined); // removed meanwhile
        return;
      }
      Object.assign(live, { attachment, status: "done", progress: 100, size: attachment.size, file: undefined });
    } catch (error) {
      if (!items.value.includes(live) || live.controller?.signal.aborted) return;
      live.status = "error";
      live.error = errors.message(error);
    } finally {
      live.controller = undefined;
      pump();
    }
  }

  function remove(item: UploadItem): void {
    const live = items.value.find((i) => i.key === item.key);
    if (!live) return;
    live.controller?.abort();
    items.value = items.value.filter((i) => i.key !== item.key);
    if (live.preview?.startsWith("blob:")) URL.revokeObjectURL(live.preview);
    // A file uploaded for this comment but not sent: delete it now (an existing one goes with the save).
    if (live.attachment && !live.existing) void attachmentsApi.remove(live.attachment.id).catch(() => undefined);
    pump();
  }

  function retry(item: UploadItem): void {
    const live = items.value.find((i) => i.key === item.key);
    if (!live) return;
    live.status = "queued";
    pump();
  }

  /** Files already on a comment, when editing it. */
  function seed(attachments: Attachment[]): void {
    items.value = attachments.map((attachment) => ({
      key: `ex-${attachment.id}`,
      name: attachment.name,
      size: attachment.size,
      kind: attachment.kind,
      extension: attachment.extension,
      preview: attachment.preview_url,
      progress: 100,
      status: "done",
      attachment,
      existing: true,
    }));
  }

  /** After a successful send: the files belong to the comment now. */
  function reset(): void {
    items.value.forEach((i) => i.preview?.startsWith("blob:") && URL.revokeObjectURL(i.preview));
    items.value = [];
  }

  /** Composer closed without sending: drop what was uploaded for nothing. */
  function discard(): void {
    [...items.value].forEach((i) => (i.existing ? undefined : remove(i)));
    reset();
  }

  const busy = computed(() => items.value.some((i) => i.status !== "done" && i.status !== "error"));
  const failed = computed(() => items.value.some((i) => i.status === "error"));
  const ids = computed(() => items.value.flatMap((i) => (i.status === "done" && i.attachment ? [i.attachment.id] : [])));
  /** Overall progress of what is still uploading, 0-100. */
  const progress = computed(() => {
    const active = items.value.filter((i) => i.status !== "done" && i.status !== "error");
    const total = active.reduce((sum, i) => sum + i.size, 0);
    return total ? Math.round(active.reduce((sum, i) => sum + (i.size * i.progress) / 100, 0) / total * 100) : 100;
  });

  return { items, rules, add, remove, retry, seed, reset, discard, busy, failed, ids, progress, size };
}
