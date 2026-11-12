<script setup lang="ts">
import { Search01Icon } from "@hugeicons/core-free-icons";
import PtButton from "@/components/ui/PtButton.vue";
import PtEmpty from "@/components/ui/PtEmpty.vue";
</script>

<template>
  <PtEmpty :icon="Search01Icon" :title="$t('errors.notFound')" :hint="$t('errors.notFoundHint')">
    <PtButton @click="$router.push('/')">{{ $t("nav.home") }}</PtButton>
  </PtEmpty>
</template>
