<script setup lang="ts">
defineProps<{ class?: string }>();
</script>

<template>
  <div class="pt-skeleton rounded-2xl" :class="$props.class" />
</template>
