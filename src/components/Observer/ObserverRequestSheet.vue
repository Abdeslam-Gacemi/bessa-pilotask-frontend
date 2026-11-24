<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { SentIcon } from "@hugeicons/core-free-icons";
import PtSheet from "@/components/ui/PtSheet.vue";
import PtField from "@/components/ui/PtField.vue";
import PtButton from "@/components/ui/PtButton.vue";
import { observerRequestsApi } from "@/api/endpoints";
import { useApiError } from "@/composables/useApiError";
import { useToast } from "@/composables/useToast";
import type { ObserverRequest } from "@/types/models";

/** Ask to observe work you cannot see: just describe it — a manager picks which tasks to grant. */
const open = defineModel<boolean>({ required: true });
const emit = defineEmits<{ created: [request: ObserverRequest] }>();
const { t } = useI18n();
const toast = useToast();
const errors = useApiError();

const message = ref("");
const sending = ref(false);
const canSend = computed(() => message.value.trim().length > 0 && !sending.value);

async function send(): Promise<void> {
  if (!canSend.value) return;
  sending.value = true;
  try {
    const created = await observerRequestsApi.create({ message: message.value.trim() });
    emit("created", created);
    message.value = "";
    open.value = false;
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
    <form class="flex flex-col gap-5 pb-4" @submit.prevent="send">
      <p class="text-sm text-muted">{{ $t("observer.intro") }}</p>
      <PtField :label="$t('observer.message')">
        <textarea v-model="message" rows="4" class="pt-field" :placeholder="$t('observer.messagePlaceholder')" maxlength="1000" />
      </PtField>
      <PtButton type="submit" :icon="SentIcon" flip :loading="sending" :disabled="!canSend" class="self-end">{{ $t("observer.send") }}</PtButton>
    </form>
  </PtSheet>
</template>
