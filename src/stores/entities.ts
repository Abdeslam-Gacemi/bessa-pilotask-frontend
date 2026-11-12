import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { entitiesApi } from "@/api/endpoints";
import { useSessionStore } from "@/stores/session";
import type { Entity } from "@/types/models";

/** Entities the signed-in manager can see (all of them for super admins). */
export const useEntitiesStore = defineStore("entities", () => {
  const entities = ref<Entity[]>([]);
  const loaded = ref(false);
  const loading = ref(false);

  async function load(force = false): Promise<Entity[]> {
    if (!useSessionStore().seesWorkspace) return [];
    if (loaded.value && !force) return entities.value;
    loading.value = true;
    try {
      entities.value = await entitiesApi.list();
      loaded.value = true;
    } finally {
      loading.value = false;
    }
    return entities.value;
  }

  const byId = computed(() => new Map(entities.value.map((e) => [e.id, e])));

  return { entities, loaded, loading, load, byId };
});
