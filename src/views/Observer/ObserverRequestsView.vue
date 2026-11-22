<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { CheckmarkCircle02Icon, Cancel01Icon, ViewIcon } from "@hugeicons/core-free-icons";
import PtAvatar from "@/components/ui/PtAvatar.vue";
import PtButton from "@/components/ui/PtButton.vue";
import PtEmpty from "@/components/ui/PtEmpty.vue";
import PtField from "@/components/ui/PtField.vue";
import PtSheet from "@/components/ui/PtSheet.vue";
import PtSkeleton from "@/components/ui/PtSkeleton.vue";
import { observerRequestsApi, tasksApi } from "@/api/endpoints";
import { useApiError } from "@/composables/useApiError";
import { useRequest } from "@/composables/useRequest";
import { useToast } from "@/composables/useToast";
import { useDates } from "@/composables/useDates";
import type { ObserverRequest, Task } from "@/types/models";

/** Managers and project managers accept (picking the tasks) or reject (with a reason) observer asks. */
const { t } = useI18n();
const toast = useToast();
const errors = useApiError();
const { fmt } = useDates();

const requests = ref<ObserverRequest[]>([]);
const list = useRequest();

const active = ref<ObserverRequest | null>(null);
const mode = ref<"approve" | "reject" | null>(null);
const busy = ref(false);

// Approve: pick tasks to grant.
const taskOptions = ref<Task[]>([]);
const taskLoading = ref(false);
const picked = ref<number[]>([]);
// Reject: reason (required).
const reason = ref("");

const panelOpen = computed({ get: () => mode.value !== null, set: (v) => !v && close() });

async function load(): Promise<void> {
  try {
    const result = await list.run((signal) => observerRequestsApi.pending({ signal }));
    if (result) requests.value = result;
  } catch (error) {
    errors.report(error);
  }
}

function close(): void {
  mode.value = null;
  active.value = null;
  picked.value = [];
  reason.value = "";
  taskOptions.value = [];
}

async function startApprove(r: ObserverRequest): Promise<void> {
  active.value = r;
  mode.value = "approve";
  picked.value = [];
  taskLoading.value = true;
  try {
    // Tasks the decider can reach (scoped to the named project when present).
    const result = await tasksApi.list({ project_id: r.project?.id, open: true, sort: "updated_at" });
    taskOptions.value = result;
  } catch (error) {
    errors.report(error);
  } finally {
    taskLoading.value = false;
  }
}

function startReject(r: ObserverRequest): void {
  active.value = r;
  mode.value = "reject";
  reason.value = "";
}

function toggleTask(id: number): void {
  picked.value = picked.value.includes(id) ? picked.value.filter((x) => x !== id) : [...picked.value, id];
}

async function confirmApprove(): Promise<void> {
  if (!active.value || !picked.value.length || busy.value) return;
  busy.value = true;
  try {
    await observerRequestsApi.approve(active.value.id, picked.value);
    requests.value = requests.value.filter((r) => r.id !== active.value!.id);
    toast.success(t("observer.approved"));
    close();
  } catch (error) {
    errors.report(error);
  } finally {
    busy.value = false;
  }
}

async function confirmReject(): Promise<void> {
  if (!active.value || !reason.value.trim() || busy.value) return;
  busy.value = true;
  try {
    await observerRequestsApi.reject(active.value.id, reason.value.trim());
    requests.value = requests.value.filter((r) => r.id !== active.value!.id);
    toast.success(t("observer.rejected"));
    close();
  } catch (error) {
    errors.report(error);
  } finally {
    busy.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div class="mx-auto flex w-full max-w-3xl flex-col gap-6">
    <header v-stagger="0">
      <h1 class="text-3xl font-bold">{{ $t("observer.inbox") }}</h1>
      <p class="mt-1 text-sm text-muted">{{ $t("observer.inboxHint") }}</p>
    </header>

    <div v-if="list.loading.value && !requests.length" class="flex flex-col gap-3"><PtSkeleton v-for="i in 3" :key="i" class="h-28" /></div>
    <PtEmpty v-else-if="!requests.length" :icon="ViewIcon" :title="$t('observer.inboxEmpty')" />

    <ul v-else class="flex flex-col gap-3">
      <li v-for="(r, i) in requests" :key="r.id" v-stagger="i" class="pt-card p-4">
        <div class="flex items-center gap-2.5">
          <PtAvatar :name="r.requester?.name ?? '?'" :src="r.requester?.avatar_url" :size="32" />
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-bold">{{ r.requester?.name }}</p>
            <p class="text-xs text-muted">{{ r.project?.name ?? $t("observer.noProject") }} · {{ fmt.relative(r.created_at) }}</p>
          </div>
        </div>
        <p class="mt-3 rounded-2xl bg-surface-2 p-3 text-sm">{{ r.message }}</p>
        <div class="mt-3 flex justify-end gap-2">
          <PtButton variant="secondary" size="sm" :icon="Cancel01Icon" @click="startReject(r)">{{ $t("observer.reject") }}</PtButton>
          <PtButton size="sm" :icon="CheckmarkCircle02Icon" @click="startApprove(r)">{{ $t("observer.approve") }}</PtButton>
        </div>
      </li>
    </ul>

    <!-- Approve: pick the tasks to grant. Reject: write a reason. -->
    <PtSheet v-model="panelOpen" side="end" width="34rem" :title="mode === 'approve' ? $t('observer.pickTasks') : $t('observer.reject')">
      <div v-if="mode === 'approve'" class="flex flex-col gap-4 pb-4">
        <p class="text-sm text-muted">{{ $t("observer.pickTasksHint") }}</p>
        <div v-if="taskLoading" class="flex flex-col gap-2"><PtSkeleton v-for="i in 3" :key="i" class="h-12" /></div>
        <p v-else-if="!taskOptions.length" class="py-4 text-center text-sm text-muted">{{ $t("observer.noTasks") }}</p>
        <ul v-else class="flex flex-col gap-1.5">
          <li v-for="task in taskOptions" :key="task.id">
            <label class="flex cursor-pointer items-center gap-3 rounded-xl bg-surface-2 px-3 py-2.5 text-sm hover:bg-surface-3">
              <input type="checkbox" :checked="picked.includes(task.id)" @change="toggleTask(task.id)" />
              <span class="min-w-0 flex-1 truncate">{{ task.title }}</span>
              <span class="text-xs text-muted">{{ task.board?.name }}</span>
            </label>
          </li>
        </ul>
        <PtButton :loading="busy" :disabled="!picked.length" class="self-end" @click="confirmApprove">
          {{ $t("observer.grant", { n: picked.length }) }}
        </PtButton>
      </div>

      <div v-else-if="mode === 'reject'" class="flex flex-col gap-4 pb-4">
        <PtField :label="$t('observer.reasonLabel')" :hint="$t('observer.reasonHint')">
          <textarea v-model="reason" rows="3" class="pt-field" :placeholder="$t('observer.reasonPlaceholder')" maxlength="1000" />
        </PtField>
        <PtButton variant="danger" :loading="busy" :disabled="!reason.trim()" class="self-end" @click="confirmReject">{{ $t("observer.reject") }}</PtButton>
      </div>
    </PtSheet>
  </div>
</template>
