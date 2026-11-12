<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import {
  ArrowRight01Icon,
  Building03Icon,
  ChartLineData01Icon,
  Activity01Icon,
  ComputerIcon,
  EyeIcon,
  Logout01Icon,
  Moon02Icon,
  Notification03Icon,
  PaintBoardIcon,
  SquareLock02Icon,
  Sun03Icon,
  Tag01Icon,
  TranslateIcon,
  UserMultipleIcon,
} from "@hugeicons/core-free-icons";
import FlagIcon from "@/components/brand/FlagIcon.vue";
import InstallAppCard from "@/components/settings/InstallAppCard.vue";
import PtAvatar from "@/components/ui/PtAvatar.vue";
import PtIcon from "@/components/ui/PtIcon.vue";
import PtSegmented from "@/components/ui/PtSegmented.vue";
import { useConfirm } from "@/composables/useConfirm";
import { stopPush } from "@/services/push";
import { useNotificationsStore } from "@/stores/notifications";
import { usePreferencesStore } from "@/stores/preferences";
import { useSessionStore } from "@/stores/session";
import type { Icon } from "@/plugins/icons";
import type { Locale, ThemePreference } from "@/types/models";

/** Settings hub: theme and language change right here; notifications and security open their own screen. */
const session = useSessionStore();
const prefs = usePreferencesStore();
const inbox = useNotificationsStore();
const router = useRouter();
const { t } = useI18n();

// (Theme and language are saved by the app shell, wherever they change.)
const { confirmAction } = useConfirm();

const themes = computed(() => [
  { value: "light" as ThemePreference, label: t("settings.themes.light"), icon: Sun03Icon },
  { value: "dark" as ThemePreference, label: t("settings.themes.dark"), icon: Moon02Icon },
  { value: "system" as ThemePreference, label: t("settings.themes.system"), icon: ComputerIcon },
]);

const LANGUAGES: { value: Locale; label: string }[] = [
  { value: "fr", label: "Français" },
  { value: "en", label: "English" },
  { value: "ar", label: "العربية" },
];

const sections = computed<{ key: string; icon: Icon; title: string; tone: string; external?: string }[]>(() => [
  { key: "notifications", icon: Notification03Icon, title: t("settings.notifications"), tone: "bg-warning-soft text-warning" },
  { key: "security", icon: SquareLock02Icon, title: t("settings.security"), tone: "bg-danger-soft text-danger" },
  ...(session.seesWorkspace
    ? [{ key: "reports", icon: ChartLineData01Icon, title: t("settings.reportsTitle"), tone: "bg-[#EFE8FD] text-[#6C4FD1] dark:bg-[#2A2340] dark:text-[#B9A6FF]" }]
    : []),
  ...(session.canManage
    ? [
        { key: "users", icon: UserMultipleIcon, title: t("nav.users"), tone: "bg-primary-soft text-primary", external: "/users" },
        { key: "labels", icon: Tag01Icon, title: t("nav.labels"), tone: "bg-success-soft text-success", external: "/labels" },
      ]
    : []),
  ...(session.isSuperAdmin
    ? [
        { key: "access", icon: EyeIcon, title: t("settings.access"), tone: "bg-danger-soft text-danger" },
        { key: "entities", icon: Building03Icon, title: t("nav.entities"), tone: "bg-warning-soft text-warning", external: "/entities" },
        { key: "activity", icon: Activity01Icon, title: t("nav.activity"), tone: "bg-surface-3 text-fg", external: "/activity" },
      ]
    : []),
]);

async function signOut(): Promise<void> {
  // The dialog keeps a spinner on its button until the sign-out is done.
  const done = await confirmAction("logout", undefined, undefined, async () => {
    await stopPush();
    await session.logout();
    inbox.stop();
  });
  if (done) await router.replace({ name: "login" });
}
</script>

<template>
  <div class="mx-auto flex w-full max-w-2xl flex-col gap-6">
    <h1 v-stagger="0" class="text-3xl font-bold">{{ $t("settings.title") }}</h1>

    <div v-if="session.user" v-stagger="1" class="relative overflow-hidden rounded-(--radius-sheet) bg-ink p-5 text-on-ink shadow-float">
      <div class="pointer-events-none absolute -end-12 -top-16 size-48 rounded-full bg-sky/30 blur-3xl" />
      <div class="relative flex items-center gap-4">
        <PtAvatar :name="session.user.name" :src="session.user.avatar_url" :size="60" />
        <div class="min-w-0">
          <p class="truncate text-lg font-bold">{{ session.user.name }}</p>
          <p class="truncate text-sm opacity-70">{{ session.user.email }}</p>
          <span class="mt-1.5 inline-block rounded-full bg-white/12 px-2.5 py-0.5 text-[11px] font-bold">{{ $t(`users.roles.${session.user.role}`) }}</span>
          <span
            v-for="entity in session.user.entities ?? []"
            :key="entity.id"
            class="ms-1.5 mt-1.5 inline-block rounded-full bg-white/12 px-2.5 py-0.5 text-[11px] font-bold"
          >
            {{ entity.name }}
          </span>
        </div>
      </div>
    </div>

    <InstallAppCard v-stagger="2" />

    <section v-stagger="2" class="pt-card flex flex-col gap-3 p-4">
      <h2 class="flex items-center gap-2.5 font-semibold">
        <span class="grid size-9 place-items-center rounded-xl bg-[#EFE8FD] text-[#6C4FD1] dark:bg-[#2A2340] dark:text-[#B9A6FF]">
          <PtIcon :icon="PaintBoardIcon" :size="18" />
        </span>
        {{ $t("settings.theme") }}
      </h2>
      <PtSegmented v-model="prefs.theme" :options="themes" block />
    </section>

    <section v-stagger="3" class="pt-card flex flex-col gap-3 p-4">
      <h2 class="flex items-center gap-2.5 font-semibold">
        <span class="grid size-9 place-items-center rounded-xl bg-success-soft text-success"><PtIcon :icon="TranslateIcon" :size="18" /></span>
        {{ $t("settings.language") }}
      </h2>
      <div class="grid grid-cols-3 gap-2" role="radiogroup" :aria-label="$t('settings.language')">
        <button
          v-for="lang in LANGUAGES"
          :key="lang.value"
          type="button"
          role="radio"
          :aria-checked="prefs.locale === lang.value"
          class="flex flex-col items-center gap-2 rounded-2xl border px-2 py-3 text-sm font-semibold transition active:scale-[0.97]"
          :class="prefs.locale === lang.value ? 'border-ink bg-ink text-on-ink shadow-soft' : 'border-line bg-surface-2 hover:bg-surface-3'"
          @click="prefs.locale = lang.value"
        >
          <FlagIcon :locale="lang.value" :size="30" />
          {{ lang.label }}
        </button>
      </div>
    </section>

    <nav class="pt-card divide-y divide-line/60 overflow-hidden p-1.5">
      <RouterLink
        v-for="(section, i) in sections"
        :key="section.key"
        v-stagger="i + 4"
        :to="section.external ?? `/settings/${section.key}`"
        class="flex items-center gap-3.5 rounded-2xl px-3 py-3.5 transition hover:bg-surface-2 active:scale-[0.99]"
      >
        <span class="grid size-10 place-items-center rounded-2xl" :class="section.tone"><PtIcon :icon="section.icon" :size="20" /></span>
        <span class="flex-1 font-semibold">{{ section.title }}</span>
        <PtIcon :icon="ArrowRight01Icon" :size="18" class="text-subtle rtl:rotate-180" />
      </RouterLink>
    </nav>

    <button
      v-stagger="sections.length + 4"
      type="button"
      class="pt-card flex items-center gap-3.5 px-4.5 py-4 text-start font-semibold text-danger transition hover:bg-danger-soft"
      @click="signOut"
    >
      <span class="grid size-10 place-items-center rounded-2xl bg-danger-soft"><PtIcon :icon="Logout01Icon" :size="20" class="rtl:rotate-180" /></span>
      {{ $t("auth.signOut") }}
    </button>

    <p v-stagger="sections.length + 5" class="text-center text-xs text-subtle">Pilotask · v1.0</p>
  </div>
</template>
