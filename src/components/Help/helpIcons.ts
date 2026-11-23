import {
  Analytics01Icon,
  Calendar03Icon,
  CheckListIcon,
  Folder01Icon,
  HelpCircleIcon,
  Message01Icon,
  Rocket01Icon,
  Shield01Icon,
  UserIcon,
} from "@hugeicons/core-free-icons";
import type { HelpIconKey } from "@/help/types";
import type { Icon } from "@/plugins/icons";

/** Icon and tone of each help section (content files only name the key). */
export const HELP_ICONS: Record<HelpIconKey, { icon: Icon; tone: string }> = {
  start: { icon: Rocket01Icon, tone: "bg-primary-soft text-primary" },
  projects: { icon: Folder01Icon, tone: "bg-success-soft text-success" },
  tasks: { icon: CheckListIcon, tone: "bg-warning-soft text-warning" },
  comments: { icon: Message01Icon, tone: "bg-[#EFE8FD] text-[#6C4FD1] dark:bg-[#2A2340] dark:text-[#B9A6FF]" },
  calendar: { icon: Calendar03Icon, tone: "bg-danger-soft text-danger" },
  analytics: { icon: Analytics01Icon, tone: "bg-primary-soft text-primary" },
  admin: { icon: Shield01Icon, tone: "bg-surface-3 text-fg" },
  account: { icon: UserIcon, tone: "bg-success-soft text-success" },
  faq: { icon: HelpCircleIcon, tone: "bg-warning-soft text-warning" },
};
