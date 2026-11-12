import { defineStore } from "pinia";
import { ref } from "vue";
import { useIntervalFn } from "@vueuse/core";
import { notificationsApi } from "@/api/endpoints";
import type { AppNotification } from "@/types/models";

/** The inbox: polled every minute and refreshed when a push arrives. */
export const useNotificationsStore = defineStore("notifications", () => {
  const items = ref<AppNotification[]>([]);
  const unread = ref(0);
  const loading = ref(false);
  const page = ref(1);
  const lastPage = ref(1);

  async function refresh(): Promise<void> {
    loading.value = true;
    try {
      const result = await notificationsApi.list(1);
      items.value = result.data;
      unread.value = result.meta.unread;
      page.value = 1;
      lastPage.value = result.meta.last_page;
    } finally {
      loading.value = false;
    }
  }

  async function loadMore(): Promise<void> {
    if (page.value >= lastPage.value) return;
    const result = await notificationsApi.list(page.value + 1);
    items.value.push(...result.data);
    page.value += 1;
  }

  async function markRead(notification: AppNotification): Promise<void> {
    if (notification.read_at) return;
    notification.read_at = new Date().toISOString();
    unread.value = Math.max(0, unread.value - 1);
    await notificationsApi.read(notification.id);
  }

  /** Saved on the server first; the list updates once it's done (the caller shows the wait). */
  async function markAllRead(): Promise<void> {
    await notificationsApi.readAll();
    const now = new Date().toISOString();
    items.value.forEach((n) => (n.read_at ??= now));
    unread.value = 0;
  }

  const poller = useIntervalFn(() => void refresh().catch(() => undefined), 60_000, { immediate: false });

  function start(): void {
    void refresh().catch(() => undefined);
    poller.resume();
  }

  function stop(): void {
    poller.pause();
    items.value = [];
    unread.value = 0;
  }

  return { items, unread, loading, page, lastPage, refresh, loadMore, markRead, markAllRead, start, stop };
});
