<script setup lang="ts">
import { computed } from "vue";
import PtAvatar from "./PtAvatar.vue";
import type { User } from "@/types/models";

const props = withDefaults(defineProps<{ users: Pick<User, "id" | "name" | "avatar_url">[]; max?: number; size?: number }>(), {
  max: 3,
  size: 26,
});

const shown = computed(() => props.users.slice(0, props.max));
const extra = computed(() => props.users.length - shown.value.length);
</script>

<template>
  <div class="flex items-center -space-x-2 rtl:space-x-reverse">
    <PtAvatar v-for="user in shown" :key="user.id" :name="user.name" :src="user.avatar_url" :size="size" ring />
    <span
      v-if="extra > 0"
      class="grid place-items-center rounded-full bg-ink text-[10px] font-bold text-on-ink ring-2 ring-surface"
      :style="{ width: `${size}px`, height: `${size}px` }"
    >
      +{{ extra }}
    </span>
  </div>
</template>
