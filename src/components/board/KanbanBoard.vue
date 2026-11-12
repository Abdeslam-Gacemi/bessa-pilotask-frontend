<script setup lang="ts">
import { statusName } from "@/domain/statusName";
import { reactive, ref, watch, onUnmounted } from "vue";
import { VueDraggable, type DraggableEvent } from "vue-draggable-plus";
import { Add01Icon, ArrowShrink01Icon } from "@hugeicons/core-free-icons";
import { useLocalStorage } from "@vueuse/core";
import PtIcon from "@/components/ui/PtIcon.vue";
import TaskCard from "@/components/tasks/TaskCard.vue";
import { haptics } from "@/services/haptics";
import type { Status, Task } from "@/types/models";

/**
 * Status columns with drag & drop (mouse and touch). Reordering and moving
 * between columns emit `move` with the column's new order; the parent
 * persists it.
 */
const props = withDefaults(
  defineProps<{ columns: { status: Status; tasks: Task[] }[]; canCreate: boolean; canDrag: (task: Task) => boolean; boardId?: number; reorder?: boolean }>(),
  { reorder: true },
);

// Folded columns shrink to a slim strip (name + count); remembered per table on this device.
const folded = useLocalStorage<number[]>(`pt.kanban.folded.${props.boardId ?? 0}`, []);
const isFolded = (statusId: number) => folded.value.includes(statusId);
function toggleFold(statusId: number): void {
  folded.value = isFolded(statusId) ? folded.value.filter((id) => id !== statusId) : [...folded.value, statusId];
}
const emit = defineEmits<{
  open: [task: Task];
  move: [payload: { task: Task; statusId: number; index: number; ordered: Task[] }];
  create: [status: Status];
}>();

// Local, mutable copies the drag library can reorder in place.
const lists = reactive<Record<number, Task[]>>({});
watch(
  () => props.columns,
  (columns) => {
    for (const column of columns) lists[column.status.id] = [...column.tasks];
  },
  { immediate: true, deep: true },
);

function dropped(statusId: number, event: DraggableEvent<Task>): void {
  const index = event.newIndex ?? 0;
  const task = lists[statusId]?.[index];
  if (task) emit("move", { task, statusId, index, ordered: [...lists[statusId]!] });
}

// ─── Drag loop: edge auto-scroll + a tilt that follows the hand ──────────
// Sortable moves the clone itself (inline transform, no easing: it sticks to the
// finger). On top, one rAF loop drives a damped spring for the tilt, from the
// pointer's speed, time-based so it feels the same at 60 and 120 Hz. Only the
// spring smooths (no CSS transition on top), which keeps it fluid, not wobbly.
const container = ref<HTMLElement | null>(null);
let rafId = 0;
let dragging = false;
let pointerX = 0;
let lastX = 0;
let lastTime = 0;
let speed = 0; // px/ms, lightly smoothed
let tilt = 0; // deg
let tiltVelocity = 0;
let clone: HTMLElement | null = null;
// Where the card was grabbed, in px from its top-left: the clone pivots and
// grows around that point, so it stays under the finger (no up/down bob).
let grab = { x: 0, y: 0 };
// Last press position (Sortable doesn't always hand the start event over, e.g. after the touch delay).
let press = { x: 0, y: 0 };
function onPress(event: PointerEvent): void {
  press = { x: event.clientX, y: event.clientY };
}

const MAX_TILT = 4; // deg
const TILT_PER_SPEED = 5; // deg per (px/ms)
const STIFFNESS = 0.0009; // spring, per ms²
const DAMPING = 0.055; // per ms (≈ critically damped: no overshoot wobble)
const EDGE = 100; // px from the strip edge that starts auto-scroll
const MAX_SCROLL = 1.1; // px/ms at the very edge

function readX(event: MouseEvent | TouchEvent): void {
  const point = "touches" in event ? event.touches[0] : event;
  if (point) pointerX = point.clientX;
}

function frame(now: number): void {
  if (!dragging) return;
  const dt = Math.min(32, now - lastTime || 16);
  lastTime = now;

  // Pointer speed → target lean (right = clockwise), back to upright when the hand stops.
  const instant = (pointerX - lastX) / dt;
  lastX = pointerX;
  speed += (instant - speed) * Math.min(1, dt / 50);
  const target = Math.max(-MAX_TILT, Math.min(MAX_TILT, speed * TILT_PER_SPEED));
  tiltVelocity += ((target - tilt) * STIFFNESS - tiltVelocity * DAMPING) * dt;
  tilt += tiltVelocity * dt;

  if (!clone) {
    clone = document.querySelector<HTMLElement>(".pt-drag-fallback");
    clone?.style.setProperty("transform-origin", `${grab.x}px ${grab.y}px`);
  }
  clone?.style.setProperty("--pt-tilt", `${tilt.toFixed(2)}deg`);

  // Auto-scroll the column strip when the card nears an edge (eased in).
  const el = container.value;
  if (el) {
    const rect = el.getBoundingClientRect();
    const x = pointerX - rect.left;
    if (x < EDGE) el.scrollLeft -= MAX_SCROLL * dt * (1 - Math.max(x, 0) / EDGE) ** 2;
    else if (x > rect.width - EDGE) el.scrollLeft += MAX_SCROLL * dt * (1 - Math.max(rect.width - x, 0) / EDGE) ** 2;
  }
  rafId = requestAnimationFrame(frame);
}

function onDragStart(event: DraggableEvent<Task>): void {
  haptics.tap();
  const original = (event as unknown as { originalEvent?: MouseEvent | TouchEvent }).originalEvent;
  if (original) readX(original);
  const point = original && ("touches" in original ? original.touches[0] : original);
  const at = point && Number.isFinite(point.clientX) ? { x: point.clientX, y: point.clientY } : press;
  const rect = (event.item as HTMLElement | undefined)?.getBoundingClientRect();
  grab = rect
    ? { x: Math.min(Math.max(at.x - rect.left, 0), rect.width), y: Math.min(Math.max(at.y - rect.top, 0), rect.height) }
    : { x: 0, y: 0 };
  if (!point) pointerX = at.x;
  lastX = pointerX;
  lastTime = performance.now();
  speed = 0;
  tilt = 0;
  tiltVelocity = 0;
  clone = null;
  dragging = true;
  document.documentElement.classList.add("pt-dragging");
  window.addEventListener("mousemove", readX, { passive: true });
  window.addEventListener("touchmove", readX, { passive: true, capture: true });
  // Free sliding while dragging; snap comes back on drop.
  if (container.value) container.value.style.scrollSnapType = "none";
  rafId = requestAnimationFrame(frame);
}

function stopLoop(): void {
  dragging = false;
  cancelAnimationFrame(rafId);
  window.removeEventListener("mousemove", readX);
  window.removeEventListener("touchmove", readX, { capture: true });
  document.documentElement.classList.remove("pt-dragging");
  clone = null;
}

function onDragEnd(event: DraggableEvent<Task>): void {
  stopLoop();
  // The card lands with a short settle instead of snapping into place.
  const item = event.item as HTMLElement | undefined;
  if (item) {
    item.classList.remove("pt-drop-settle");
    void item.offsetWidth; // restart the animation
    item.classList.add("pt-drop-settle");
    item.addEventListener("animationend", () => item.classList.remove("pt-drop-settle"), { once: true });
  }
  requestAnimationFrame(() => {
    if (container.value) container.value.style.scrollSnapType = "";
  });
}

// ─── Mouse: grab the empty background to slide the columns sideways ──────
// (touch already scrolls natively; cards keep their own drag).
const panning = ref(false);
let panStartX = 0;
let panStartScroll = 0;

function onPanStart(event: PointerEvent): void {
  const el = container.value;
  if (event.pointerType !== "mouse" || event.button !== 0 || !el) return;
  if ((event.target as HTMLElement).closest("button, a, input, [draggable], .pt-task-card")) return;
  panning.value = true;
  panStartX = event.clientX;
  panStartScroll = el.scrollLeft;
  window.addEventListener("pointermove", onPanMove);
  window.addEventListener("pointerup", onPanEnd, { once: true });
}

function onPanMove(event: PointerEvent): void {
  if (container.value) container.value.scrollLeft = panStartScroll - (event.clientX - panStartX);
}

function onPanEnd(): void {
  panning.value = false;
  window.removeEventListener("pointermove", onPanMove);
}

onUnmounted(() => {
  stopLoop();
  onPanEnd();
});

</script>

<template>
  <div
    ref="container"
    class="pt-scroll-x pt-kanban-strip -mx-4 items-start gap-4 px-4 pb-4 select-none md:-mx-8 md:snap-none md:px-8"
    :class="panning && 'cursor-grabbing'"
    @pointerdown.capture="onPress"
    @pointerdown="onPanStart"
  >
    <template v-for="(column, columnIndex) in columns" :key="column.status.id">
    <!-- Folded column: a slim strip, tap to open it again. -->
    <button
      v-if="isFolded(column.status.id)"
      v-stagger="columnIndex"
      type="button"
      class="pt-kanban-folded flex w-12 shrink-0 snap-start flex-col items-center gap-3 rounded-(--radius-sheet) bg-surface-3/60 py-3 transition hover:bg-surface-3"
      :aria-label="$t('boards.unfold', { name: statusName(column.status) })"
      :aria-expanded="false"
      @click="toggleFold(column.status.id)"
    >
      <span class="size-2.5 shrink-0 rounded-full" :style="{ background: column.status.color }" />
      <span class="rounded-full bg-surface px-1.5 py-0.5 text-[11px] font-bold text-muted tabular-nums">{{ lists[column.status.id]?.length ?? 0 }}</span>
      <span class="text-sm font-bold whitespace-nowrap [writing-mode:vertical-rl] rtl:rotate-180">{{ statusName(column.status) }}</span>
    </button>
    <section
      v-else
      v-stagger="columnIndex"
      class="flex w-[85vw] max-w-80 shrink-0 snap-start flex-col rounded-(--radius-sheet) bg-surface-3/60 p-2.5 sm:w-80"
    >
      <header class="flex items-center gap-2 px-2 pt-1 pb-3">
        <span class="size-2.5 rounded-full" :style="{ background: column.status.color }" />
        <h3 class="flex-1 truncate text-sm font-bold">{{ statusName(column.status) }}</h3>
        <span class="rounded-full bg-surface px-2 py-0.5 text-xs font-bold text-muted">{{ lists[column.status.id]?.length ?? 0 }}</span>
        <button
          type="button"
          class="grid size-7 place-items-center rounded-full text-muted transition hover:bg-surface hover:text-fg"
          :aria-label="$t('boards.fold')"
          :title="$t('boards.fold')"
          :aria-expanded="true"
          @click="toggleFold(column.status.id)"
        >
          <PtIcon :icon="ArrowShrink01Icon" :size="15" />
        </button>
        <button
          v-if="canCreate"
          type="button"
          class="grid size-7 place-items-center rounded-full text-muted transition hover:bg-surface hover:text-fg"
          :aria-label="$t('tasks.quickAdd')"
          @click="$emit('create', column.status)"
        >
          <PtIcon :icon="Add01Icon" :size="16" />
        </button>
      </header>

      <VueDraggable
        v-model="lists[column.status.id]!"
        group="tasks"
        :sort="reorder"
        :animation="220"
        easing="cubic-bezier(0.2, 0.9, 0.25, 1)"
        :delay="140"
        :delay-on-touch-only="true"
        :touch-start-threshold="4"
        :force-fallback="true"
        :fallback-on-body="true"
        :fallback-tolerance="4"
        :scroll-sensitivity="90"
        :scroll-speed="14"
        :bubble-scroll="true"
        :prevent-on-filter="false"
        ghost-class="pt-drag-ghost"
        chosen-class="pt-drag-chosen"
        fallback-class="pt-drag-fallback"
        filter=".pt-no-drag"
        class="flex min-h-24 flex-col gap-2.5 px-0.5 pb-1"
        @start="onDragStart"
        @end="onDragEnd"
        @add="(e: DraggableEvent<Task>) => dropped(column.status.id, e)"
        @update="(e: DraggableEvent<Task>) => dropped(column.status.id, e)"
      >
        <TaskCard
          v-for="(task, index) in lists[column.status.id]"
          :key="task.id"
          v-stagger="index"
          :task="task"
          :class="!canDrag(task) && 'pt-no-drag'"
          @open="$emit('open', $event)"
        />
      </VueDraggable>

      <button
        v-if="canCreate"
        type="button"
        class="mt-1 flex items-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-semibold text-muted transition hover:bg-surface hover:text-fg"
        @click="$emit('create', column.status)"
      >
        <PtIcon :icon="Add01Icon" :size="16" />
        {{ $t("tasks.quickAdd") }}
      </button>
    </section>
    </template>
  </div>
</template>
