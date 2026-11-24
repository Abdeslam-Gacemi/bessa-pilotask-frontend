<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { refDebounced } from "@vueuse/core";
import { Add01Icon, ViewIcon, Search01Icon } from "@hugeicons/core-free-icons";
import PtButton from "@/components/ui/PtButton.vue";
import PtEmpty from "@/components/ui/PtEmpty.vue";
import PtIcon from "@/components/ui/PtIcon.vue";
import PtSegmented from "@/components/ui/PtSegmented.vue";
import PtSkeleton from "@/components/ui/PtSkeleton.vue";
import ObserverRequestSheet from "@/components/Observer/ObserverRequestSheet.vue";
import { observerRequestsApi } from "@/api/endpoints";
import { useApiError } from "@/composables/useApiError";
import { useRequest } from "@/composables/useRequest";
import { useDates } from "@/composables/useDates";
import type { ObserverRequest } from "@/types/models";

/** A person's own observation requests — search by text, filter by status, and send a new one. */
const errors = useApiError();
const { fmt } = useDates();

const all = ref<ObserverRequest[]>([]);
const list = useRequest();
const createOpen = ref(false);
const status = ref<"all" | "pending" | "approved" | "rejected">("all");
const search = ref("");
const query = refDebounced(search, 250);

const STATUS_TONE: Record<string, string> = {
  pending: "bg-warning-soft text-warning",
  approved: "bg-success-soft text-success",
  rejected: "bg-danger-soft text-danger",
};

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase();
  return all.value.filter(
    (r) => (status.value === "all" || r.status === status.value) && (!q || r.message.toLowerCase().includes(q)),
  );
});

async function load(): Promise<void> {
  try {
    const result = await list.run((signal) => observerRequestsApi.mine({ signal }));
    if (result) all.value = result;
  } catch (error) {
    errors.report(error);
  }
}

function onCreated(request: ObserverRequest): void {
  all.value = [request, ...all.value];
}

onMounted(load);
</script>

<template>
  <div class="mx-auto flex w-full max-w-3xl flex-col gap-6">
    <header v-stagger="0" class="flex flex-wrap items-end gap-4">
      <div class="flex-1">
        <h1 class="text-3xl font-bold">{{ $t("observer.myRequestsTitle") }}</h1>
        <p class="mt-1 text-sm text-muted">{{ $t("observer.myRequestsHint") }}</p>
      </div>
      <PtButton :icon="Add01Icon" @click="createOpen = true">{{ $t("observer.newRequest") }}</PtButton>
    </header>

    <div v-stagger="1" class="flex flex-wrap items-center gap-2">
      <div class="relative min-w-0 flex-1">
        <PtIcon :icon="Search01Icon" :size="18" class="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-subtle" />
        <input v-model="search" class="pt-field bg-surface ps-11" :placeholder="$t('observer.searchPlaceholder')" />
      </div>
      <PtSegmented
        v-model="status"
        :options="[
          { value: 'all', label: $t('observer.filterAll') },
          { value: 'pending', label: $t('observer.status.pending') },
          { value: 'approved', label: $t('observer.status.approved') },
          { value: 'rejected', label: $t('observer.status.rejected') },
        ]"
      />
    </div>

    <div v-if="list.loading.value && !all.length" class="flex flex-col gap-3"><PtSkeleton v-for="i in 3" :key="i" class="h-24" /></div>
    <PtEmpty v-else-if="!filtered.length" :icon="ViewIcon" :title="$t('observer.none')" />
    <ul v-else class="flex flex-col gap-3">
      <li v-for="(r, i) in filtered" :key="r.id" v-stagger="i" class="pt-card p-4">
        <div class="flex items-center gap-2">
          <span class="rounded-full px-2 py-0.5 text-[11px] font-bold" :class="STATUS_TONE[r.status]">{{ $t(`observer.status.${r.status}`) }}</span>
          <span v-if="r.project" class="text-xs font-semibold text-muted">{{ r.project.name }}</span>
          <span class="ms-auto text-xs text-muted">{{ fmt.relative(r.created_at) }}</span>
        </div>
        <p class="mt-2 text-sm">{{ r.message }}</p>
        <p v-if="r.status === 'approved'" class="mt-1.5 text-xs text-success">{{ $t("observer.grantedCount", { n: r.tasks?.length ?? 0 }) }}</p>
        <p v-if="r.status === 'rejected' && r.decision_message" class="mt-1.5 text-xs text-danger">{{ $t("observer.reason", { reason: r.decision_message }) }}</p>
      </li>
    </ul>

    <ObserverRequestSheet v-model="createOpen" @created="onCreated" />
  </div>
</template>
