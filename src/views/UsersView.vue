<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { refDebounced } from "@vueuse/core";
import { Add01Icon, Delete02Icon, PencilEdit02Icon, Search01Icon, UserMultipleIcon } from "@hugeicons/core-free-icons";
import PtAvatar from "@/components/ui/PtAvatar.vue";
import PtButton from "@/components/ui/PtButton.vue";
import PtField from "@/components/ui/PtField.vue";
import PtIcon from "@/components/ui/PtIcon.vue";
import PtIconButton from "@/components/ui/PtIconButton.vue";
import PtSheet from "@/components/ui/PtSheet.vue";
import PtEmpty from "@/components/ui/PtEmpty.vue";
import PtSkeleton from "@/components/ui/PtSkeleton.vue";
import PtSwitch from "@/components/ui/PtSwitch.vue";
import PtPasswordInput from "@/components/ui/PtPasswordInput.vue";
import EntityBadge from "@/components/entities/EntityBadge.vue";
import FilterChips from "@/components/filters/FilterChips.vue";
import { Alert02Icon } from "@hugeicons/core-free-icons";
import { useEntitiesStore } from "@/stores/entities";
import { usersApi } from "@/api/endpoints";
import { ApiError } from "@/api/client";
import { useApiError } from "@/composables/useApiError";
import { useConfirm } from "@/composables/useConfirm";
import { useRequest } from "@/composables/useRequest";
import { useDates } from "@/composables/useDates";
import { useToast } from "@/composables/useToast";
import { useSessionStore } from "@/stores/session";
import type { Locale, Role, User } from "@/types/models";

const { t } = useI18n();
const session = useSessionStore();
const errors = useApiError();
const toast = useToast();
const { confirm, confirmAction } = useConfirm();
const { fmt } = useDates();

const request = useRequest();
const users = ref<User[]>([]);
const search = ref("");
const debounced = refDebounced(search, 300);
const open = ref(false);
const editing = ref<User | null>(null);
const saving = ref(false);
const fieldErrors = ref<Record<string, string>>({});
const form = reactive({
  name: "",
  email: "",
  password: "",
  password_confirmation: "",
  role: "user" as Role,
  job_title: "",
  locale: "fr" as Locale,
  is_active: true,
  entity_ids: [] as number[],
});
const entityStore = useEntitiesStore();
const entityFilter = ref<number | null>(null);
// People and entities are managed by super admins; admins look people up, read-only.
const canManagePeople = computed(() => session.isSuperAdmin);
const showEntities = computed(() => canManagePeople.value && entityStore.entities.length > 0);
const entityOptions = computed(() => entityStore.entities.map((e) => ({ value: e.id, label: e.name, color: e.color })));

const assignableRoles = (): Role[] => ["super_admin", "admin", "viewer", "user"];

async function load(): Promise<void> {
  try {
    const page = await request.run((signal) =>
      usersApi.list({ search: debounced.value || undefined, entity_id: entityFilter.value ?? undefined }, { signal }),
    );
    if (page) users.value = page.data;
  } catch (error) {
    errors.report(error);
  }
}

function edit(user: User | null): void {
  editing.value = user;
  fieldErrors.value = {};
  Object.assign(form, {
    name: user?.name ?? "",
    email: user?.email ?? "",
    password: "",
    password_confirmation: "",
    role: user?.role ?? "user",
    entity_ids: [...(user?.entity_ids ?? [])],
    job_title: user?.job_title ?? "",
    locale: user?.locale ?? "fr",
    is_active: user?.is_active ?? true,
  });
  open.value = true;
}

async function submit(): Promise<void> {
  fieldErrors.value = {};
  if (form.password && form.password !== form.password_confirmation) {
    fieldErrors.value = { password_confirmation: t("users.passwordMismatch") };
    return;
  }
  if (!(await confirmAction(editing.value ? "update" : "create", "user", form.name))) return;
  saving.value = true;
  fieldErrors.value = {};
  const payload = {
    ...form,
    job_title: form.job_title || null,
    password: form.password || undefined,
    password_confirmation: form.password ? form.password_confirmation : undefined,
  };
  try {
    if (editing.value) await usersApi.update(editing.value.id, payload);
    else await usersApi.create({ ...payload, password: form.password, password_confirmation: form.password_confirmation });
    open.value = false;
    toast.success(t("common.saved"));
    await load();
  } catch (error) {
    if (error instanceof ApiError && Object.keys(error.fields).length) {
      fieldErrors.value = Object.fromEntries(Object.entries(error.fields).map(([k, v]) => [k, v[0] ?? ""]));
    } else errors.report(error);
  } finally {
    saving.value = false;
  }
}

async function remove(user: User): Promise<void> {
  try {
    const run = () => usersApi.remove(user.id);
    if (!(await confirm({ title: t("users.deleteConfirm", { name: user.name }), danger: true, confirmLabel: t("common.delete"), run }))) return;
    users.value = users.value.filter((u) => u.id !== user.id);
  } catch (error) {
    errors.report(error);
  }
}

const canEdit = (_user: User) => canManagePeople.value;

// Leaving an entity takes its projects, tables and tasks away: preview it in the form.
const impactRequest = useRequest();
const impact = ref<Awaited<ReturnType<typeof usersApi.entityImpact>> | null>(null);
const entitiesChanged = computed(() => {
  const before = [...(editing.value?.entity_ids ?? [])].sort().join(",");
  return Boolean(editing.value) && before !== [...form.entity_ids].sort().join(",");
});
watch(
  () => [open.value, [...form.entity_ids]],
  async () => {
    impact.value = null;
    if (!open.value || !editing.value || !entitiesChanged.value || !form.entity_ids.length) return;
    const id = editing.value.id;
    const result = await impactRequest.run((signal) => usersApi.entityImpact(id, form.entity_ids, { signal })).catch(() => undefined);
    if (result) impact.value = result;
  },
  { deep: true },
);

watch([debounced, entityFilter], load);
onMounted(() => {
  void load();
  void entityStore.load().catch(() => undefined);
});
</script>

<template>
  <div class="flex flex-col gap-6">
    <header class="flex flex-wrap items-end gap-3">
      <div class="me-auto">
        <h1 class="text-3xl font-bold">{{ $t("users.title") }}</h1>
        <p class="mt-1 text-sm text-muted">{{ canManagePeople ? $t("users.subtitle") : $t("users.readOnly") }}</p>
      </div>
      <PtIconButton v-if="canManagePeople" :icon="Add01Icon" variant="ink" :label="$t('users.new')" @click="edit(null)" />
    </header>

    <div class="flex flex-wrap items-center gap-2">
      <div class="relative w-full max-w-md">
        <PtIcon :icon="Search01Icon" :size="18" class="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-subtle" />
        <input v-model="search" class="pt-field bg-surface ps-11" :placeholder="$t('common.search')" />
      </div>
      <div v-if="showEntities" class="pt-scroll-x -mx-4 w-[calc(100%+2rem)] gap-2 px-4 md:mx-0 md:w-auto md:px-0">
        <button
          type="button"
          class="h-9 shrink-0 rounded-full border px-3.5 text-xs font-semibold transition"
          :class="entityFilter === null ? 'border-ink bg-ink text-on-ink' : 'border-line bg-surface hover:bg-surface-2'"
          @click="entityFilter = null"
        >
          {{ $t("tasks.all") }}
        </button>
        <button
          v-for="entity in entityStore.entities"
          :key="entity.id"
          type="button"
          class="inline-flex h-9 shrink-0 items-center gap-2 rounded-full border px-3.5 text-xs font-semibold transition"
          :class="entityFilter === entity.id ? 'border-ink bg-ink text-on-ink' : 'border-line bg-surface hover:bg-surface-2'"
          @click="entityFilter = entity.id"
        >
          <span class="size-2 rounded-full" :style="{ background: entity.color ?? 'var(--pt-subtle)' }" />
          {{ entity.name }}
        </button>
      </div>
    </div>

    <section v-if="request.loading.value && !users.length" class="pt-card flex flex-col gap-2 p-3">
      <div v-for="i in 6" :key="i" class="flex items-center gap-3 px-2 py-2">
        <PtSkeleton class="size-10 rounded-full" />
        <div class="flex-1 space-y-2"><PtSkeleton class="h-3.5 w-1/3" /><PtSkeleton class="h-3 w-1/2" /></div>
        <PtSkeleton class="h-6 w-16 rounded-full max-sm:hidden" />
      </div>
    </section>
    <PtEmpty v-else-if="!users.length" :icon="UserMultipleIcon" :title="$t('common.noResults')" />
    <section v-else class="pt-card divide-y divide-line/60 p-2" :class="request.loading.value && 'opacity-60 transition'">
      <div v-for="(user, i) in users" :key="user.id" v-stagger="i" class="flex items-center gap-3 rounded-2xl px-3 py-3 hover:bg-surface-2">
        <PtAvatar :name="user.name" :src="user.avatar_url" :size="40" />
        <div class="min-w-0 flex-1">
          <p class="flex items-center gap-2 truncate font-semibold">
            {{ user.name }}
            <span v-if="!user.is_active" class="rounded-full bg-danger-soft px-2 py-0.5 text-[11px] text-danger">{{ $t("users.inactive") }}</span>
          </p>
          <p class="truncate text-xs text-muted">{{ user.email }}<template v-if="user.job_title"> · {{ user.job_title }}</template></p>
          <span v-if="canManagePeople && user.entities?.length" class="mt-1 flex flex-wrap gap-1 sm:hidden">
            <EntityBadge v-for="entity in user.entities" :key="entity.id" :entity="entity" />
          </span>
        </div>
        <span v-if="canManagePeople && user.entities?.length" class="flex max-w-56 flex-wrap justify-end gap-1 max-sm:hidden">
          <EntityBadge v-for="entity in user.entities" :key="entity.id" :entity="entity" />
        </span>
        <span v-else-if="showEntities" class="rounded-full bg-surface-3 px-2.5 py-1 text-[11px] font-bold text-muted max-sm:hidden">{{ $t("entities.allShort") }}</span>
        <span class="rounded-full px-2.5 py-1 text-xs font-bold max-sm:hidden" :class="user.role === 'user' ? 'bg-surface-3 text-muted' : 'bg-ink text-on-ink'">
          {{ $t(`users.roles.${user.role}`) }}
        </span>
        <span class="w-36 text-end text-xs text-muted max-md:hidden">
          {{ user.last_login_at ? fmt.relative(user.last_login_at) : $t("users.never") }}
        </span>
        <PtIconButton v-if="canEdit(user)" :icon="PencilEdit02Icon" :size="18" :label="$t('common.edit')" @click="edit(user)" />
        <PtIconButton
          v-if="canEdit(user) && user.id !== session.user?.id"
          :icon="Delete02Icon"
          :size="18"
          class="text-danger"
          :label="$t('common.delete')"
          @click="remove(user)"
        />
      </div>
    </section>

    <PtSheet v-model="open" :title="editing ? $t('users.edit') : $t('users.new')" width="32rem">
      <form class="flex flex-col gap-4 pt-2" @submit.prevent="submit">
        <PtField :label="$t('users.name')" :error="fieldErrors.name"><input v-model="form.name" class="pt-field" required /></PtField>
        <PtField :label="$t('users.email')" :error="fieldErrors.email"><input v-model="form.email" type="email" class="pt-field" required /></PtField>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <PtField :label="$t('users.password')" :hint="editing ? $t('users.passwordHint') : undefined" :error="fieldErrors.password">
            <PtPasswordInput v-model="form.password" autocomplete="new-password" :required="!editing" minlength="8" />
          </PtField>
          <PtField :label="$t('settings.confirmPassword')" :error="fieldErrors.password_confirmation">
            <PtPasswordInput v-model="form.password_confirmation" autocomplete="new-password" :required="!editing || !!form.password" minlength="8" />
          </PtField>
        </div>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <PtField :label="$t('users.role')" :error="fieldErrors.role">
            <select v-model="form.role" class="pt-field">
              <option v-for="role in assignableRoles()" :key="role" :value="role">{{ $t(`users.roles.${role}`) }}</option>
            </select>
          </PtField>
          <PtField :label="$t('settings.language')">
            <select v-model="form.locale" class="pt-field">
              <option value="fr">Français</option>
              <option value="en">English</option>
              <option value="ar">العربية</option>
            </select>
          </PtField>
        </div>
        <PtField v-if="showEntities" :label="$t('entities.entities')" :hint="form.entity_ids.length ? $t('entities.userHint') : $t('entities.allHint')" :error="fieldErrors.entity_ids">
          <FilterChips v-model="form.entity_ids" :options="entityOptions" />
        </PtField>
        <!-- What leaving these entities takes away, before saving. -->
        <div
          v-if="impact && impact.entities.length && (impact.projects.length || impact.tasks || impact.kept)"
          class="flex gap-3 rounded-2xl border border-warning/40 bg-warning-soft p-3.5 text-sm text-fg"
          role="alert"
        >
          <PtIcon :icon="Alert02Icon" :size="20" class="mt-0.5 shrink-0 text-warning" />
          <div class="min-w-0">
            <p class="font-semibold">{{ $t("users.entityImpact.title", { entities: impact.entities.join(", ") }) }}</p>
            <p class="mt-1 text-muted">
              {{ $t("users.entityImpact.body", { projects: impact.projects.length, boards: impact.boards, tasks: impact.tasks }) }}
            </p>
            <p v-if="impact.kept" class="mt-1 text-muted">{{ $t("users.entityImpact.kept", { n: impact.kept }) }}</p>
            <p v-if="impact.projects.length" class="mt-1.5 text-xs text-muted">{{ impact.projects.map((p) => p.name).join(" · ") }}</p>
          </div>
        </div>
        <p v-else-if="entitiesChanged && impactRequest.loading.value" class="text-xs text-muted">{{ $t("common.loading") }}</p>
        <PtField :label="$t('users.jobTitle')" optional><input v-model="form.job_title" class="pt-field" /></PtField>
        <PtSwitch v-model="form.is_active" :label="$t('users.active')" class="rounded-2xl bg-surface-2 px-4 py-3" />
        <button type="submit" class="hidden" />
      </form>
      <template #footer>
        <PtButton variant="ghost" @click="open = false">{{ $t("common.cancel") }}</PtButton>
        <PtButton :loading="saving" @click="submit">{{ $t("common.save") }}</PtButton>
      </template>
    </PtSheet>
  </div>
</template>
