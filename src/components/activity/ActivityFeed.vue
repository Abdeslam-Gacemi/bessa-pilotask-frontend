<script setup lang="ts">
import { ref, watch } from "vue";
import { Activity01Icon } from "@hugeicons/core-free-icons";
import ActivityItem from "./ActivityItem.vue";
import PtButton from "@/components/ui/PtButton.vue";
import PtEmpty from "@/components/ui/PtEmpty.vue";
import PtSkeleton from "@/components/ui/PtSkeleton.vue";
import type { ActivityQuery } from "@/api/endpoints";
import { useRequest } from "@/composables/useRequest";
import type { ActivityLog, Paginated } from "@/types/models";

/** A cursor-paginated activity list; the loader decides which feed it shows. */
const props = defineProps<{ loader: (params: ActivityQuery, signal?: AbortSignal) => Promise<Paginated<ActivityLog>>; filters?: ActivityQuery }>();

const logs = ref<ActivityLog[]>([]);
const cursor = ref<string | null>(null);
const request = useRequest();
const loading = request.loading;

async function fetch(reset: boolean): Promise<void> {
  const page = await request.run((signal) => props.loader({ ...props.filters, cursor: reset ? undefined : (cursor.value ?? undefined) }, signal));
  if (!page) return;
  logs.value = reset ? page.data : [...logs.value, ...page.data];
  cursor.value = page.meta?.next_cursor ?? null;
}

watch(() => [props.loader, props.filters], () => void fetch(true), { immediate: true, deep: true });

defineExpose({ reload: () => fetch(true) });
</script>

<template>
  <div>
    <div v-if="loading && !logs.length" class="flex flex-col gap-3 py-3">
      <PtSkeleton v-for="i in 4" :key="i" class="h-12" />
    </div>
    <PtEmpty v-else-if="!logs.length" :icon="Activity01Icon" :title="$t('activity.empty')" />
    <ul v-else class="divide-y divide-line/60">
      <ActivityItem v-for="(log, i) in logs" :key="log.id" v-stagger="i" :log="log" />
    </ul>
    <div v-if="cursor" class="flex justify-center pt-3">
      <PtButton variant="secondary" size="sm" :loading="loading" @click="fetch(false)">{{ $t("activity.loadMore") }}</PtButton>
    </div>
  </div>
</template>
