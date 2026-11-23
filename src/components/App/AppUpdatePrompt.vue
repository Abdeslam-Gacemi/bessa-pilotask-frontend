<script setup lang="ts">
import { onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useConfirm } from "@/composables/useConfirm";
import { checkForAndroidUpdate, installAndroidUpdate } from "@/services/appUpdate";

/** On the Android app, offers an optional update when the server has a newer build. */
const { t } = useI18n();
const { confirm } = useConfirm();

onMounted(async () => {
  const release = await checkForAndroidUpdate();
  if (!release) return;

  await confirm({
    title: t("appUpdate.title"),
    message: t("appUpdate.message", { version: release.version_name ?? "" }),
    confirmLabel: t("appUpdate.update"),
    action: "update",
    run: () => installAndroidUpdate(release),
  });
});
</script>

<template><span class="hidden" /></template>
