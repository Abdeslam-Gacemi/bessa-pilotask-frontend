<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { onKeyStroke, useSwipe } from "@vueuse/core";
import { Capacitor } from "@capacitor/core";
import { ArrowLeft01Icon, ArrowRight01Icon, Cancel01Icon, Download04Icon, LinkSquare02Icon, Share08Icon } from "@hugeicons/core-free-icons";
import PtIcon from "@/components/ui/PtIcon.vue";
import FileBadge from "./FileBadge.vue";
import { openAttachment } from "@/services/fileOpen";
import { useApiError } from "@/composables/useApiError";
import { useOverlay } from "@/composables/useOverlay";
import type { Attachment } from "@/types/models";

/**
 * Full-screen viewer for pictures and PDFs: arrows / swipe to move, Esc or
 * Back to close. PDFs show in the page on desktop; phones hand them to the
 * system viewer, which does it better.
 */
const props = defineProps<{ items: Attachment[] }>();
const index = defineModel<number>("index", { required: true });
const emit = defineEmits<{ close: [] }>();

const { t } = useI18n();
const errors = useApiError();
const open = ref(true);
const { zIndex } = useOverlay(open, () => emit("close"));
const native = Capacitor.isNativePlatform();
const narrow = window.matchMedia("(max-width: 767px)").matches;

const current = computed(() => props.items[index.value]);
const many = computed(() => props.items.length > 1);
const inlinePdf = computed(() => current.value?.extension === "pdf" && !native && !narrow);
const loaded = ref(false);
watch(current, () => (loaded.value = false));

function go(step: number): void {
  if (!many.value) return;
  index.value = (index.value + step + props.items.length) % props.items.length;
}

const rtl = () => document.documentElement.dir === "rtl";
onKeyStroke("Escape", () => emit("close"));
onKeyStroke("ArrowRight", () => go(rtl() ? -1 : 1));
onKeyStroke("ArrowLeft", () => go(rtl() ? 1 : -1));

const stage = ref<HTMLElement | null>(null);
const { direction, lengthX } = useSwipe(stage, {
  threshold: 40,
  onSwipeEnd: () => {
    if (Math.abs(lengthX.value) < 60) return;
    const forward = direction.value === "left";
    go(forward !== rtl() ? 1 : -1);
  },
});

// Preload neighbours, so moving is instant.
watch(
  index,
  () => {
    for (const step of [1, -1]) {
      const next = props.items[(index.value + step + props.items.length) % props.items.length];
      if (next?.kind === "image") new Image().src = next.url;
    }
  },
  { immediate: true },
);

const closeButton = ref<HTMLButtonElement | null>(null);
onMounted(() => nextTick(() => closeButton.value?.focus()));

async function act(mode: "view" | "download"): Promise<void> {
  if (!current.value) return;
  try {
    await openAttachment(current.value, mode);
  } catch (error) {
    errors.report(error);
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 flex flex-col bg-black/92 text-white backdrop-blur-sm"
      :style="{ zIndex: zIndex + 1 }"
      role="dialog"
      aria-modal="true"
      :aria-label="current?.name"
    >
      <header class="flex items-center gap-2 px-3 pt-[max(.75rem,env(safe-area-inset-top))] pb-2">
        <button ref="closeButton" type="button" class="grid size-11 place-items-center rounded-full hover:bg-white/10" :aria-label="t('attachments.close')" @click="emit('close')">
          <PtIcon :icon="Cancel01Icon" :size="22" />
        </button>
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-bold">{{ current?.name }}</p>
          <p v-if="many" class="text-xs text-white/60 tabular-nums">{{ t("attachments.of", { index: index + 1, total: items.length }) }}</p>
        </div>
        <button
          v-if="current?.extension === 'pdf' && !native"
          type="button"
          class="grid size-11 place-items-center rounded-full hover:bg-white/10"
          :aria-label="t('attachments.open')"
          :title="t('attachments.open')"
          @click="act('view')"
        >
          <PtIcon :icon="LinkSquare02Icon" :size="20" />
        </button>
        <button
          type="button"
          class="grid size-11 place-items-center rounded-full hover:bg-white/10"
          :aria-label="native ? t('attachments.share') : t('attachments.download')"
          :title="native ? t('attachments.share') : t('attachments.download')"
          @click="act('download')"
        >
          <PtIcon :icon="native ? Share08Icon : Download04Icon" :size="20" />
        </button>
      </header>

      <div ref="stage" class="relative flex min-h-0 flex-1 items-center justify-center px-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <template v-if="current">
          <template v-if="current.kind === 'image'">
          <img
            :key="current.id"
            :src="current.url"
            :alt="current.name"
            class="max-h-full max-w-full select-none object-contain transition-opacity duration-200"
            :class="loaded ? 'opacity-100' : 'opacity-0'"
            draggable="false"
            @load="loaded = true"
          />
          <span v-if="!loaded" class="absolute size-10 animate-spin rounded-full border-4 border-white/25 border-t-white" />
          </template>

          <iframe
            v-else-if="inlinePdf"
            :key="current.id"
            :src="current.url"
            :title="current.name"
            class="size-full max-w-5xl rounded-xl bg-white"
            referrerpolicy="no-referrer"
          />

          <div v-else class="flex flex-col items-center gap-4 text-center">
            <FileBadge :extension="current.extension" :size="72" />
            <p class="max-w-xs text-sm font-semibold">{{ current.name }}</p>
            <button type="button" class="rounded-full bg-white px-5 py-2.5 text-sm font-bold text-black" @click="act('download')">
              {{ native ? t("attachments.openWith") : t("attachments.download") }}
            </button>
          </div>
        </template>

        <template v-if="many">
          <button
            type="button"
            class="absolute start-3 top-1/2 hidden size-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 hover:bg-white/20 md:grid"
            :aria-label="t('attachments.previous')"
            @click="go(-1)"
          >
            <PtIcon :icon="ArrowLeft01Icon" :size="24" class="rtl:-scale-x-100" />
          </button>
          <button
            type="button"
            class="absolute end-3 top-1/2 hidden size-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 hover:bg-white/20 md:grid"
            :aria-label="t('attachments.next')"
            @click="go(1)"
          >
            <PtIcon :icon="ArrowRight01Icon" :size="24" class="rtl:-scale-x-100" />
          </button>
        </template>
      </div>
    </div>
  </Teleport>
</template>
