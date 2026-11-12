<script setup lang="ts">
import { onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useTaskUi } from "@/composables/useTaskUi";

/** Deep link /tasks/:id (notifications, e-mails): opens the drawer over My tasks. */
const props = defineProps<{ id: number }>();
const router = useRouter();
const taskUi = useTaskUi();

onMounted(async () => {
  await router.replace("/my-tasks");
  taskUi.openTask(props.id);
});
watch(
  () => props.id,
  (id) => taskUi.openTask(id),
);
</script>

<template>
  <div />
</template>
