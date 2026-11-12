<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Capacitor } from "@capacitor/core";
import { ArrowRight01Icon, Mail01Icon, SquareLock02Icon, ViewIcon, ViewOffSlashIcon } from "@hugeicons/core-free-icons";
import PtButton from "@/components/ui/PtButton.vue";
import PtField from "@/components/ui/PtField.vue";
import PtIcon from "@/components/ui/PtIcon.vue";
import { ApiError } from "@/api/client";
import { useApiError } from "@/composables/useApiError";
import { useSessionStore } from "@/stores/session";
import { prepareProof } from "@/services/captcha";
import type { CaptchaProof } from "@/api/endpoints";

/** E-mail + password sign-in, shared by the phone and desktop login layouts. */
const session = useSessionStore();
const router = useRouter();
const route = useRoute();
const errors = useApiError();

// `website` is a honeypot: hidden from people, bots fill it and get refused.
const form = reactive({ email: "", password: "", website: "" });
const reveal = ref(false);
const loading = ref(false);
const error = ref("");

// Invisible captcha: solved in the background while the person types; each proof works once.
let proof: Promise<CaptchaProof> | null = null;
const refreshProof = () => (proof = prepareProof().catch(() => ({})));
onMounted(refreshProof);

async function submit(): Promise<void> {
  error.value = "";
  loading.value = true;
  try {
    const solved = await (proof ?? refreshProof());
    await session.login(form.email.trim(), form.password, Capacitor.isNativePlatform() ? Capacitor.getPlatform() : "web", {
      ...solved,
      website: form.website,
    });
    await router.replace((route.query.redirect as string) || "/");
  } catch (e) {
    error.value = e instanceof ApiError ? (e.firstFieldError("email") ?? errors.message(e)) : errors.message(e);
    refreshProof();
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <form class="flex flex-col gap-4" @submit.prevent="submit">
    <!-- Honeypot (hidden captcha): off-screen, skipped by keyboard and screen readers. -->
    <input
      v-model="form.website"
      name="website"
      type="text"
      tabindex="-1"
      autocomplete="off"
      aria-hidden="true"
      class="pointer-events-none absolute -start-[9999px] size-px opacity-0"
    />

    <PtField v-stagger="1" :label="$t('auth.email')" for="email">
      <div class="relative">
        <PtIcon :icon="Mail01Icon" :size="18" class="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-subtle" />
        <input id="email" v-model="form.email" type="email" inputmode="email" class="pt-field h-13 ps-11" autocomplete="username" :placeholder="$t('auth.emailPlaceholder')" required />
      </div>
    </PtField>

    <PtField v-stagger="2" :label="$t('auth.password')" for="password" :error="error">
      <div class="relative">
        <PtIcon :icon="SquareLock02Icon" :size="18" class="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-subtle" />
        <input
          id="password"
          v-model="form.password"
          :type="reveal ? 'text' : 'password'"
          class="pt-field h-13 ps-11 pe-12"
          autocomplete="current-password"
          :placeholder="$t('auth.passwordPlaceholder')"
          required
        />
        <button
          type="button"
          class="absolute end-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-surface-3"
          :aria-label="reveal ? $t('auth.hidePassword') : $t('auth.showPassword')"
          @click="reveal = !reveal"
        >
          <PtIcon :icon="reveal ? ViewOffSlashIcon : ViewIcon" :size="18" />
        </button>
      </div>
    </PtField>

    <PtButton v-stagger="3" type="submit" size="lg" block :loading="loading" class="mt-2">
      {{ loading ? $t("auth.signingIn") : $t("auth.signIn") }}
      <PtIcon v-if="!loading" :icon="ArrowRight01Icon" :size="18" class="rtl:rotate-180" />
    </PtButton>
  </form>
</template>
