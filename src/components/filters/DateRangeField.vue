<script setup lang="ts">
import type { DayRange } from "@/domain/filters";

/** From / to day pickers side by side; `to` can't be before `from`. */
const model = defineModel<DayRange>({ required: true });
</script>

<template>
  <div class="grid grid-cols-2 gap-2">
    <label class="flex min-w-0 flex-col gap-1">
      <span class="text-[11px] font-semibold text-muted">{{ $t("filters.from") }}</span>
      <input v-model="model.from" type="date" class="pt-field min-w-0" :max="model.to || undefined" />
    </label>
    <label class="flex min-w-0 flex-col gap-1">
      <span class="text-[11px] font-semibold text-muted">{{ $t("filters.to") }}</span>
      <input v-model="model.to" type="date" class="pt-field min-w-0" :min="model.from || undefined" />
    </label>
  </div>
</template>
