<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { refDebounced } from "@vueuse/core";
import { Add01Icon, Search01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import PtAvatar from "./PtAvatar.vue";
import PtIcon from "./PtIcon.vue";
import PtPopover from "./PtPopover.vue";
import PtSkeleton from "./PtSkeleton.vue";
import { useRequest } from "@/composables/useRequest";
import { usersApi } from "@/api/endpoints";
import type { User } from "@/types/models";

/** Multi-select of people, searchable, shown as removable avatar chips. */
const props = defineProps<{ projectId?: number; disabled?: boolean }>();
const model = defineModel<User[]>({ default: () => [] });

const open = ref(false);
const search = ref("");
const debounced = refDebounced(search, 250);
const results = ref<User[]>([]);
const request = useRequest();
const loading = request.loading;

watch([open, debounced], async ([isOpen]) => {
  if (!isOpen) return;
  const found = await request
    .run((signal) => usersApi.directory({ search: debounced.value || undefined, project_id: props.projectId }, { signal }))
    .catch(() => undefined);
  if (found) results.value = found;
});

const selectedIds = computed(() => new Set(model.value.map((u) => u.id)));

function toggle(user: User): void {
  model.value = selectedIds.value.has(user.id) ? model.value.filter((u) => u.id !== user.id) : [...model.value, user];
}
</script>

<template>
  <!-- The add button comes first, so it (and its popover) stays put while people are added. -->
  <div class="flex flex-wrap items-center gap-2">
    <PtPopover v-if="!disabled" v-model="open" width="18rem">
      <template #trigger="{ toggle: toggleOpen }">
        <button type="button" class="pt-chip h-9 border-dashed text-muted hover:text-fg" @click="toggleOpen">
          <PtIcon :icon="Add01Icon" :size="16" />
          {{ $t("common.add") }}
        </button>
      </template>
      <div class="relative mb-1.5">
        <PtIcon :icon="Search01Icon" :size="16" class="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-subtle" />
        <input v-model="search" class="pt-field py-2 ps-9" :placeholder="$t('common.search')" autofocus />
      </div>
      <div class="relative max-h-64 overflow-y-auto" :aria-busy="loading">
        <span v-if="loading && results.length" class="pt-bar-loading sticky top-0 z-10 block h-0.5" />
        <template v-if="loading && !results.length">
          <div v-for="i in 4" :key="i" class="flex items-center gap-2.5 px-2 py-2">
            <PtSkeleton class="size-[30px] shrink-0 rounded-full" />
            <span class="flex-1 space-y-1.5">
              <PtSkeleton class="h-3 rounded-full" :class="['w-32', 'w-24', 'w-28', 'w-20'][i - 1]" />
              <PtSkeleton class="h-2.5 w-16 rounded-full" />
            </span>
          </div>
        </template>
        <button
          v-for="user in results"
          :key="user.id"
          type="button"
          class="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-start transition hover:bg-surface-3"
          @click="toggle(user)"
        >
          <PtAvatar :name="user.name" :src="user.avatar_url" :size="30" />
          <span class="min-w-0 flex-1">
            <span class="block truncate text-sm font-semibold">{{ user.name }}</span>
            <span v-if="user.job_title" class="block truncate text-xs text-muted">{{ user.job_title }}</span>
          </span>
          <PtIcon v-if="selectedIds.has(user.id)" :icon="Tick02Icon" :size="18" class="text-primary" />
        </button>
        <p v-if="!results.length && !loading" class="px-2 py-4 text-center text-sm text-muted">{{ $t("common.noResults") }}</p>
      </div>
    </PtPopover>
    <button
      v-for="(user, i) in model"
      :key="user.id"
      v-stagger="i"
      type="button"
      class="pt-chip h-9 ps-1 hover:border-danger/40"
      :disabled="disabled"
      :title="$t('common.delete')"
      @click="toggle(user)"
    >
      <PtAvatar :name="user.name" :src="user.avatar_url" :size="22" />
      {{ user.name }}
    </button>
  </div>
</template>
