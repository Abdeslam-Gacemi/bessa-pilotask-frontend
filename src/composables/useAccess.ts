import { computed } from "vue";
import { useEntitiesStore } from "@/stores/entities";
import { useMetaStore } from "@/stores/meta";
import { useSessionStore } from "@/stores/session";

/**
 * What the signed-in person can reach, for shaping screens and filters:
 * - managers see whole tables (of their entity);
 * - simple users see their own tasks, or the whole tables they work in when
 *   the super admin turned team visibility on (read-only);
 * - global managers (super admins, managers without an entity) can narrow by entity.
 */
export function useAccess() {
  const session = useSessionStore();
  const meta = useMetaStore();
  const entities = useEntitiesStore();

  const canManage = computed(() => session.canManage);
  const isGlobal = computed(() => session.isGlobal);
  /** Whether lists can hold other people's tasks (otherwise "mine" filters are pointless). */
  const seesTeamTasks = computed(() => session.seesWorkspace || Boolean(meta.meta?.access?.users_see_team_tasks));
  /** Entity filter: managers and viewers with more than one entity in reach. */
  const filtersByEntity = computed(() => session.seesWorkspace && entities.entities.length > 1);

  return { canManage, isGlobal, seesTeamTasks, filtersByEntity, entities };
}
