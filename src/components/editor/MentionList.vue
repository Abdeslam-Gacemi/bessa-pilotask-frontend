<script setup lang="ts">
import { ref, watch } from "vue";
import PtAvatar from "@/components/ui/PtAvatar.vue";
import PtSkeleton from "@/components/ui/PtSkeleton.vue";
import type { User } from "@/types/models";

/** The @mention suggestion list; keyboard navigation is driven by RichEditor. */
const props = defineProps<{ items: User[]; loading?: boolean; command: (item: { id: number; label: string }) => void }>();
const selected = ref(0);

watch(
  () => props.items,
  () => (selected.value = 0),
);

function choose(index: number): void {
  const user = props.items[index];
  if (user) props.command({ id: user.id, label: user.name });
}

function onKeyDown(event: KeyboardEvent): boolean {
  if (!props.items.length) return false;
  if (event.key === "ArrowDown") {
    selected.value = (selected.value + 1) % props.items.length;
    return true;
  }
  if (event.key === "ArrowUp") {
    selected.value = (selected.value + props.items.length - 1) % props.items.length;
    return true;
  }
  if (event.key === "Enter" || event.key === "Tab") {
    choose(selected.value);
    return true;
  }
  return false;
}

defineExpose({ onKeyDown });
</script>

<template>
  <div class="relative z-[5000] w-60 overflow-hidden rounded-2xl border border-line bg-surface p-1.5 shadow-float" :aria-busy="loading">
    <!-- Thin progress bar while a search runs over results already shown. -->
    <span v-if="loading && items.length" class="pt-bar-loading absolute inset-x-0 top-0 h-0.5" />
    <template v-if="loading && !items.length">
      <div v-for="i in 3" :key="i" class="flex items-center gap-2 px-2 py-1.5">
        <PtSkeleton class="size-6 shrink-0 rounded-full" />
        <PtSkeleton class="h-3 rounded-full" :class="['w-28', 'w-20', 'w-24'][i - 1]" />
      </div>
    </template>
    <button
      v-for="(user, index) in items"
      :key="user.id"
      type="button"
      class="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-start text-sm"
      :class="index === selected ? 'bg-surface-3' : 'hover:bg-surface-2'"
      @mousedown.prevent="choose(index)"
    >
      <PtAvatar :name="user.name" :src="user.avatar_url" :size="24" />
      <span class="truncate font-semibold">{{ user.name }}</span>
    </button>
    <p v-if="!items.length && !loading" class="px-2 py-2 text-xs text-muted">{{ $t("common.noResults") }}</p>
  </div>
</template>
