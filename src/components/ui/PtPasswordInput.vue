<script setup lang="ts">
import { ref } from "vue";
import { ViewIcon, ViewOffSlashIcon } from "@hugeicons/core-free-icons";
import PtIcon from "./PtIcon.vue";

/** Password field with a show / hide eye. Extra attributes (autocomplete, required…) go to the input. */
defineOptions({ inheritAttrs: false });
defineProps<{ id?: string; placeholder?: string }>();
const model = defineModel<string>({ required: true });
const reveal = ref(false);
</script>

<template>
  <div class="relative">
    <input :id="id" v-model="model" v-bind="$attrs" :type="reveal ? 'text' : 'password'" :placeholder="placeholder" class="pt-field pe-12" />
    <button
      type="button"
      class="absolute end-1.5 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-muted transition hover:bg-surface-3 hover:text-fg"
      :aria-label="reveal ? $t('auth.hidePassword') : $t('auth.showPassword')"
      :aria-pressed="reveal"
      @click="reveal = !reveal"
    >
      <PtIcon :icon="reveal ? ViewOffSlashIcon : ViewIcon" :size="18" />
    </button>
  </div>
</template>
