<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, shallowRef, watch } from "vue";
import { useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import { refDebounced, useEventListener, useLocalStorage } from "@vueuse/core";
import {
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowUp01Icon,
  Cancel01Icon,
  CustomerSupportIcon,
  LeftToRightListBulletIcon,
  Search01Icon,
  SidebarLeft01Icon,
} from "@hugeicons/core-free-icons";
import HelpArticleCard from "@/components/help/HelpArticleCard.vue";
import HelpIndexList from "@/components/help/HelpIndexList.vue";
import { HELP_ICONS } from "@/components/help/helpIcons";
import PtEmpty from "@/components/ui/PtEmpty.vue";
import PtIcon from "@/components/ui/PtIcon.vue";
import PtIconButton from "@/components/ui/PtIconButton.vue";
import PtSkeleton from "@/components/ui/PtSkeleton.vue";
import { articleCount, forReader, loadHelp, searchHelp, type HelpReader } from "@/help";
import { useSessionStore } from "@/stores/session";
import type { HelpContent } from "@/help/types";
import type { Locale } from "@/types/models";

/**
 * The user guide, in the reader's language and for their role. A search
 * narrows it to matching articles; the index follows the reading
 * (scroll-spy), folds to a rail on large screens and to a bar on phones;
 * every article has a shareable link.
 */
const { locale } = useI18n();
const route = useRoute();
const session = useSessionStore();

const content = shallowRef<HelpContent | null>(null);
const query = ref(typeof route.query.q === "string" ? route.query.q : "");
const debounced = refDebounced(query, 150);

// ── Role: each reader sees the articles for their role; "show everything" lifts the filter.
const reader = computed<HelpReader>(() => ({
  managers: session.canManage,
  superAdmin: session.isSuperAdmin,
  projectManagers: session.canCreate,
  workspace: session.seesWorkspace,
  overview: session.hasOverview,
}));
// Only the reader's role is shown; a shared link to another role's article widens it for this visit.
const showAll = ref(false);
const mine = computed(() => (content.value ? forReader(content.value, reader.value) : []));
const sections = computed(() => searchHelp(showAll.value ? (content.value ?? []) : mine.value, debounced.value));
const matches = computed(() => articleCount(sections.value));

const collapsed = useLocalStorage("pt.help.indexCollapsed", false);
const mobileOpen = ref(false);
const activeArticle = ref<string | null>(null);
const activeSection = computed(() => sections.value.find((s) => s.articles.some((a) => a.id === activeArticle.value))?.id ?? sections.value[0]?.id ?? null);
const activeSectionTitle = computed(() => sections.value.find((s) => s.id === activeSection.value)?.title ?? "");
const search = ref<HTMLInputElement | null>(null);
const showTop = ref(false);

const scroller = () => document.getElementById("pt-content-scroll");
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

watch(
  locale,
  async (value) => {
    content.value = await loadHelp(value as Locale);
    await nextTick();
    observe();
  },
  { immediate: true },
);

/** Scrolls to a section or article, and keeps its link in the address bar (without a router navigation, which would scroll to the top). */
function go(id: string, smooth = true): void {
  mobileOpen.value = false;
  const target = document.getElementById(id);
  if (!target) return;
  target.scrollIntoView({ behavior: smooth && !reducedMotion() ? "smooth" : "auto", block: "start" });
  history.replaceState(history.state, "", `#${id}`);
  activeArticle.value = target.dataset.helpArticle ?? target.querySelector<HTMLElement>("[data-help-article]")?.dataset.helpArticle ?? null;
  // The smooth scroll crosses other articles: keep the index on the chosen one meanwhile.
  spyPausedUntil = Date.now() + 900;
}

function toTop(): void {
  scroller()?.scrollTo({ top: 0, behavior: reducedMotion() ? "auto" : "smooth" });
}

// ── Scroll-spy: the article crossing the upper part of the screen is the one being read.
let observer: IntersectionObserver | null = null;
let spyPausedUntil = 0;
const visible = new Set<string>();

function observe(): void {
  observer?.disconnect();
  visible.clear();
  const root = scroller();
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const id = (entry.target as HTMLElement).dataset.helpArticle!;
        if (entry.isIntersecting) visible.add(id);
        else visible.delete(id);
      }
      if (Date.now() < spyPausedUntil) return;
      const order = sections.value.flatMap((s) => s.articles.map((a) => a.id));
      const first = order.find((id) => visible.has(id));
      if (first) activeArticle.value = first;
    },
    { root, rootMargin: "-12% 0px -65% 0px" },
  );
  document.querySelectorAll<HTMLElement>("[data-help-article]").forEach((el) => observer!.observe(el));
}

watch(sections, async () => {
  await nextTick();
  observe();
});

onMounted(async () => {
  // Opened from a shared link: go to that article once the content is there.
  const hash = route.hash.slice(1);
  if (hash) {
    const stop = watch(
      content,
      async (value) => {
        if (!value) return;
        const id = decodeURIComponent(hash);
        // A link to an article of another role still opens it.
        if (!mine.value.some((s) => s.id === id || s.articles.some((a) => a.id === id)) && value.some((s) => s.id === id || s.articles.some((a) => a.id === id))) {
          showAll.value = true;
        }
        // Once the (possibly widened) list is rendered; land on it, no long scroll on arrival.
        await nextTick();
        go(id, false);
        stop();
      },
      { immediate: true },
    );
  }
});
onUnmounted(() => observer?.disconnect());

useEventListener(() => scroller(), "scroll", () => (showTop.value = (scroller()?.scrollTop ?? 0) > 600), { passive: true });
// "/" jumps to the search box, Escape clears it.
useEventListener(window, "keydown", (event: KeyboardEvent) => {
  const typing = event.target instanceof HTMLElement && (event.target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName));
  if (event.key === "/" && !typing) {
    event.preventDefault();
    search.value?.focus();
  } else if (event.key === "Escape" && event.target === search.value && query.value) {
    query.value = "";
  }
});
</script>

<template>
  <div class="mx-auto flex w-full max-w-6xl flex-col gap-6">
    <RouterLink to="/settings" class="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-muted transition hover:text-fg">
      <PtIcon :icon="ArrowLeft01Icon" :size="16" class="rtl:rotate-180" />
      {{ $t("nav.settings") }}
    </RouterLink>

    <!-- Hero: title and search -->
    <header class="relative overflow-hidden rounded-(--radius-sheet) bg-ink p-6 text-on-ink shadow-float md:p-8">
      <div class="pointer-events-none absolute -end-16 -top-20 size-64 rounded-full bg-sky/30 blur-3xl" />
      <div class="relative max-w-2xl">
        <h1 class="text-3xl font-bold md:text-4xl">{{ $t("help.title") }}</h1>
        <p class="mt-2 text-sm opacity-75 md:text-base">{{ $t("help.subtitle") }}</p>
        <label class="relative mt-5 block">
          <span class="sr-only">{{ $t("help.search") }}</span>
          <PtIcon :icon="Search01Icon" :size="18" class="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-subtle" />
          <input
            ref="search"
            v-model="query"
            type="search"
            class="w-full rounded-2xl border-0 bg-surface py-3.5 [&::-webkit-search-cancel-button]:hidden ps-11 pe-20 text-sm text-fg shadow-soft outline-none placeholder:text-subtle focus:ring-4 focus:ring-sky/30"
            :placeholder="$t('help.searchPlaceholder')"
            enterkeyhint="search"
          />
          <button
            v-if="query"
            type="button"
            class="absolute end-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-muted hover:bg-surface-3 hover:text-fg"
            :aria-label="$t('help.clear')"
            @click="query = ''"
          >
            <PtIcon :icon="Cancel01Icon" :size="16" />
          </button>
          <kbd v-else class="pointer-events-none absolute end-4 top-1/2 hidden -translate-y-1/2 rounded-md border border-line px-1.5 text-xs text-subtle md:block">/</kbd>
        </label>
        <p v-if="debounced && content" class="mt-2 text-xs opacity-75" aria-live="polite">{{ $t("help.results", matches) }}</p>
      </div>
    </header>

    <!-- Loading -->
    <div v-if="!content" class="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
      <PtSkeleton class="hidden h-96 rounded-card lg:block" />
      <div class="flex flex-col gap-4"><PtSkeleton v-for="i in 3" :key="i" class="h-48 rounded-card" /></div>
    </div>

    <PtEmpty v-else-if="!sections.length" :icon="Search01Icon" :title="$t('help.noResults')" :hint="$t('help.noResultsHint')" />

    <div v-else class="grid items-start gap-6" :class="collapsed ? 'lg:grid-cols-[3.5rem_minmax(0,1fr)]' : 'lg:grid-cols-[17rem_minmax(0,1fr)]'">
      <!-- Index, large screens: sticky, folds to a rail of section icons -->
      <aside class="sticky top-4 hidden max-h-[calc(100dvh-2rem)] flex-col rounded-card border border-line bg-surface/80 p-2 backdrop-blur lg:flex" :aria-label="$t('help.index')">
        <div class="flex items-center gap-2 px-1 pb-2" :class="collapsed && 'justify-center'">
          <span v-if="!collapsed" class="pt-label flex-1 ps-1">{{ $t("help.index") }}</span>
          <PtIconButton
            :icon="SidebarLeft01Icon"
            :size="17"
            class="rtl:-scale-x-100"
            :label="collapsed ? $t('help.expandIndex') : $t('help.collapseIndex')"
            :aria-expanded="!collapsed"
            @click="collapsed = !collapsed"
          />
        </div>
        <nav v-if="collapsed" class="flex flex-col items-center gap-1">
          <button
            v-for="section in sections"
            :key="section.id"
            type="button"
            class="grid size-10 place-items-center rounded-xl transition"
            :class="activeSection === section.id ? 'bg-surface-3' : 'hover:bg-surface-2'"
            :title="section.title"
            :aria-label="section.title"
            :aria-current="activeSection === section.id ? 'location' : undefined"
            @click="go(section.id)"
          >
            <span class="grid size-7 place-items-center rounded-lg" :class="HELP_ICONS[section.icon].tone"><PtIcon :icon="HELP_ICONS[section.icon].icon" :size="15" /></span>
          </button>
        </nav>
        <nav v-else class="pt-scroll-y -mx-1 min-h-0 flex-1 px-1">
          <HelpIndexList :sections="sections" :active-section="activeSection" :active-article="activeArticle" @go="go" />
        </nav>
      </aside>

      <div class="flex min-w-0 flex-col gap-6">
        <!-- Index, phones and tablets: a sticky bar naming where you are, opening the full list -->
        <div class="sticky top-[calc(env(safe-area-inset-top)+3.75rem)] z-20 -mt-2 md:top-3 lg:hidden">
          <button
            type="button"
            class="flex w-full items-center gap-3 rounded-2xl border border-line bg-surface/90 px-4 py-3 text-start shadow-soft backdrop-blur"
            :aria-expanded="mobileOpen"
            aria-controls="help-mobile-index"
            @click="mobileOpen = !mobileOpen"
          >
            <PtIcon :icon="LeftToRightListBulletIcon" :size="18" class="text-muted rtl:-scale-x-100" />
            <span class="min-w-0 flex-1">
              <span class="block text-[11px] font-semibold text-muted">{{ $t("help.index") }}</span>
              <span class="block truncate text-sm font-semibold">{{ activeSectionTitle }}</span>
            </span>
            <PtIcon :icon="ArrowDown01Icon" :size="16" class="transition" :class="mobileOpen && 'rotate-180'" />
          </button>
          <Transition
            enter-active-class="transition duration-150 ease-out"
            leave-active-class="transition duration-100"
            enter-from-class="opacity-0 -translate-y-1"
            leave-to-class="opacity-0"
          >
            <nav
              v-if="mobileOpen"
              id="help-mobile-index"
              class="pt-scroll-y absolute inset-x-0 top-full mt-2 max-h-[60dvh] rounded-2xl border border-line bg-surface p-2 shadow-float"
              :aria-label="$t('help.index')"
            >
              <HelpIndexList :sections="sections" :active-section="activeSection" :active-article="activeArticle" compact @go="go" />
            </nav>
          </Transition>
        </div>

        <section v-for="(section, i) in sections" :id="section.id" :key="section.id" v-stagger="i" class="scroll-mt-36 md:scroll-mt-24 lg:scroll-mt-4">
          <div class="mb-3 flex items-center gap-3">
            <span class="grid size-10 shrink-0 place-items-center rounded-2xl" :class="HELP_ICONS[section.icon].tone">
              <PtIcon :icon="HELP_ICONS[section.icon].icon" :size="20" />
            </span>
            <div class="min-w-0">
              <h2 class="text-xl font-bold">{{ section.title }}</h2>
              <p class="text-sm text-muted">{{ section.summary }}</p>
            </div>
          </div>
          <div class="pt-card divide-y divide-line/70 px-5 py-2 md:px-6">
            <HelpArticleCard v-for="article in section.articles" :key="article.id" :article="article" :query="debounced" />
          </div>
        </section>

        <aside class="pt-card flex items-center gap-4 p-5">
          <span class="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary"><PtIcon :icon="CustomerSupportIcon" :size="22" /></span>
          <div>
            <p class="font-semibold">{{ $t("help.stillStuck") }}</p>
            <p class="text-sm text-muted">{{ $t("help.stillStuckHint") }}</p>
          </div>
        </aside>
      </div>
    </div>

    <Transition enter-active-class="transition duration-200" leave-active-class="transition duration-150" enter-from-class="opacity-0 translate-y-2" leave-to-class="opacity-0 translate-y-2">
      <button
        v-if="showTop"
        type="button"
        class="fixed end-5 bottom-28 z-30 grid size-11 place-items-center rounded-full bg-ink text-on-ink shadow-float md:bottom-6"
        :aria-label="$t('help.backToTop')"
        @click="toTop"
      >
        <PtIcon :icon="ArrowUp01Icon" :size="18" />
      </button>
    </Transition>
  </div>
</template>
