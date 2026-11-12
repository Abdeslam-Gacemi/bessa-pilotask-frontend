<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import {
  Add01Icon,
  CheckmarkCircle02Icon,
  Comment01Icon,
  Delete02Icon,
  Login03Icon,
  Logout01Icon,
  PencilEdit02Icon,
  ArrowDataTransferHorizontalIcon,
  UserAdd01Icon,
  UserRemove01Icon,
  ViewIcon,
  AlertCircleIcon,
  RotateClockwiseIcon,
} from "@hugeicons/core-free-icons";
import PtAvatar from "@/components/ui/PtAvatar.vue";
import PtIcon from "@/components/ui/PtIcon.vue";
import { useDates } from "@/composables/useDates";
import { flowArrow } from "@/plugins/i18n";
import { statusName } from "@/domain/statusName";
import type { Icon } from "@/plugins/icons";
import type { ActivityEvent, ActivityLog, StatusCategory } from "@/types/models";

/** One human sentence per activity entry, with the changed fields underneath. */
const props = defineProps<{ log: ActivityLog; showContext?: boolean }>();
const { t, te } = useI18n();
const { fmt } = useDates();

const ICONS: Record<ActivityEvent, { icon: Icon; tone: string }> = {
  login: { icon: Login03Icon, tone: "bg-success-soft text-success" },
  logout: { icon: Logout01Icon, tone: "bg-surface-3 text-muted" },
  login_failed: { icon: AlertCircleIcon, tone: "bg-danger-soft text-danger" },
  created: { icon: Add01Icon, tone: "bg-primary-soft text-primary" },
  updated: { icon: PencilEdit02Icon, tone: "bg-surface-3 text-fg" },
  deleted: { icon: Delete02Icon, tone: "bg-danger-soft text-danger" },
  viewed: { icon: ViewIcon, tone: "bg-surface-3 text-muted" },
  status_changed: { icon: ArrowDataTransferHorizontalIcon, tone: "bg-warning-soft text-warning" },
  moved: { icon: ArrowDataTransferHorizontalIcon, tone: "bg-warning-soft text-warning" },
  assigned: { icon: UserAdd01Icon, tone: "bg-primary-soft text-primary" },
  unassigned: { icon: UserRemove01Icon, tone: "bg-surface-3 text-muted" },
  commented: { icon: Comment01Icon, tone: "bg-primary-soft text-primary" },
  completed: { icon: CheckmarkCircle02Icon, tone: "bg-success-soft text-success" },
  reopened: { icon: RotateClockwiseIcon, tone: "bg-warning-soft text-warning" },
};

const visual = computed(() => ICONS[props.log.event] ?? ICONS.updated);
const actor = computed(() => props.log.user?.name ?? props.log.properties.email ?? t("activity.someone"));
const verb = computed(() => t(`activity.events.${props.log.event}`, { name: props.log.properties.user?.name ?? "" }));
const subject = computed(() => (props.log.subject_type && te(`activity.subjects.${props.log.subject_type}`) ? t(`activity.subjects.${props.log.subject_type}`) : ""));
const label = computed(() => props.log.properties.label as string | undefined);

function display(value: unknown): string {
  if (value === null || value === undefined || value === "") return "∅";
  if (typeof value === "boolean") return value ? t("common.yes") : t("common.no");
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) return fmt.value.dateTime(value);
  const text = typeof value === "string" ? value.replace(/<[^>]+>/g, " ") : JSON.stringify(value);
  return text.length > 60 ? `${text.slice(0, 60)}…` : text;
}

const changes = computed(() => {
  const { old = {}, new: next = {} } = props.log.properties as { old?: Record<string, unknown>; new?: Record<string, unknown> };
  return Object.keys(next).map((field) => ({
    field: te(`activity.fields.${field}`) ? t(`activity.fields.${field}`) : field,
    from: display(old[field]),
    to: display(next[field]),
  }));
});

const transition = computed(() => {
  const p = props.log.properties as { from?: { name: string; category?: StatusCategory | null }; to?: { name: string; category?: StatusCategory | null } };
  return p.from && p.to ? `${statusName(p.from)} ${flowArrow()} ${statusName(p.to)}` : null;
});
</script>

<template>
  <li class="flex gap-3 py-3">
    <div class="relative">
      <PtAvatar v-if="log.user" :name="log.user.name" :src="log.user.avatar_url" :size="34" />
      <span v-else class="grid size-[34px] place-items-center rounded-full bg-surface-3 text-muted">?</span>
      <span class="absolute -end-1 -bottom-1 grid size-5 place-items-center rounded-full ring-2 ring-surface" :class="visual.tone">
        <PtIcon :icon="visual.icon" :size="11" :stroke="2.2" />
      </span>
    </div>
    <div class="min-w-0 flex-1">
      <p class="text-sm leading-snug">
        <span class="font-bold">{{ actor }}</span>
        {{ " " }}<span class="text-muted">{{ verb }}</span>
        <template v-if="subject"> {{ subject }}</template>
        <span v-if="label" class="font-semibold"> « {{ label }} »</span>
      </p>
      <p v-if="transition" class="mt-1 text-xs font-semibold text-muted">
        {{ transition }}
        <span v-if="log.properties.reason === 'status_deleted'" class="ms-1 rounded-full bg-warning-soft px-2 py-0.5 text-[10px] text-warning">{{ $t("activity.reasons.status_deleted") }}</span>
      </p>
      <p v-if="log.properties.excerpt" class="mt-1 line-clamp-2 text-xs text-muted">“{{ log.properties.excerpt }}”</p>
      <ul v-if="changes.length" class="mt-1.5 flex flex-col gap-1">
        <li v-for="change in changes" :key="change.field" class="rounded-lg bg-surface-2 px-2.5 py-1.5 text-xs text-muted">
          {{ $t("activity.changed", change) }}
        </li>
      </ul>
      <p class="mt-1 flex flex-wrap gap-x-2 text-[11px] text-subtle">
        <time :datetime="log.created_at" :title="fmt.dateTime(log.created_at)">{{ fmt.relative(log.created_at) }}</time>
        <span v-if="log.ip_address">· {{ log.ip_address }}</span>
      </p>
    </div>
  </li>
</template>
