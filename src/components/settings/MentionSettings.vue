<script setup lang="ts">
import { ref } from "vue";
import { AtIcon } from "@hugeicons/core-free-icons";
import PtIcon from "@/components/ui/PtIcon.vue";
import PtSwitch from "@/components/ui/PtSwitch.vue";
import SaveStatus from "@/components/Settings/SaveStatus.vue";
import { useProfileSave } from "@/composables/useProfileSave";
import { useSessionStore } from "@/stores/session";

/** Whether others may @mention (tag) this person in comments. */
const session = useSessionStore();
const { saveSoon, saving } = useProfileSave();

const allowMentions = ref(session.user?.allow_mentions ?? true);

function set(value: boolean): void {
  allowMentions.value = value;
  void saveSoon({ allow_mentions: value });
}
</script>

<template>
  <div v-stagger="0" class="pt-card flex items-start gap-3.5 p-4">
    <span class="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary"><PtIcon :icon="AtIcon" :size="20" /></span>
    <div class="min-w-0 flex-1">
      <p class="text-sm font-semibold">{{ $t("settings.mentionsIntro") }}</p>
      <p class="mt-0.5 text-xs text-muted">{{ $t("settings.mentionsHint") }}</p>
    </div>
    <SaveStatus :saving="saving" class="shrink-0" />
  </div>

  <section v-stagger="1" class="pt-card flex items-center gap-3.5 p-4">
    <span class="grid size-10 shrink-0 place-items-center rounded-2xl bg-surface-3"><PtIcon :icon="AtIcon" :size="18" /></span>
    <PtSwitch
      class="flex-1"
      :model-value="allowMentions"
      :label="$t('settings.allowMentions')"
      :hint="$t('settings.allowMentionsHint')"
      @update:model-value="set"
    />
  </section>
</template>
