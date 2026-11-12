<script setup lang="ts">
import { breakpointsTailwind, useBreakpoints } from "@vueuse/core";
import { Calendar03Icon, CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import AppLogo from "@/components/brand/AppLogo.vue";
import LocaleSwitch from "@/components/brand/LocaleSwitch.vue";
import LoginForm from "@/components/auth/LoginForm.vue";
import PtAvatarStack from "@/components/ui/PtAvatarStack.vue";
import PtIcon from "@/components/ui/PtIcon.vue";
import PtProgress from "@/components/ui/PtProgress.vue";
import PtRing from "@/components/ui/PtRing.vue";

// One layout is rendered at a time, so the form (and its field ids) exists once.
const isDesktop = useBreakpoints(breakpointsTailwind).greaterOrEqual("lg");

// Decorative people for the showcase cards.
const crew = [
  { id: 1, name: "Amina Kaci", avatar_url: null },
  { id: 2, name: "Yacine Bessa", avatar_url: null },
  { id: 3, name: "Lina Haddad", avatar_url: null },
  { id: 4, name: "Karim Mansouri", avatar_url: null },
];
</script>

<template>
  <!-- Phones: dark brand hero with floating cards, the form rises over it like a sheet. -->
  <!-- Fixed to the screen (no page scroll); the hero gives up space first when the keyboard opens. -->
  <div v-if="!isDesktop" class="fixed inset-0 flex flex-col overflow-hidden overscroll-none bg-[#0E1318]">
    <section class="pt-safe-top relative isolate flex min-h-0 flex-1 flex-col justify-between overflow-hidden px-5 pb-14 text-white">
      <div class="pointer-events-none absolute -start-20 -top-24 -z-10 size-80 rounded-full bg-[#53AEFF]/35 blur-3xl" />
      <div class="pointer-events-none absolute -end-24 top-24 -z-10 size-72 rounded-full bg-[#E04047]/25 blur-3xl" />
      <div class="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(rgb(255_255_255/0.07)_1px,transparent_1px)] bg-size-[20px_20px]" />

      <header v-stagger="0" class="flex shrink-0 items-center justify-between pt-4">
        <img src="/brand/pilotask-logo-light.svg" alt="Pilotask" class="h-7 w-auto" />
        <LocaleSwitch />
      </header>

      <!-- Showcase -->
      <div class="relative mx-auto my-5 h-56 w-full max-w-sm shrink-0 [@media(max-height:760px)]:hidden" aria-hidden="true">
        <div class="pt-float absolute start-0 top-12 w-[58%] rounded-3xl bg-white p-3.5 text-[#171E23] shadow-2xl" style="--pt-tilt: -5deg">
          <div class="flex gap-1.5">
            <span class="rounded-full bg-[#FBE6E7] px-2 py-0.5 text-[10px] font-bold text-[#E04047]">● {{ $t("priority.urgent") }}</span>
            <span class="rounded-full bg-[#E3EEF8] px-2 py-0.5 text-[10px] font-bold text-[#326899]">Design</span>
          </div>
          <p class="mt-2 text-sm leading-snug font-bold">{{ $t("auth.demoTask") }}</p>
          <div class="mt-3 flex items-center justify-between">
            <span class="inline-flex items-center gap-1 rounded-full bg-[#FCEFDC] px-2 py-0.5 text-[10px] font-bold text-[#E8962E]">
              <PtIcon :icon="Calendar03Icon" :size="11" />{{ $t("dates.dueTomorrow") }}
            </span>
            <PtAvatarStack :users="crew" :size="20" />
          </div>
        </div>

        <div
          class="pt-float absolute end-0 top-0 flex w-[36%] flex-col items-center rounded-3xl border border-white/10 bg-white/10 p-3.5 backdrop-blur-xl"
          style="--pt-tilt: 5deg; animation-delay: -2.5s"
        >
          <PtRing :value="75" :size="68" :stroke="7" color="#53AEFF" track="rgb(255 255 255 / 0.14)">
            <span class="text-base font-bold">75%</span>
          </PtRing>
          <p class="mt-2 text-[11px] font-semibold opacity-70">{{ $t("home.thisWeek") }}</p>
        </div>

        <div
          class="pt-float absolute end-2 bottom-0 flex items-center gap-2 rounded-full bg-white py-1.5 ps-1.5 pe-3.5 text-[#171E23] shadow-2xl"
          style="animation-delay: -1s"
        >
          <span class="grid size-7 place-items-center rounded-full bg-[#E2F4EC] text-[#22A06B]"><PtIcon :icon="CheckmarkCircle02Icon" :size="16" /></span>
          <span class="text-xs font-bold">{{ $t("auth.demoDone") }}</span>
        </div>
      </div>

      <div v-stagger="1" class="relative shrink-0 [@media(max-height:560px)]:hidden">
        <h1 class="text-[1.7rem] leading-tight font-bold">{{ $t("app.tagline") }}</h1>
        <p class="pt-hand mt-1 text-xl text-white/60">{{ $t("auth.note") }}</p>
      </div>
    </section>

    <section class="pt-safe-bottom relative -mt-8 shrink-0 rounded-t-[2rem] bg-surface px-5 pt-7 pb-6 shadow-[0_-12px_40px_-12px_rgb(0_0_0/0.5)]">
      <div class="mx-auto w-full max-w-sm">
        <div v-stagger="0" class="mb-6 flex items-center gap-3">
          <img src="/brand/pilotask-app-icon.svg" alt="" class="size-12 rounded-2xl shadow-soft" />
          <div>
            <h2 class="text-2xl font-bold">{{ $t("auth.title") }}</h2>
            <p class="text-sm text-muted">{{ $t("auth.subtitle") }}</p>
          </div>
        </div>
        <LoginForm />
        <p v-stagger="4" class="mt-6 text-center text-xs text-subtle">{{ $t("auth.pitch") }}</p>
      </div>
    </section>
  </div>

  <!-- Large screens: showcase on one side, the form card on the other. -->
  <div v-else class="pt-aurora fixed inset-0 overflow-hidden overscroll-none">
    <header class="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-8 pt-5">
      <AppLogo :height="30" />
      <LocaleSwitch />
    </header>

    <div class="relative z-10 mx-auto grid min-h-[calc(100dvh-5rem)] max-w-6xl grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] items-center gap-16 px-8">
      <section class="relative h-[30rem]" aria-hidden="true">
        <p class="pt-hand absolute -top-2 start-2 -rotate-6 text-3xl text-muted rtl:rotate-6">{{ $t("auth.note") }} <span class="pt-arrow">↘</span></p>

        <div class="pt-float absolute start-6 top-16 w-72 rounded-3xl border border-line bg-surface p-4 shadow-float" style="--pt-tilt: -4deg">
          <div class="flex items-center gap-2">
            <span class="rounded-full bg-danger-soft px-2.5 py-1 text-[11px] font-bold text-danger">● {{ $t("priority.urgent") }}</span>
            <span class="rounded-full bg-primary-soft px-2.5 py-1 text-[11px] font-bold text-primary">Design</span>
          </div>
          <p class="mt-3 font-bold">{{ $t("auth.demoTask") }}</p>
          <div class="mt-4 flex items-center justify-between">
            <span class="inline-flex items-center gap-1 rounded-full bg-warning-soft px-2 py-1 text-[11px] font-bold text-warning">
              <PtIcon :icon="Calendar03Icon" :size="13" />{{ $t("dates.dueTomorrow") }}
            </span>
            <PtAvatarStack :users="crew" :size="26" />
          </div>
        </div>

        <div class="pt-float absolute end-0 top-4 w-64 rounded-3xl bg-[#121820] p-5 text-white shadow-float" style="--pt-tilt: 3deg; animation-delay: -2s">
          <p class="text-xs font-semibold opacity-70">{{ $t("home.thisWeek") }}</p>
          <p class="mt-1 text-4xl font-bold">18<span class="text-xl opacity-50"> / 24</span></p>
          <PtProgress class="mt-4" :value="75" color="#53AEFF" track="bg-white/15" :height="8" />
          <p class="mt-3 text-xs opacity-70">{{ $t("home.tasksDone") }}</p>
        </div>

        <div class="pt-float absolute end-10 bottom-10 w-72 rounded-3xl border border-line bg-surface p-4 shadow-float" style="--pt-tilt: -2deg; animation-delay: -4s">
          <p class="pt-label mb-3">{{ $t("boards.views.kanban") }}</p>
          <div class="grid grid-cols-3 gap-2">
            <div v-for="(col, i) in ['#64748B', '#53AEFF', '#22A06B']" :key="col" class="rounded-2xl bg-surface-3 p-2">
              <span class="mb-2 block h-1.5 w-8 rounded-full" :style="{ background: col }" />
              <span v-for="n in 3 - i" :key="n" class="mb-1.5 block h-6 rounded-lg bg-surface shadow-soft" />
            </div>
          </div>
        </div>

        <div class="pt-float absolute start-0 bottom-0 flex items-center gap-3 rounded-full border border-line bg-surface py-2 ps-2 pe-4 shadow-float" style="animation-delay: -1s">
          <span class="grid size-9 place-items-center rounded-full bg-success-soft text-success"><PtIcon :icon="CheckmarkCircle02Icon" :size="20" /></span>
          <span class="text-sm font-bold">{{ $t("auth.demoDone") }}</span>
        </div>
      </section>

      <section>
        <div v-stagger="0" class="rounded-(--radius-sheet) border border-line bg-surface/85 p-8 shadow-float backdrop-blur-xl">
          <div class="mb-6 flex items-center gap-3">
            <img src="/brand/pilotask-app-icon.svg" alt="" class="size-12 rounded-2xl shadow-soft" />
            <div>
              <h2 class="text-2xl font-bold">{{ $t("auth.title") }}</h2>
              <p class="text-sm text-muted">{{ $t("auth.subtitle") }}</p>
            </div>
          </div>
          <LoginForm />
        </div>
        <p class="mt-5 text-center text-xs text-subtle">{{ $t("auth.pitch") }}</p>
      </section>
    </div>
  </div>
</template>
