<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { Capacitor } from "@capacitor/core";
import { Notification03Icon, SentIcon } from "@hugeicons/core-free-icons";
import PtButton from "@/components/ui/PtButton.vue";
import PtIcon from "@/components/ui/PtIcon.vue";
import PtSwitch from "@/components/ui/PtSwitch.vue";
import { useApiError } from "@/composables/useApiError";
import { useProfileSave } from "@/composables/useProfileSave";
import { useToast } from "@/composables/useToast";
import { notificationsApi } from "@/api/endpoints";
import { useNotificationTarget } from "@/composables/useNotificationTarget";
import { pushEnabled, startPush, webPushSupported } from "@/services/push";
import { useNotificationsStore } from "@/stores/notifications";
import { useSessionStore } from "@/stores/session";
import type { NotificationPreferences, NotificationTopic } from "@/types/models";

const session = useSessionStore();
const inbox = useNotificationsStore();
const openTarget = useNotificationTarget();
const { saveSoon } = useProfileSave();

const TOPICS = computed<NotificationTopic[]>(() => [
  "task_assigned",
  "mentioned",
  "deadline_approaching",
  "task_completed",
  "status_changed",
  "commented",
  "task_created",
  ...(session.canManage ? (["item_changed"] as const) : []),
]);
const pushAvailable = Capacitor.isNativePlatform() || webPushSupported;
const preferences = ref<NotificationPreferences>({ ...(session.user?.notification_preferences ?? {}) });

const isOn = (topic: NotificationTopic, channel: "mail" | "push") => preferences.value[topic]?.[channel] ?? true;

function set(topic: NotificationTopic, channel: "mail" | "push", value: boolean): void {
  preferences.value = { ...preferences.value, [topic]: { mail: isOn(topic, "mail"), push: isOn(topic, "push"), [channel]: value } };
  void saveSoon({ notification_preferences: preferences.value });
}

async function enablePush(): Promise<void> {
  await startPush({ onMessage: () => void inbox.refresh(), onOpen: openTarget }, true);
}

// "Does it work?": one alert in the inbox, by e-mail and on every registered device.
const { t } = useI18n();
const toast = useToast();
const apiError = useApiError();
const testing = ref(false);

async function sendTest(): Promise<void> {
  testing.value = true;
  try {
    const { devices, mail } = await notificationsApi.test();
    toast.success(devices ? t("settings.test.sent", { mail, n: devices }) : t("settings.test.sentNoDevice", { mail }), undefined);
    void inbox.refresh();
  } catch (error) {
    apiError.report(error);
  } finally {
    testing.value = false;
  }
}
</script>

<template>
  <div v-stagger="0" class="pt-card flex items-start gap-3.5 p-4">
    <span class="grid size-11 shrink-0 place-items-center rounded-2xl bg-warning-soft text-warning"><PtIcon :icon="Notification03Icon" :size="20" /></span>
    <div class="min-w-0 flex-1">
      <p class="text-sm font-semibold">{{ $t("settings.push") }}</p>
      <p v-if="!pushAvailable" class="mt-0.5 text-xs text-muted">{{ $t("settings.pushUnavailable") }}</p>
      <span v-else-if="pushEnabled" class="mt-1.5 inline-block rounded-full bg-success-soft px-2.5 py-1 text-xs font-bold text-success">
        {{ $t("settings.pushEnabled") }}
      </span>
      <PtButton v-else size="sm" variant="soft" class="mt-2" @click="enablePush">{{ $t("settings.enablePush") }}</PtButton>
    </div>
  </div>

  <div v-stagger="0" class="pt-card flex items-center gap-3.5 p-4">
    <div class="min-w-0 flex-1">
      <p class="text-sm font-semibold">{{ $t("settings.test.title") }}</p>
      <p class="mt-0.5 text-xs text-muted">{{ $t("settings.test.hint") }}</p>
    </div>
    <PtButton size="sm" variant="secondary" :icon="SentIcon" flip :loading="testing" @click="sendTest">{{ $t("settings.test.action") }}</PtButton>
  </div>

  <p class="px-1 text-sm text-muted">{{ $t("settings.notificationsHint") }}</p>

  <div class="flex flex-col gap-3">
    <section v-for="(topic, i) in TOPICS" :key="topic" v-stagger="i + 1" class="pt-card p-4">
      <p class="mb-3 font-semibold">{{ $t(`settings.topics.${topic}`) }}</p>
      <div class="grid grid-cols-2 gap-3">
        <div class="rounded-2xl bg-surface-2 px-3.5 py-2.5">
          <PtSwitch :model-value="isOn(topic, 'mail')" :label="$t('settings.channels.mail')" @update:model-value="(v) => set(topic, 'mail', v)" />
        </div>
        <div class="rounded-2xl bg-surface-2 px-3.5 py-2.5">
          <PtSwitch :model-value="isOn(topic, 'push')" :label="$t('settings.channels.push')" @update:model-value="(v) => set(topic, 'push', v)" />
        </div>
      </div>
    </section>
  </div>
</template>
