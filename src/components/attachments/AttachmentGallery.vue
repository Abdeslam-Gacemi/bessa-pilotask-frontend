<script setup lang="ts">
import { computed, defineAsyncComponent, ref } from "vue";
import { useI18n } from "vue-i18n";
import { Download04Icon, ViewIcon } from "@hugeicons/core-free-icons";
import PtIcon from "@/components/ui/PtIcon.vue";
import FileBadge from "./FileBadge.vue";
import { formatSize } from "@/services/uploads";
import { openAttachment } from "@/services/fileOpen";
import { useApiError } from "@/composables/useApiError";
import type { Attachment } from "@/types/models";

/**
 * Files of a sent comment: pictures as a grid (one large, or up to four tiles
 * with "+N"), documents as cards that open a preview or download.
 */
const props = defineProps<{ attachments: Attachment[] }>();

const AttachmentViewer = defineAsyncComponent(() => import("./AttachmentViewer.vue"));
const { t, locale } = useI18n();
const errors = useApiError();

const images = computed(() => props.attachments.filter((a) => a.kind === "image"));
const files = computed(() => props.attachments.filter((a) => a.kind === "file"));
const shown = computed(() => images.value.slice(0, 4));
const hidden = computed(() => images.value.length - shown.value.length);
const viewable = computed(() => props.attachments.filter((a) => a.opens_inline));

const viewerOpen = ref(false);
const viewerIndex = ref(0);

const size = (bytes: number) => formatSize(bytes, t("attachments.units").split(","), locale.value);

function view(attachment: Attachment): void {
  const index = viewable.value.indexOf(attachment);
  if (index < 0) return void download(attachment);
  viewerIndex.value = index;
  viewerOpen.value = true;
}

async function download(attachment: Attachment): Promise<void> {
  try {
    await openAttachment(attachment, "download");
  } catch (error) {
    errors.report(error);
  }
}

/** A lone picture keeps its shape (within limits), so a screenshot is not cropped. */
const ratio = (a: Attachment) => (a.width && a.height ? Math.min(2, Math.max(0.6, a.width / a.height)) : 4 / 3);
</script>

<template>
  <div v-if="attachments.length" class="mt-2 flex flex-col gap-2">
    <div
      v-if="images.length"
      class="grid max-w-md gap-1 overflow-hidden rounded-2xl"
      :class="shown.length === 1 ? 'grid-cols-1' : 'grid-cols-2'"
    >
      <button
        v-for="(image, i) in shown"
        :key="image.id"
        type="button"
        class="group/img relative overflow-hidden bg-surface-3 outline-offset-[-3px]"
        :class="shown.length === 3 && i === 0 && 'row-span-2'"
        :style="shown.length === 1 ? { aspectRatio: String(ratio(image)), maxHeight: '22rem' } : { aspectRatio: shown.length === 3 && i === 0 ? 'auto' : '1' }"
        :aria-label="`${t('attachments.preview')} : ${image.name}`"
        @click="view(image)"
      >
        <img
          :src="image.preview_url ?? image.url"
          :alt="image.name"
          :width="image.width ?? undefined"
          :height="image.height ?? undefined"
          loading="lazy"
          decoding="async"
          draggable="false"
          class="size-full object-cover transition duration-300 group-hover/img:scale-[1.03]"
        />
        <span v-if="i === shown.length - 1 && hidden > 0" class="absolute inset-0 grid place-items-center bg-black/55 text-2xl font-extrabold text-white backdrop-blur-[2px]">
          +{{ hidden }}
        </span>
      </button>
    </div>

    <ul v-if="files.length" class="grid max-w-md gap-1.5">
      <li v-for="file in files" :key="file.id" class="flex items-center gap-3 rounded-2xl border border-line bg-surface px-3 py-2.5">
        <FileBadge :extension="file.extension" :size="30" />
        <button type="button" class="min-w-0 flex-1 text-start" @click="file.opens_inline ? view(file) : download(file)">
          <span class="block truncate text-[13px] font-semibold hover:underline" :title="file.name">{{ file.name }}</span>
          <span class="block text-xs text-muted tabular-nums">{{ file.extension.toUpperCase() }} · {{ size(file.size) }}</span>
        </button>
        <button
          v-if="file.opens_inline"
          type="button"
          class="grid size-9 shrink-0 place-items-center rounded-xl text-muted transition hover:bg-surface-2 hover:text-ink"
          :aria-label="`${t('attachments.preview')} : ${file.name}`"
          :title="t('attachments.preview')"
          @click="view(file)"
        >
          <PtIcon :icon="ViewIcon" :size="18" />
        </button>
        <button
          type="button"
          class="grid size-9 shrink-0 place-items-center rounded-xl text-muted transition hover:bg-surface-2 hover:text-ink"
          :aria-label="`${t('attachments.download')} : ${file.name}`"
          :title="t('attachments.download')"
          @click="download(file)"
        >
          <PtIcon :icon="Download04Icon" :size="18" />
        </button>
      </li>
    </ul>

    <AttachmentViewer v-if="viewerOpen" v-model:index="viewerIndex" :items="viewable" @close="viewerOpen = false" />
  </div>
</template>
