<script setup lang="ts">
import { computed } from "vue";
import { useMetaStore } from "@/stores/meta";

/** Toggle chips for the global labels. */
defineProps<{ disabled?: boolean }>();
const model = defineModel<number[]>({ default: () => [] });
const meta = useMetaStore();
const selected = computed(() => new Set(model.value));

function toggle(id: number): void {
  model.value = selected.value.has(id) ? model.value.filter((x) => x !== id) : [...model.value, id];
}
</script>

<template>
  <div class="flex flex-wrap gap-2">
    <button
      v-for="label in meta.labels"
      :key="label.id"
      type="button"
      :disabled="disabled"
      class="pt-chip"
      :style="selected.has(label.id) ? { background: label.color, borderColor: label.color, color: '#fff' } : undefined"
      @click="toggle(label.id)"
    >
      <span class="size-2 rounded-full" :style="{ background: selected.has(label.id) ? '#fff' : label.color }" />
      {{ label.name }}
    </button>
  </div>
</template>
