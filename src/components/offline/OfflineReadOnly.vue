<script setup lang="ts">
import { isOffline } from "@/offline/connectivity";

/**
 * Settings and profile while offline: everything stays visible, nothing can
 * be changed (a disabled fieldset turns off every button, switch and field
 * inside at once, keyboard included). With `note`, says why above them.
 * Classes given to it (layout, gaps) apply to the fieldset holding the content.
 */
defineOptions({ inheritAttrs: false });
defineProps<{ note?: boolean }>();
</script>

<template>
  <p v-if="note && isOffline" role="status" class="rounded-2xl bg-warning-soft px-4 py-3 text-sm font-semibold text-warning">
    {{ $t("offline.settingsReadOnly") }}
  </p>
  <fieldset
    v-bind="$attrs"
    :disabled="isOffline"
    class="m-0 min-w-0 border-0 p-0 transition-opacity"
    :class="isOffline && 'cursor-not-allowed opacity-55 select-none'"
  >
    <slot />
  </fieldset>
</template>
