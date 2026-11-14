<script setup lang="ts">
import { AlertCircleIcon, Cancel01Icon, RefreshIcon } from "@hugeicons/core-free-icons";
import PtIcon from "@/components/ui/PtIcon.vue";
import FileBadge from "./FileBadge.vue";
import type { UploadItem } from "@/composables/useAttachmentUploads";

/**
 * Files of the comment being written. Pictures as thumbnails with a progress
 * ring, documents as cards with a progress bar; each can be removed or retried.
 */
defineProps<{ items: UploadItem[]; size: (bytes: number) => string }>();
defineEmits<{ remove: [item: UploadItem]; retry: [item: UploadItem] }>();

const RING = 2 * Math.PI * 15;
const working = (item: UploadItem) => item.status !== "done" && item.status !== "error";
</script>

<template>
  <TransitionGroup
    v-if="items.length"
    tag="ul"
    class="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 py-1 sm:flex-wrap sm:overflow-visible"
    enter-active-class="transition duration-200"
    enter-from-class="opacity-0 scale-95"
    leave-active-class="transition duration-150"
    leave-to-class="opacity-0 scale-95"
    :aria-label="$t('attachments.title')"
  >
    <li v-for="item in items" :key="item.key" class="relative shrink-0 snap-start">
      <!-- Picture -->
      <div
        v-if="item.kind === 'image'"
        class="relative size-[72px] overflow-hidden rounded-2xl border border-line bg-surface-3"
        :class="item.status === 'error' && 'border-danger/60'"
        :title="item.error ?? item.name"
      >
        <img v-if="item.preview" :src="item.preview" :alt="item.name" class="size-full object-cover" :class="working(item) && 'opacity-60'" draggable="false" />
        <div v-if="working(item)" class="absolute inset-0 grid place-items-center bg-black/25">
          <svg width="38" height="38" viewBox="0 0 38 38" :class="item.status !== 'uploading' && 'animate-spin'" role="progressbar" :aria-valuenow="Math.round(item.progress)" aria-valuemin="0" aria-valuemax="100">
            <circle cx="19" cy="19" r="15" fill="none" stroke="white" stroke-opacity=".35" stroke-width="3.5" />
            <circle
              cx="19"
              cy="19"
              r="15"
              fill="none"
              stroke="white"
              stroke-width="3.5"
              stroke-linecap="round"
              :stroke-dasharray="RING"
              :stroke-dashoffset="item.status === 'uploading' ? RING * (1 - item.progress / 100) : RING * 0.72"
              transform="rotate(-90 19 19)"
              class="transition-[stroke-dashoffset] duration-200"
            />
          </svg>
        </div>
        <button
          v-if="item.status === 'error'"
          type="button"
          class="absolute inset-0 grid place-items-center bg-danger/70 text-white"
          :aria-label="`${$t('attachments.retry')} : ${item.name}`"
          @click="$emit('retry', item)"
        >
          <PtIcon :icon="RefreshIcon" :size="20" />
        </button>
      </div>

      <!-- Document -->
      <div
        v-else
        class="relative flex h-[72px] w-60 items-center gap-2.5 overflow-hidden rounded-2xl border border-line bg-surface px-3 pe-8"
        :class="item.status === 'error' && 'border-danger/60 bg-danger-soft/40'"
      >
        <FileBadge :extension="item.extension" :size="30" />
        <div class="min-w-0 flex-1">
          <p class="truncate text-[13px] font-semibold" :title="item.name">{{ item.name }}</p>
          <p v-if="item.status === 'error'" class="flex items-center gap-1 truncate text-xs font-semibold text-danger" :title="item.error">
            <PtIcon :icon="AlertCircleIcon" :size="13" class="shrink-0" />{{ item.error }}
          </p>
          <p v-else class="truncate text-xs text-muted tabular-nums">
            {{ size(item.size) }}
            <template v-if="item.status === 'uploading'"> · {{ Math.round(item.progress) }} %</template>
            <template v-else-if="item.status === 'processing' || item.status === 'preparing'"> · {{ $t("attachments.processing") }}</template>
            <template v-else-if="item.status === 'queued'"> · {{ $t("attachments.waiting") }}</template>
          </p>
          <button v-if="item.status === 'error'" type="button" class="mt-0.5 text-xs font-bold text-primary underline-offset-2 hover:underline" @click="$emit('retry', item)">
            {{ $t("attachments.retry") }}
          </button>
        </div>
        <span v-if="working(item)" class="absolute inset-x-0 bottom-0 h-1 bg-surface-3" role="progressbar" :aria-valuenow="Math.round(item.progress)" aria-valuemin="0" aria-valuemax="100">
          <span
            class="block h-full rounded-e-full bg-primary transition-[width] duration-200"
            :class="item.status !== 'uploading' && 'pt-bar-loading'"
            :style="{ width: `${item.status === 'uploading' ? item.progress : 100}%` }"
          />
        </span>
      </div>

      <button
        type="button"
        class="absolute -end-1.5 -top-1.5 grid size-6 place-items-center rounded-full bg-ink text-on-ink shadow-soft ring-2 ring-surface transition hover:scale-110 active:scale-95"
        :aria-label="`${$t('attachments.remove')} : ${item.name}`"
        @click="$emit('remove', item)"
      >
        <PtIcon :icon="Cancel01Icon" :size="13" :stroke="2.5" />
      </button>
    </li>
  </TransitionGroup>
</template>
