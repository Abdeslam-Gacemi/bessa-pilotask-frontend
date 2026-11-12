<script setup lang="ts">
import { watch } from "vue";
import { useTitle } from "@vueuse/core";
import { useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import PtConfirmDialog from "@/components/ui/PtConfirmDialog.vue";
import PtToaster from "@/components/ui/PtToaster.vue";
import { usePreferencesStore } from "@/stores/preferences";
import { useSessionStore } from "@/stores/session";

const prefs = usePreferencesStore();
const session = useSessionStore();
const route = useRoute();
const { t } = useI18n();

// The account's saved language and theme apply when someone signs in (not on
// every profile save, which would undo a quick second change while the first saves).
watch(
  () => session.user?.id,
  () => {
    const user = session.user;
    if (user?.locale) prefs.locale = user.locale;
    if (user?.theme) prefs.theme = user.theme;
  },
  { immediate: true },
);

useTitle(() => (route.meta.title ? `${t(route.meta.title)} · Pilotask` : "Pilotask"));
</script>

<template>
  <RouterView v-slot="{ Component }">
    <Transition name="pt-fade" mode="out-in">
      <component :is="Component" />
    </Transition>
  </RouterView>
  <PtToaster />
  <PtConfirmDialog />
</template>
