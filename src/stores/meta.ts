import { defineStore } from "pinia";
import { ref } from "vue";
import { labelsApi, metaApi } from "@/api/endpoints";
import type { Label, Meta } from "@/types/models";

/** Reference data fetched once per session: palette, icons, labels. */
export const useMetaStore = defineStore("meta", () => {
  const meta = ref<Meta | null>(null);
  const labels = ref<Label[]>([]);

  async function load(force = false): Promise<void> {
    if (meta.value && !force) return;
    const [m, l] = await Promise.all([metaApi.get(), labelsApi.list()]);
    meta.value = m;
    labels.value = l;
  }

  async function reloadLabels(): Promise<void> {
    labels.value = await labelsApi.list();
  }

  const palette = (): string[] => Object.values(meta.value?.colors ?? {});

  return { meta, labels, load, reloadLabels, palette };
});
