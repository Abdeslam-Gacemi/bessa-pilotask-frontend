<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useNow } from "@vueuse/core";
import DecisionTaskRow from "./DecisionTaskRow.vue";
import PtButton from "@/components/ui/PtButton.vue";
import PtSheet from "@/components/ui/PtSheet.vue";
import PtSkeleton from "@/components/ui/PtSkeleton.vue";
import { dashboardApi, type DashboardBucket } from "@/api/endpoints";
import { useApiError } from "@/composables/useApiError";
import { useRequest } from "@/composables/useRequest";
import type { Task } from "@/types/models";

/** Every task of one decision tile, most pressing first, 20 at a time ("See all" on the managers' home). */
const props = defineProps<{ bucket: DashboardBucket; total: number }>();
const open = defineModel<boolean>({ required: true });
const emit = defineEmits<{ openTask: [id: number] }>();

const now = useNow({ interval: 60_000 });
const errors = useApiError();
const request = useRequest();
const loading = request.loading;

const tasks = ref<Task[]>([]);
const page = ref(0);
const lastPage = ref(1);
const total = ref(props.total);
const remaining = computed(() => Math.max(0, total.value - tasks.value.length));

async function loadPage(next: number): Promise<void> {
  try {
    const result = await request.run((signal) => dashboardApi.bucket(props.bucket, next, { signal }));
    if (!result) return;
    tasks.value = next === 1 ? result.data : [...tasks.value, ...result.data.filter((t) => !tasks.value.some((x) => x.id === t.id))];
    page.value = next;
    lastPage.value = result.meta?.last_page ?? next;
    total.value = result.meta?.total ?? tasks.value.length;
  } catch (error) {
    errors.report(error);
  }
}

// Fresh list each time it opens (or the tile changes while open).
watch(
  [open, () => props.bucket],
  ([isOpen]) => {
    if (!isOpen) return;
    tasks.value = [];
    total.value = props.total;
    void loadPage(1);
  },
  { immediate: true },
);

function openTask(id: number): void {
  emit("openTask", id);
}
</script>

<template>
  <PtSheet v-model="open" side="end" width="40rem">
    <template #header>
      <h2 class="flex min-w-0 flex-1 items-baseline gap-2 truncate text-lg font-bold">
        {{ $t(`manager.buckets.${bucket}`) }}
        <span class="text-sm font-semibold text-muted tabular-nums">{{ total }}</span>
      </h2>
    </template>

    <div class="relative" :aria-busy="loading">
      <div v-if="!tasks.length && loading" class="flex flex-col gap-1">
        <div v-for="i in 8" :key="i" class="flex items-center gap-3 rounded-2xl px-3 py-3">
          <div class="min-w-0 flex-1 space-y-2"><PtSkeleton class="h-3.5 w-2/3 rounded-full" /><PtSkeleton class="h-3 w-1/3 rounded-full" /></div>
          <PtSkeleton class="h-6 w-20 rounded-full" />
        </div>
      </div>
      <p v-else-if="!tasks.length" class="pt-hand py-12 text-center text-2xl text-muted">{{ $t("manager.nothing") }}</p>
      <ul v-else class="-mx-2 divide-y divide-line/60">
        <li v-for="(task, i) in tasks" :key="task.id" v-stagger="i % 20">
          <DecisionTaskRow :task="task" :bucket="bucket" :now="now" @open="openTask" />
        </li>
      </ul>

      <div v-if="tasks.length && page < lastPage" class="mt-4 flex justify-center">
        <PtButton variant="secondary" :loading="loading" @click="loadPage(page + 1)">
          {{ $t("manager.loadMore", { n: remaining }) }}
        </PtButton>
      </div>
    </div>
  </PtSheet>
</template>
