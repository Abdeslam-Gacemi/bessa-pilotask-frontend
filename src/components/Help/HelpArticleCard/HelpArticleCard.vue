<script setup lang="ts">
import { ref } from "vue";
import { Alert02Icon, Idea01Icon, Link01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import HelpText from "./HelpText.vue";
import PtIcon from "@/components/ui/PtIcon.vue";
import type { HelpArticle } from "@/help/types";

/** One help article: title with its audience and a copy-link button, then paragraphs, steps, lists and callouts. */
defineProps<{ article: HelpArticle; query?: string }>();

const copied = ref(false);

async function copyLink(id: string): Promise<void> {
  const url = `${location.origin}${location.pathname}#${id}`;
  try {
    await navigator.clipboard.writeText(url);
  } catch {
    history.replaceState(history.state, "", `#${id}`);
  }
  copied.value = true;
  setTimeout(() => (copied.value = false), 1600);
}
</script>

<template>
  <article :id="article.id" class="group scroll-mt-36 py-5 first:pt-1 last:pb-1 md:scroll-mt-24 lg:scroll-mt-6" :data-help-article="article.id">
    <header class="mb-2.5 flex flex-wrap items-center gap-2">
      <h3 class="text-base font-bold">
        <HelpText :text="article.title" :query="query" />
      </h3>
      <span v-if="article.audience" class="rounded-full bg-surface-3 px-2 py-0.5 text-[11px] font-semibold text-muted">
        {{ $t(`help.audience.${article.audience}`) }}
      </span>
      <button
        type="button"
        class="ms-auto grid size-7 place-items-center rounded-lg text-subtle opacity-0 transition group-hover:opacity-100 hover:bg-surface-3 hover:text-fg focus-visible:opacity-100 max-md:opacity-100"
        :aria-label="$t('help.copyLink')"
        :title="copied ? $t('help.copied') : $t('help.copyLink')"
        @click="copyLink(article.id)"
      >
        <PtIcon :icon="copied ? Tick02Icon : Link01Icon" :size="15" :class="copied && 'text-success'" />
      </button>
    </header>

    <div class="flex flex-col gap-3 text-sm leading-relaxed text-muted">
      <template v-for="(block, i) in article.blocks" :key="i">
        <p v-if="block.type === 'p'"><HelpText :text="block.text" :query="query" /></p>

        <ol v-else-if="block.type === 'steps'" class="flex flex-col gap-2">
          <li v-for="(item, n) in block.items" :key="n" class="flex gap-3">
            <span class="grid size-6 shrink-0 place-items-center rounded-full bg-ink text-[11px] font-bold text-on-ink tabular-nums">{{ n + 1 }}</span>
            <span class="pt-0.5"><HelpText :text="item" :query="query" /></span>
          </li>
        </ol>

        <ul v-else-if="block.type === 'list'" class="flex flex-col gap-1.5">
          <li v-for="(item, n) in block.items" :key="n" class="flex gap-2.5">
            <span class="mt-2 size-1.5 shrink-0 rounded-full bg-subtle" />
            <span><HelpText :text="item" :query="query" /></span>
          </li>
        </ul>

        <p
          v-else
          class="flex gap-2.5 rounded-2xl p-3"
          :class="block.type === 'tip' ? 'bg-primary-soft text-fg' : 'bg-warning-soft text-fg'"
          :role="block.type === 'warning' ? 'note' : undefined"
        >
          <PtIcon :icon="block.type === 'tip' ? Idea01Icon : Alert02Icon" :size="17" class="mt-0.5 shrink-0" :class="block.type === 'tip' ? 'text-primary' : 'text-warning'" />
          <span><HelpText :text="block.text" :query="query" /></span>
        </p>
      </template>
    </div>
  </article>
</template>
