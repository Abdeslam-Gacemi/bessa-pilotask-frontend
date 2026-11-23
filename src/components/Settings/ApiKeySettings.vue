<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { useI18n } from "vue-i18n";
import { Add01Icon, Copy01Icon, KeyframeIcon, Tick02Icon } from "@hugeicons/core-free-icons";
import PtButton from "@/components/ui/PtButton.vue";
import PtField from "@/components/ui/PtField.vue";
import PtIcon from "@/components/ui/PtIcon.vue";
import PtSwitch from "@/components/ui/PtSwitch.vue";
import PtSheet from "@/components/ui/PtSheet.vue";
import PtSkeleton from "@/components/ui/PtSkeleton.vue";
import PtEmpty from "@/components/ui/PtEmpty.vue";
import { apiKeysApi } from "@/api/endpoints";
import { useApiError } from "@/composables/useApiError";
import { useConfirm } from "@/composables/useConfirm";
import { useDates } from "@/composables/useDates";
import { useToast } from "@/composables/useToast";
import type { ApiAbility, ApiKey } from "@/types/models";

/** Super admins issue and revoke API keys (read / write / apk upload, optional expiry). */
const { t } = useI18n();
const { fmt } = useDates();
const { confirm } = useConfirm();
const toast = useToast();
const errors = useApiError();

const ABILITIES: ApiAbility[] = ["read", "write", "apk_upload"];

const keys = ref<ApiKey[]>([]);
const loading = ref(true);

const open = ref(false);
const creating = ref(false);
const form = reactive({ name: "", abilities: new Set<ApiAbility>(["read"]), expires_at: "" });
// The plaintext token, shown once right after creation.
const fresh = ref<ApiKey | null>(null);
const copied = ref(false);

const canSubmit = computed(() => form.name.trim().length > 0 && form.abilities.size > 0);

async function load(): Promise<void> {
  loading.value = true;
  try {
    keys.value = await apiKeysApi.list();
  } catch (error) {
    errors.report(error);
  } finally {
    loading.value = false;
  }
}
onMounted(load);

function newKey(): void {
  form.name = "";
  form.abilities = new Set<ApiAbility>(["read"]);
  form.expires_at = "";
  fresh.value = null;
  copied.value = false;
  open.value = true;
}

function toggle(ability: ApiAbility, on: boolean): void {
  if (on) form.abilities.add(ability);
  else form.abilities.delete(ability);
}

async function submit(): Promise<void> {
  if (!canSubmit.value || creating.value) return;
  creating.value = true;
  try {
    const key = await apiKeysApi.create({
      name: form.name.trim(),
      abilities: [...form.abilities],
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
    });
    fresh.value = key; // reveals the token panel
    await load();
  } catch (error) {
    errors.report(error);
  } finally {
    creating.value = false;
  }
}

async function copyToken(): Promise<void> {
  if (!fresh.value?.token) return;
  try {
    await navigator.clipboard.writeText(fresh.value.token);
    copied.value = true;
    toast.success(t("apiKeys.copied"));
  } catch {
    // Clipboard blocked: leave the token on screen for a manual copy.
  }
}

async function revoke(key: ApiKey): Promise<void> {
  const ok = await confirm({
    title: t("apiKeys.revokeTitle"),
    message: t("apiKeys.revokeMessage", { name: key.name }),
    confirmLabel: t("apiKeys.revoke"),
    tone: "danger",
    action: "delete",
    run: () => apiKeysApi.revoke(key.id),
  });
  if (ok) {
    toast.success(t("apiKeys.revoked"));
    await load();
  }
}

function state(key: ApiKey): { label: string; tone: string } {
  if (key.revoked_at) return { label: t("apiKeys.stateRevoked"), tone: "bg-danger-soft text-danger" };
  if (!key.active) return { label: t("apiKeys.stateExpired"), tone: "bg-warning-soft text-warning" };
  return { label: t("apiKeys.stateActive"), tone: "bg-success-soft text-success" };
}
</script>

<template>
  <div v-stagger="0" class="flex items-center justify-between gap-3">
    <p class="text-sm text-muted">{{ $t("apiKeys.intro") }}</p>
    <PtButton size="sm" :icon="Add01Icon" @click="newKey">{{ $t("apiKeys.new") }}</PtButton>
  </div>

  <div v-if="loading" v-stagger="1" class="flex flex-col gap-2"><PtSkeleton class="h-16" /><PtSkeleton class="h-16" /></div>

  <PtEmpty v-else-if="!keys.length" v-stagger="1" :icon="KeyframeIcon" :title="$t('apiKeys.emptyTitle')" :hint="$t('apiKeys.emptyHint')" />

  <ul v-else v-stagger="1" class="flex flex-col gap-2">
    <li v-for="key in keys" :key="key.id" class="pt-card flex items-center gap-3 p-4">
      <span class="grid size-10 shrink-0 place-items-center rounded-2xl bg-surface-3"><PtIcon :icon="KeyframeIcon" :size="18" /></span>
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-2">
          <p class="truncate text-sm font-semibold">{{ key.name }}</p>
          <span class="rounded-full px-2 py-0.5 text-[11px] font-bold" :class="state(key).tone">{{ state(key).label }}</span>
        </div>
        <p class="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted">
          <code class="font-mono">{{ key.prefix }}…</code>
          <span v-for="a in key.abilities" :key="a" class="rounded bg-surface-3 px-1.5 py-0.5 font-semibold">{{ $t(`apiKeys.abilities.${a}`) }}</span>
          <span v-if="key.last_used_at">· {{ $t("apiKeys.lastUsed", { when: fmt.relative(key.last_used_at) }) }}</span>
          <span v-else>· {{ $t("apiKeys.neverUsed") }}</span>
          <span v-if="key.expires_at && !key.revoked_at">· {{ $t("apiKeys.expires", { when: fmt.relative(key.expires_at) }) }}</span>
        </p>
      </div>
      <PtButton v-if="!key.revoked_at" variant="ghost" size="sm" @click="revoke(key)">{{ $t("apiKeys.revoke") }}</PtButton>
    </li>
  </ul>

  <PtSheet v-model="open" :title="fresh ? $t('apiKeys.createdTitle') : $t('apiKeys.new')" width="30rem" :busy="creating">
    <!-- After creation: the token, shown once. -->
    <div v-if="fresh" class="flex flex-col gap-4 px-5 pb-5 md:px-6">
      <p class="text-sm text-muted">{{ $t("apiKeys.tokenOnce") }}</p>
      <div class="flex items-center gap-2 rounded-2xl border border-line bg-surface-2 p-3">
        <code class="min-w-0 flex-1 break-all font-mono text-xs">{{ fresh.token }}</code>
        <PtButton size="sm" variant="soft" :icon="copied ? Tick02Icon : Copy01Icon" @click="copyToken">
          {{ copied ? $t("apiKeys.copiedShort") : $t("apiKeys.copy") }}
        </PtButton>
      </div>
    </div>

    <!-- Create form. -->
    <form v-else class="flex flex-col gap-4 px-5 pb-5 md:px-6" @submit.prevent="submit">
      <PtField :label="$t('apiKeys.name')">
        <input v-model="form.name" class="pt-field" maxlength="80" autofocus :placeholder="$t('apiKeys.namePlaceholder')" />
      </PtField>

      <PtField :label="$t('apiKeys.abilitiesLabel')">
        <div class="flex flex-col gap-2.5 rounded-2xl border border-line p-3">
          <PtSwitch
            v-for="a in ABILITIES"
            :key="a"
            :model-value="form.abilities.has(a)"
            :label="$t(`apiKeys.abilities.${a}`)"
            :hint="$t(`apiKeys.abilityHints.${a}`)"
            @update:model-value="(v) => toggle(a, v)"
          />
        </div>
      </PtField>

      <PtField :label="$t('apiKeys.expiry')" optional :hint="$t('apiKeys.expiryHint')">
        <input v-model="form.expires_at" type="date" class="pt-field" />
      </PtField>
    </form>

    <template #footer>
      <PtButton v-if="fresh" variant="primary" @click="open = false">{{ $t("common.done") }}</PtButton>
      <template v-else>
        <PtButton variant="ghost" @click="open = false">{{ $t("common.cancel") }}</PtButton>
        <PtButton variant="primary" :loading="creating" :disabled="!canSubmit" @click="submit">{{ $t("apiKeys.create") }}</PtButton>
      </template>
    </template>
  </PtSheet>
</template>
