<script setup lang="ts">
import { ref, watch } from "vue";
import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { HELP_ICONS } from "./helpIcons";
import PtIcon from "@/components/ui/PtIcon.vue";
import type { HelpSection } from "@/help/types";

/**
 * The table of contents: sections fold open to their articles. The section
 * being read opens by itself and its article is marked (aria-current), so
 * the index always says where you are.
 */
const props = defineProps<{ sections: HelpSection[]; activeSection: string | null; activeArticle: string | null; compact?: boolean }>();
const emit = defineEmits<{ go: [id: string] }>();

const open = ref<Set<string>>(new Set());
watch(
  () => props.activeSection,
  (id) => {
    if (id && !open.value.has(id)) open.value = new Set([...open.value, id]);
  },
  { immediate: true },
);

function toggle(id: string): void {
  const next = new Set(open.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  open.value = next;
}
</script>

<template>
  <ul class="flex flex-col gap-0.5">
    <li v-for="section in sections" :key="section.id">
      <div class="flex items-center rounded-xl transition" :class="activeSection === section.id ? 'bg-surface-3' : 'hover:bg-surface-2'">
        <button
          type="button"
          class="flex min-w-0 flex-1 items-center gap-2.5 py-2 ps-2 text-start text-sm font-semibold"
          :aria-current="activeSection === section.id ? 'location' : undefined"
          @click="emit('go', section.id)"
        >
          <span class="grid size-7 shrink-0 place-items-center rounded-lg" :class="HELP_ICONS[section.icon].tone">
            <PtIcon :icon="HELP_ICONS[section.icon].icon" :size="15" />
          </span>
          <span class="truncate">{{ section.title }}</span>
        </button>
        <button
          type="button"
          class="me-1 grid size-7 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-surface hover:text-fg"
          :aria-label="section.title"
          :aria-expanded="open.has(section.id)"
          @click="toggle(section.id)"
        >
          <PtIcon :icon="ArrowDown01Icon" :size="14" class="transition duration-200" :class="!open.has(section.id) && '-rotate-90 rtl:rotate-90'" />
        </button>
      </div>
      <ul v-show="open.has(section.id)" class="ms-[1.375rem] mt-0.5 mb-1.5 flex flex-col border-s border-line ps-2" :class="compact && 'mb-1'">
        <li v-for="article in section.articles" :key="article.id">
          <button
            type="button"
            class="relative w-full rounded-lg px-3 py-1.5 text-start text-[13px] transition"
            :class="activeArticle === article.id ? 'font-semibold text-fg' : 'text-muted hover:bg-surface-2 hover:text-fg'"
            :aria-current="activeArticle === article.id ? 'location' : undefined"
            @click="emit('go', article.id)"
          >
            <span v-if="activeArticle === article.id" class="absolute inset-y-1.5 -start-[9px] w-0.5 rounded-full bg-sky" />
            {{ article.title }}
          </button>
        </li>
      </ul>
    </li>
  </ul>
</template>
