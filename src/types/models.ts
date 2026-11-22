/** Shapes returned by the Pilotask API (Laravel resources). */

/** viewer: read-only, sees whole projects and analytics of their entities. */
export type Role = "super_admin" | "admin" | "user" | "viewer";
export type Locale = "fr" | "en" | "ar";
export type ThemePreference = "light" | "dark" | "system";
export type Priority = "low" | "medium" | "high" | "urgent";
export type StatusCategory = "todo" | "in_progress" | "done" | "canceled";
export type NotificationTopic =
  | "task_created"
  | "task_assigned"
  | "deadline_approaching"
  | "task_completed"
  | "status_changed"
  | "mentioned"
  | "commented"
  | "item_changed"
  | "observed";
export type ReportFrequency = "daily" | "weekly" | "monthly";
export type ReportPreferences = Partial<Record<ReportFrequency, boolean>>;
export type NotificationPreferences = Partial<Record<NotificationTopic, { mail?: boolean; push?: boolean }>>;

/** A company / branch / department: its admins and users only reach its projects. */
export interface Entity {
  id: number;
  name: string;
  color: string | null;
  icon: string | null;
  description: string | null;
  /** Team visibility for simple users (null = follow the workspace). */
  users_see_team_tasks?: boolean | null;
  users_count?: number;
  projects_count?: number;
}

export interface User {
  id: number;
  name: string;
  avatar_url: string | null;
  job_title: string | null;
  role: Role;
  /** Set when the account has been deleted: its name is kept on past work. */
  deleted?: boolean;
  /** Entities the person belongs to; empty = all entities (global). */
  entity_ids?: number[];
  entities?: Entity[];
  /** In a project's member list. */
  project_role?: "manager";
  /** Signed-in person only: projects they manage as a simple user. */
  managed_project_ids?: number[];
  email?: string;
  is_active?: boolean;
  locale?: Locale;
  theme?: ThemePreference;
  last_login_at?: string | null;
  created_at?: string;
  notification_preferences?: NotificationPreferences;
  report_preferences?: ReportPreferences;
  /** Signed-in person only: whether others may @mention them in comments. */
  allow_mentions?: boolean;
}

export interface Status {
  id: number;
  board_id: number;
  name: string;
  /** Set on the four default statuses only; custom statuses are free (null). */
  category: StatusCategory | null;
  color: string;
  position: number;
  is_default: boolean;
  /** On single-table responses: how many tasks sit in this status. */
  tasks_count?: number;
}

export interface Label {
  id: number;
  name: string;
  color: string;
  tasks_count?: number;
}

export interface Project {
  id: number;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  starts_on: string | null;
  ends_on: string | null;
  archived_at: string | null;
  created_at: string;
  entity_id?: number | null;
  entity?: Entity | null;
  managers?: User[];
  boards?: Board[];
  tasks_count?: number;
  done_count?: number;
  /** What the signed-in person may do: edit, run tables & tasks, administer (delete, entity, managers). */
  can?: { update: boolean; manage: boolean; administer: boolean };
}

/** A "table" of a project. */
export interface Board {
  id: number;
  project_id: number;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  /** Team visibility for simple users (null = follow the entity, then the workspace). */
  users_see_team_tasks?: boolean | null;
  /** Effective value (table > entity > workspace), on single-table responses. */
  team_tasks_visible?: boolean;
  position: number;
  /** Set when the table is archived (kept, but out of the way). */
  archived_at?: string | null;
  created_at: string;
  project?: Project;
  statuses?: Status[];
  tasks_count?: number;
  done_count?: number;
  /** Run this table's tasks and statuses (admins of its entity, its project managers). */
  can?: { manage: boolean };
}

export interface Task {
  id: number;
  board_id: number;
  status_id: number;
  title: string;
  description?: string | null;
  priority: Priority;
  color: string | null;
  start_at: string | null;
  due_at: string | null;
  completed_at: string | null;
  /** Optional self-reported progress, 0–100 (null = not tracked). */
  progress: number | null;
  position: number;
  /** Set when the task is archived (kept, but out of the way). */
  archived_at?: string | null;
  is_overdue: boolean;
  created_at: string;
  updated_at: string;
  status?: Status;
  board?: Board & { statuses?: Status[] };
  creator?: User;
  assignees?: User[];
  labels?: Label[];
  comments_count?: number;
  /** People with read-only access to this task only (detail view). */
  observers?: User[];
  is_observer?: boolean;
  can?: { update: boolean; move: boolean; delete: boolean; comment: boolean; observers?: boolean };
}

export type ObserverRequestStatus = "pending" | "approved" | "rejected";

/** A person's ask to observe tasks they cannot see; a manager decides. */
export interface ObserverRequest {
  id: number;
  message: string;
  status: ObserverRequestStatus;
  decision_message: string | null;
  created_at: string;
  decided_at: string | null;
  project?: { id: number; name: string };
  requester?: User;
  decider?: User;
  /** Tasks granted on approval (the kept request↔task link). */
  tasks?: { id: number; title: string; board_id: number }[];
}

export interface Comment {
  id: number;
  task_id: number;
  body: string;
  edited_at: string | null;
  created_at: string;
  author?: User;
  mentions?: User[];
  attachments?: Attachment[];
  can: { update: boolean; delete: boolean };
}

/** File sent with a comment. URLs are signed and expire after a couple of hours. */
export interface Attachment {
  id: string;
  kind: "image" | "file";
  name: string;
  extension: string;
  mime: string;
  size: number;
  width: number | null;
  height: number | null;
  url: string;
  preview_url: string | null;
  download_url: string;
  opens_inline: boolean;
  created_at: string;
}

export interface UploadRulesMeta {
  images: { extensions: string[]; max_bytes: number };
  files: { extensions: string[]; max_bytes: number };
  max_per_comment: number;
  image_edge: number;
}

export type ActivityEvent =
  | "login"
  | "logout"
  | "login_failed"
  | "created"
  | "updated"
  | "deleted"
  | "viewed"
  | "status_changed"
  | "moved"
  | "assigned"
  | "unassigned"
  | "commented"
  | "completed"
  | "reopened"
  | "observer_added"
  | "observer_removed";

export interface ActivityLog {
  id: number;
  event: ActivityEvent;
  subject_type: string | null;
  subject_id: number | null;
  project_id: number | null;
  board_id: number | null;
  task_id: number | null;
  properties: Record<string, any>;
  created_at: string;
  user?: User | null;
  ip_address?: string | null;
  user_agent?: string | null;
}

export interface AppNotification {
  id: string;
  type: NotificationTopic;
  read_at: string | null;
  created_at: string;
  data: {
    kind: NotificationTopic;
    title: string;
    body: string;
    /** App path to open (newer notifications). */
    path?: string;
    task_id: number | null;
    board_id: number | null;
    project_id: number | null;
    actor: Pick<User, "id" | "name" | "avatar_url"> | null;
  };
}

/** Workspace switches set by super admins. */
export interface AccessSettings {
  /** Simple users see the other tasks (read-only) of the tables they have a task in. */
  users_see_team_tasks: boolean;
}

export interface Meta {
  colors: Record<string, string>;
  table_icons: string[];
  priorities: Priority[];
  status_categories: StatusCategory[];
  roles: Role[];
  notification_topics: NotificationTopic[];
  locales: Locale[];
  deadline_warning_hours: number;
  access: AccessSettings;
  uploads?: UploadRulesMeta;
}

export type AnalyticsScopeType = "global" | "project" | "board" | "user";

export interface AnalyticsReport {
  scope: { type: AnalyticsScopeType; id: number | null; from: string; to: string };
  totals: {
    total: number;
    open: number;
    in_progress: number;
    done: number;
    canceled: number;
    overdue: number;
    created_in_period: number;
    completed_in_period: number;
    completion_rate: number | null;
    on_time_rate: number | null;
    avg_cycle_hours: number | null;
  };
  by_category: Record<StatusCategory | "custom", number>;
  by_priority: Record<Priority, number>;
  throughput: { date: string; created: number; completed: number }[];
  people: {
    user: Pick<User, "id" | "name" | "avatar_url"> | null;
    assigned: number;
    open: number;
    done: number;
    completed_in_period: number;
    overdue: number;
    due_soon?: number;
    on_time_rate: number | null;
  }[];
  boards: { board: Pick<Board, "id" | "name" | "color" | "icon" | "project_id"> | null; total: number; done: number; progress: number }[];
  upcoming: (Pick<Task, "id" | "title" | "board_id" | "due_at" | "priority"> & { assignees: User[]; board: Pick<Board, "id" | "name" | "color"> })[];
}

export interface Paginated<T> {
  data: T[];
  meta?: { current_page?: number; last_page?: number; total?: number; next_cursor?: string | null };
  links?: { next?: string | null };
}

/** Payload for creating or editing a task. */
export interface TaskInput {
  title: string;
  description?: string | null;
  priority?: Priority;
  color?: string | null;
  status_id?: number | null;
  start_at?: string | null;
  due_at?: string | null;
  progress?: number | null;
  assignee_ids?: number[];
  label_ids?: number[];
}

