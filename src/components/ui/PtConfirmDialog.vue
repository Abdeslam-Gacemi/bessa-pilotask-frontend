<script setup lang="ts">
import { computed } from "vue";
import { Add01Icon, Alert02Icon, Archive01Icon, CheckmarkCircle02Icon, Delete02Icon, Logout01Icon } from "@hugeicons/core-free-icons";
import PtButton from "./PtButton.vue";
import PtIcon from "./PtIcon.vue";
import PtSheet from "./PtSheet.vue";
import { useConfirm } from "@/composables/useConfirm";

const { pending, busy, settle } = useConfirm();
const open = computed({
  get: () => pending.value !== null,
  set: (value) => {
    if (!value) settle(false);
  },
});
const tone = computed(() => pending.value?.tone ?? (pending.value?.danger ? "danger" : "primary"));
const RINGS = { primary: "bg-primary-soft text-primary", warning: "bg-warning-soft text-warning", danger: "bg-danger-soft text-danger" };
const ACTION_ICONS = {
  create: Add01Icon,
  update: CheckmarkCircle02Icon,
  delete: Delete02Icon,
  archive: Archive01Icon,
  unarchive: Archive01Icon,
  logout: Logout01Icon,
};
const TONE_ICONS = { primary: CheckmarkCircle02Icon, warning: Alert02Icon, danger: Delete02Icon };
const visual = computed(() => ({
  icon: pending.value?.action ? ACTION_ICONS[pending.value.action] : TONE_ICONS[tone.value],
  ring: RINGS[tone.value],
}));
</script>

<template>
  <PtSheet v-model="open" width="26rem">
    <div class="flex flex-col items-center gap-3 px-2 pt-6 pb-2 text-center">
      <span class="grid size-14 place-items-center rounded-full" :class="visual.ring">
        <PtIcon :icon="visual.icon" :size="26" class="rtl:-scale-x-100" />
      </span>
      <h2 class="text-lg font-bold">{{ pending?.title }}</h2>
      <p v-if="pending?.message" class="text-sm text-muted">{{ pending.message }}</p>
    </div>
    <div class="mt-4 grid grid-cols-2 gap-2 pb-1">
      <PtButton variant="secondary" :disabled="busy" @click="settle(false)">{{ $t("common.cancel") }}</PtButton>
      <PtButton :variant="tone === 'danger' ? 'danger' : 'primary'" autofocus :loading="busy" @click="settle(true)">
        {{ pending?.confirmLabel ?? $t("common.confirm") }}
      </PtButton>
    </div>
  </PtSheet>
</template>
