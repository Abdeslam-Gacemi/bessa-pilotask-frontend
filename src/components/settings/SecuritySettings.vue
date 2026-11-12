<script setup lang="ts">
import { reactive, ref } from "vue";
import { useI18n } from "vue-i18n";
import PtButton from "@/components/ui/PtButton.vue";
import PtField from "@/components/ui/PtField.vue";
import PtPasswordInput from "@/components/ui/PtPasswordInput.vue";
import { authApi } from "@/api/endpoints";
import { useApiError } from "@/composables/useApiError";
import { useConfirm } from "@/composables/useConfirm";
import { useToast } from "@/composables/useToast";

const { t } = useI18n();
const toast = useToast();
const errors = useApiError();
const { confirmAction } = useConfirm();

const form = reactive({ current_password: "", password: "", password_confirmation: "" });
const error = ref("");
const saving = ref(false);

async function submit(): Promise<void> {
  error.value = "";
  if (form.password !== form.password_confirmation) {
    error.value = t("users.passwordMismatch");
    return;
  }
  if (!(await confirmAction("update", "password", t("confirm.entities.password")))) return;
  saving.value = true;
  try {
    await authApi.updateProfile({ ...form });
    Object.assign(form, { current_password: "", password: "", password_confirmation: "" });
    toast.success(t("common.saved"));
  } catch (e) {
    error.value = errors.message(e);
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <form v-stagger="0" class="pt-card flex flex-col gap-4 p-5" @submit.prevent="submit">
    <PtField :label="$t('settings.currentPassword')">
      <PtPasswordInput v-model="form.current_password" autocomplete="current-password" required />
    </PtField>
    <PtField :label="$t('settings.newPassword')">
      <PtPasswordInput v-model="form.password" autocomplete="new-password" minlength="8" required />
    </PtField>
    <PtField :label="$t('settings.confirmPassword')" :error="error">
      <PtPasswordInput v-model="form.password_confirmation" autocomplete="new-password" required />
    </PtField>
    <PtButton type="submit" :loading="saving" class="self-end">{{ $t("settings.updatePassword") }}</PtButton>
  </form>
</template>
