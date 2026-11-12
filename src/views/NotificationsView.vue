<script setup lang="ts">
import { onMounted } from "vue";
import { Notification03Icon, CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import PtAvatar from "@/components/ui/PtAvatar.vue";
import PtButton from "@/components/ui/PtButton.vue";
import PtEmpty from "@/components/ui/PtEmpty.vue";
import PtSkeleton from "@/components/ui/PtSkeleton.vue";
import { useDates } from "@/composables/useDates";
import { useNotificationTarget } from "@/composables/useNotificationTarget";
import { useConfirm } from "@/composables/useConfirm";
import { useApiError } from "@/composables/useApiError";
import { useToast } from "@/composables/useToast";
import { useI18n } from "vue-i18n";
import { useNotificationsStore } from "@/stores/notifications";
import type { AppNotification } from "@/types/models";

const inbox = useNotificationsStore();
const openTarget = useNotificationTarget();
const { confirm } = useConfirm();
const errors = useApiError();
const toast = useToast();
const { t } = useI18n();

async function markAllRead(): Promise<void> {
  try {
    const done = await confirm({
      title: t("notifications.markAllConfirm", inbox.unread),
      confirmLabel: t("notifications.markAllRead"),
      run: () => inbox.markAllRead(),
    });
    if (done) toast.success(t("notifications.allRead"));
  } catch (error) {
    errors.report(error);
  }
}
const { fmt } = useDates();

function openNotification(notification: AppNotification): void {
  void inbox.markRead(notification);
  openTarget(notification.data);
}

onMounted(() => inbox.refresh());
</script>

<template>
  <div class="mx-auto flex w-full max-w-3xl flex-col gap-6">
    <header class="flex flex-wrap items-end gap-3">
      <div class="me-auto">
        <h1 class="text-3xl font-bold">{{ $t("notifications.title") }}</h1>
        <p v-if="inbox.unread" class="mt-1 text-sm text-muted">{{ inbox.unread }} {{ $t("notifications.unread").toLowerCase() }}</p>
      </div>
      <PtButton v-if="inbox.unread" variant="secondary" size="sm" :icon="CheckmarkCircle02Icon" @click="markAllRead">
        {{ $t("notifications.markAllRead") }}
      </PtButton>
    </header>

    <div v-if="inbox.loading && !inbox.items.length" class="flex flex-col gap-3"><PtSkeleton v-for="i in 5" :key="i" class="h-16" /></div>
    <PtEmpty v-else-if="!inbox.items.length" :icon="Notification03Icon" :title="$t('notifications.empty')" />
    <section v-else class="pt-card divide-y divide-line/60 p-2">
      <button
        v-for="(notification, i) in inbox.items"
        :key="notification.id"
        v-stagger="i"
        type="button"
        class="flex w-full items-start gap-3 rounded-2xl px-3 py-3.5 text-start transition hover:bg-surface-2"
        @click="openNotification(notification)"
      >
        <PtAvatar :name="notification.data.actor?.name ?? 'Pilotask'" :src="notification.data.actor?.avatar_url" :size="38" />
        <span class="min-w-0 flex-1">
          <span class="block text-sm font-bold">{{ notification.data.title }}</span>
          <span class="block text-sm text-muted">{{ notification.data.body }}</span>
          <span class="mt-1 block text-xs text-subtle">{{ fmt.relative(notification.created_at) }}</span>
        </span>
        <span v-if="!notification.read_at" class="mt-2 size-2.5 shrink-0 rounded-full bg-sky" />
      </button>
    </section>
    <PtButton v-if="inbox.page < inbox.lastPage" variant="secondary" class="self-center" @click="inbox.loadMore()">{{ $t("activity.loadMore") }}</PtButton>
  </div>
</template>
