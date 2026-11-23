<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { SentIcon } from "@hugeicons/core-free-icons";
import PtSheet from "@/components/ui/PtSheet.vue";
import PtField from "@/components/ui/PtField.vue";
import PtButton from "@/components/ui/PtButton.vue";
import PtSkeleton from "@/components/ui/PtSkeleton.vue";
import { observerRequestsApi } from "@/api/endpoints";
import { useApiError } from "@/composables/useApiError";
import { useRequest } from "@/composables/useRequest";
import { useToast } from "@/composables/useToast";
import { useProjectsStore } from "@/stores/projects";
import type { ObserverRequest } from "@/types/models";

/** Ask to observe work you cannot see: words + an optional project, plus past asks. */
const open = defineModel<boolean>({ required: true });
const { t } = useI18n();
const toast = useToast();
const errors = useApiError();
const projects = useProjectsStore();

const message = ref("");
const projectId = ref<number | null>(null);
const sending = ref(false);
const mine = ref<ObserverRequest[]>([]);
const list = useRequest();

const STATUS_TONE: Record<string, string> = {
  pending: "bg-warning-soft text-warning",
  approved: "bg-success-soft text-success",
  rejected: "bg-danger-soft text-danger",
};

watch(open, async (isOpen) => {
  if (!isOpen) return;
  void projects.load().catch(() => undefined);
  try {
    const result = await list.run((signal) => observerRequestsApi.mine({ signal }));
    if (result) mine.value = result;
  } catch (error) {
    errors.report(error);
  }
});

const canSend = computed(() => message.value.trim().length > 0 && !sending.value);

async function send(): Promise<void> {
  if (!canSend.value) return;
  sending.value = true;
  try {
    const created = await observerRequestsApi.create({ message: message.value.trim(), project_id: projectId.value });
    mine.value = [created, ...mine.value];
    message.value = "";
    projectId.value = null;
    toast.success(t("observer.sent"));
  } catch (error) {
    errors.report(error);
  } finally {
    sending.value = false;
  }
}
</script>

<template>
  <PtSheet v-model="open" side="end" width="34rem" :title="$t('observer.title')">
    <div class="flex flex-col gap-5 pb-4">
      <p class="text-sm text-muted">{{ $t("observer.intro") }}</p>

      <form class="flex flex-col gap-3" @submit.prevent="send">
        <PtField :label="$t('observer.message')">
          <textarea v-model="message" rows="3" class="pt-field" :placeholder="$t('observer.messagePlaceholder')" maxlength="1000" />
        </PtField>
        <PtField :label="$t('observer.project')" :hint="$t('observer.projectHint')">
          <select v-model="projectId" class="pt-field">
            <option :value="null">{{ $t("observer.noProject") }}</option>
            <option v-for="p in projects.projects" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
        </PtField>
        <PtButton type="submit" :icon="SentIcon" flip :loading="sending" :disabled="!canSend" class="self-end">{{ $t("observer.send") }}</PtButton>
      </form>

      <div class="border-t border-line/60 pt-4">
        <h3 class="mb-3 text-sm font-bold">{{ $t("observer.myRequests") }}</h3>
        <div v-if="list.loading.value && !mine.length" class="flex flex-col gap-2"><PtSkeleton v-for="i in 2" :key="i" class="h-20" /></div>
        <p v-else-if="!mine.length" class="py-4 text-center text-sm text-muted">{{ $t("observer.none") }}</p>
        <ul v-else class="flex flex-col gap-2">
          <li v-for="r in mine" :key="r.id" class="rounded-2xl bg-surface-2 p-3">
            <div class="flex items-start gap-2">
              <span class="rounded-full px-2 py-0.5 text-[11px] font-bold" :class="STATUS_TONE[r.status]">{{ $t(`observer.status.${r.status}`) }}</span>
              <span v-if="r.project" class="text-xs font-semibold text-muted">{{ r.project.name }}</span>
            </div>
            <p class="mt-2 text-sm">{{ r.message }}</p>
            <p v-if="r.status === 'approved'" class="mt-1.5 text-xs text-success">
              {{ $t("observer.grantedCount", { n: r.tasks?.length ?? 0 }) }}
            </p>
            <p v-if="r.status === 'rejected' && r.decision_message" class="mt-1.5 text-xs text-danger">
              {{ $t("observer.reason", { reason: r.decision_message }) }}
            </p>
          </li>
        </ul>
      </div>
    </div>
  </PtSheet>
</template>
