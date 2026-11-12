<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import ActivityFeed from "@/components/activity/ActivityFeed.vue";
import { activityApi, usersApi, type ActivityQuery } from "@/api/endpoints";
import type { ActivityEvent, User } from "@/types/models";

/** The full audit log for super admins: sign-ins, views and every change. */
const EVENTS: ActivityEvent[] = [
  "login", "logout", "login_failed", "viewed", "created", "updated", "deleted",
  "status_changed", "completed", "reopened", "assigned", "unassigned", "commented",
];
const SUBJECTS = ["task", "board", "project", "status", "label", "user"];

const users = ref<User[]>([]);
const filters = reactive({ event: "", user_id: "" as number | "", subject_type: "", from: "", to: "" });

const query = computed<ActivityQuery>(() => ({
  event: filters.event ? [filters.event] : undefined,
  user_id: filters.user_id || undefined,
  subject_type: filters.subject_type || undefined,
  from: filters.from || undefined,
  to: filters.to || undefined,
}));

const loader = (params: ActivityQuery, signal?: AbortSignal) => activityApi.list(params, { signal });

onMounted(async () => {
  users.value = await usersApi.directory();
});
</script>

<template>
  <div class="flex flex-col gap-6">
    <header>
      <h1 class="text-3xl font-bold">{{ $t("activity.title") }}</h1>
      <p class="mt-1 text-sm text-muted">{{ $t("activity.subtitle") }}</p>
    </header>

    <div class="flex flex-wrap gap-2">
      <select v-model="filters.event" class="pt-field w-auto rounded-full bg-surface py-2">
        <option value="">{{ $t("activity.allEvents") }}</option>
        <option v-for="event in EVENTS" :key="event" :value="event">{{ $t(`activity.events.${event}`, { name: "…" }) }}</option>
      </select>
      <select v-model="filters.user_id" class="pt-field w-auto rounded-full bg-surface py-2">
        <option value="">{{ $t("activity.allUsers") }}</option>
        <option v-for="user in users" :key="user.id" :value="user.id">{{ user.name }}</option>
      </select>
      <select v-model="filters.subject_type" class="pt-field w-auto rounded-full bg-surface py-2">
        <option value="">—</option>
        <option v-for="subject in SUBJECTS" :key="subject" :value="subject">{{ $t(`activity.subjects.${subject}`) }}</option>
      </select>
      <input v-model="filters.from" type="date" class="pt-field w-auto rounded-full bg-surface py-2" :aria-label="$t('projects.startsOn')" />
      <input v-model="filters.to" type="date" class="pt-field w-auto rounded-full bg-surface py-2" :aria-label="$t('projects.endsOn')" />
    </div>

    <section class="pt-card px-5 py-2">
      <ActivityFeed :loader="loader" :filters="query" />
    </section>
  </div>
</template>
