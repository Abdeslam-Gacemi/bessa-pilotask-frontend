<script setup lang="ts">
defineProps<{ label?: string; error?: string; hint?: string; for?: string; optional?: boolean }>();
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label v-if="label" :for="$props.for" class="pt-label flex items-center gap-1">
      {{ label }}
      <span v-if="optional" class="font-normal text-subtle">· {{ $t("common.optional") }}</span>
    </label>
    <slot />
    <p v-if="error" data-pt-field-error class="text-xs font-medium text-danger">{{ error }}</p>
    <p v-else-if="hint" class="text-xs text-subtle">{{ hint }}</p>
  </div>
</template>
