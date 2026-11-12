<script setup lang="ts">
import { defineAsyncComponent } from "vue";
import { useSessionStore } from "@/stores/session";

/**
 * Home: managers and viewers get the "what needs action" view; everyone
 * else gets their own day (tasks, week progress, projects).
 */
const ManagerHome = defineAsyncComponent(() => import("@/views/home/ManagerHome.vue"));
const HomeView = defineAsyncComponent(() => import("@/views/HomeView.vue"));
const session = useSessionStore();
</script>

<template>
  <ManagerHome v-if="session.hasOverview" />
  <HomeView v-else />
</template>
