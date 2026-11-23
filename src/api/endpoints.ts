import { http } from "./client";
import type {
  ActivityLog,
  AnalyticsReport,
  AnalyticsScopeType,
  AppNotification,
  Board,
  AccessSettings,
  Comment,
  Entity,
  Label,
  AppRelease,
  ApiKey,
  ApiAbility,
  Meta,
  ObserverRequest,
  Paginated,
  Project,
  Status,
  StatusCategory,
  Task,
  TaskInput,
  User,
  Attachment,
} from "@/types/models";

const data = <T>(promise: Promise<{ data: T }>) => promise.then((response) => response.data);

/** Optional per-call settings; `signal` lets a view abort the request (see useRequest). */
export interface CallOptions {
  signal?: AbortSignal;
}

export type TaskQuery = Partial<{
  board_id: number;
  project_id: number;
  status_id: number;
  category: StatusCategory[];
  assignee_id: number | "me";
  priority: string[];
  label_id: number;
  search: string;
  overdue: boolean;
  open: boolean;
  dated: boolean;
  from: string;
  to: string;
  sort: "position" | "due_at" | "priority" | "created_at" | "updated_at";
  /** Tasks shared with me read-only (observer), outside my usual reach. */
  observed: boolean;
  /** Only the archived tasks (hidden everywhere else). */
  archived: boolean;
}>;

/** Hidden-captcha proof sent with the sign-in (see services/captcha). */
export interface CaptchaProof {
  captcha_token?: string;
  captcha_nonce?: string;
  website?: string;
}

export const authApi = {
  challenge: (o: CallOptions = {}) => data(http.get<{ token: string | null; salt: string | null; difficulty: number }>("/auth/challenge", o)),
  login: (email: string, password: string, proof: CaptchaProof = {}, device_name = "web") =>
    data(http.post<{ token: string; user: User }>("/auth/login", { email, password, device_name, ...proof })),
  me: () => data(http.get<User>("/auth/me")),
  logout: () => http.post("/auth/logout"),
  updateProfile: (payload: FormData | Record<string, unknown>) => data(http.post<User>("/profile", payload)),
};

export const uploadsApi = {
  /** Uploads an editor image and returns its public URL. */
  image: (file: File | Blob, onProgress?: (percent: number) => void) => {
    const body = new FormData();
    body.append("image", file);
    return data(
      http.post<{ url: string }>("/uploads/images", body, {
        timeout: 120_000,
        onUploadProgress: (event) => event.total && onProgress?.((event.loaded / event.total) * 100),
      }),
    );
  },
};

export const metaApi = {
  get: (o: CallOptions = {}) => data(http.get<Meta>("/meta", o)),
};

export const usersApi = {
  list: (params: { search?: string; role?: string; page?: number; entity_id?: number } = {}, o: CallOptions = {}) => data(http.get<Paginated<User>>("/users", { params, ...o })),
  directory: (params: { search?: string; task_id?: number; everyone?: boolean } = {}, o: CallOptions = {}) => data(http.get<User[]>("/users/directory", { params, ...o })),
  create: (payload: Partial<User> & { password: string; password_confirmation: string }) => data(http.post<User>("/users", payload)),
  update: (id: number, payload: Partial<User> & { password?: string; password_confirmation?: string }) => data(http.patch<User>(`/users/${id}`, payload)),
  remove: (id: number) => http.delete(`/users/${id}`),
  /** What saving these entities would take from the person (projects, tables, tasks of the entities left). */
  entityImpact: (id: number, entityIds: number[], o: CallOptions = {}) =>
    data(
      http.get<{ entities: string[]; projects: { id: number; name: string }[]; boards: number; tasks: number; kept: number }>(`/users/${id}/entity-impact`, {
        params: { entity_ids: entityIds },
        ...o,
      }),
    ),
};

export const settingsApi = {
  access: () => data(http.get<AccessSettings>("/settings/access")),
  updateAccess: (payload: Partial<AccessSettings>) => data(http.put<AccessSettings>("/settings/access", payload)),
};

export const entitiesApi = {
  list: (o: CallOptions = {}) => data(http.get<Entity[]>("/entities", o)),
  create: (payload: Partial<Entity>) => data(http.post<Entity>("/entities", payload)),
  update: (id: number, payload: Partial<Entity>) => data(http.patch<Entity>(`/entities/${id}`, payload)),
  remove: (id: number) => http.delete(`/entities/${id}`),
};

export const projectsApi = {
  list: (archived = false, o: CallOptions = {}) => data(http.get<Project[]>("/projects", { params: { archived: archived ? 1 : 0 }, ...o })),
  get: (id: number, o: CallOptions = {}, archived = false) =>
    data(http.get<Project>(`/projects/${id}`, { params: archived ? { archived: 1 } : {}, ...o })),
  create: (payload: Partial<Project> & { manager_ids?: number[] }) => data(http.post<Project>("/projects", payload)),
  update: (id: number, payload: Partial<Project> & { manager_ids?: number[]; archived?: boolean }) =>
    data(http.patch<Project>(`/projects/${id}`, payload)),
  remove: (id: number) => http.delete(`/projects/${id}`),
};

export const boardsApi = {
  get: (id: number, o: CallOptions = {}) => data(http.get<Board>(`/boards/${id}`, o)),
  create: (projectId: number, payload: Partial<Board>) => data(http.post<Board>(`/projects/${projectId}/boards`, payload)),
  update: (id: number, payload: Partial<Board> & { archived?: boolean }) => data(http.patch<Board>(`/boards/${id}`, payload)),
  remove: (id: number) => http.delete(`/boards/${id}`),
  addStatus: (boardId: number, payload: { name: string; color?: string }) =>
    data(http.post<Status>(`/boards/${boardId}/statuses`, payload)),
  updateStatus: (id: number, payload: Partial<Pick<Status, "name" | "category" | "color">>) =>
    data(http.patch<Status>(`/statuses/${id}`, payload)),
  reorderStatuses: (boardId: number, ids: number[]) => data(http.put<Status[]>(`/boards/${boardId}/statuses/order`, { ids })),
  removeStatus: (id: number, moveTo?: number) => http.delete(`/statuses/${id}`, { params: { move_to: moveTo } }),
  activity: (id: number, params: ActivityQuery = {}, o: CallOptions = {}) => data(http.get<Paginated<ActivityLog>>(`/boards/${id}/activity`, { params, ...o })),
};

export const tasksApi = {
  list: (params: TaskQuery, o: CallOptions = {}) => data(http.get<Task[]>("/tasks", { params, ...o })),
  /** Count of my open tasks (assigned + shared), for the nav badge. */
  mineCount: (o: CallOptions = {}) => data(http.get<{ count: number }>("/tasks/mine/count", o)),
  get: (id: number, o: CallOptions = {}) => data(http.get<Task>(`/tasks/${id}`, o)),
  create: (boardId: number, payload: TaskInput) => data(http.post<Task>(`/boards/${boardId}/tasks`, payload)),
  update: (id: number, payload: Partial<TaskInput> & { archived?: boolean }) => data(http.patch<Task>(`/tasks/${id}`, payload)),
  /** Live progress save that never locks the task sheet (background write). */
  setProgress: (id: number, progress: number | null) => data(http.patch<Task>(`/tasks/${id}`, { progress }, { ptBackground: true } as never)),
  move: (id: number, statusId: number, position?: number) =>
    data(http.post<Task>(`/tasks/${id}/move`, { status_id: statusId, position })),
  remove: (id: number) => http.delete(`/tasks/${id}`),
  activity: (id: number, params: ActivityQuery = {}, o: CallOptions = {}) => data(http.get<Paginated<ActivityLog>>(`/tasks/${id}/activity`, { params, ...o })),
  /** Who may read this task (read-only), whatever their other access. */
  setObservers: (id: number, userIds: number[]) => data(http.put<User[]>(`/tasks/${id}/observers`, { user_ids: userIds })),
};

export const commentsApi = {
  list: (taskId: number, o: CallOptions = {}) => data(http.get<Comment[]>(`/tasks/${taskId}/comments`, o)),
  create: (taskId: number, body: string, mention_ids: number[], attachment_ids: string[] = []) =>
    data(http.post<Comment>(`/tasks/${taskId}/comments`, { body, mention_ids, attachment_ids })),
  update: (id: number, body: string, mention_ids: number[], attachment_ids?: string[]) =>
    data(http.patch<Comment>(`/comments/${id}`, { body, mention_ids, attachment_ids })),
  remove: (id: number) => http.delete(`/comments/${id}`),
};

export const attachmentsApi = {
  /** Uploads one comment file; it stays pending until a comment claims it. No timeout: big files on slow links. */
  upload: (taskId: number, file: File, onProgress?: (percent: number) => void, signal?: AbortSignal) => {
    const body = new FormData();
    body.append("file", file);
    return data(
      http.post<Attachment>(`/tasks/${taskId}/attachments`, body, {
        timeout: 0,
        signal,
        onUploadProgress: (event) => event.total && onProgress?.((event.loaded / event.total) * 100),
      }),
    );
  },
  remove: (id: string) => http.delete(`/attachments/${id}`),
};

export const labelsApi = {
  list: () => data(http.get<Label[]>("/labels")),
  create: (payload: Pick<Label, "name" | "color">) => data(http.post<Label>("/labels", payload)),
  update: (id: number, payload: Partial<Pick<Label, "name" | "color">>) => data(http.patch<Label>(`/labels/${id}`, payload)),
  remove: (id: number) => http.delete(`/labels/${id}`),
};

export type ActivityQuery = Partial<{
  event: string[];
  user_id: number;
  project_id: number;
  subject_type: string;
  from: string;
  to: string;
  cursor: string;
  per_page: number;
}>;

export const activityApi = {
  list: (params: ActivityQuery = {}, o: CallOptions = {}) => data(http.get<Paginated<ActivityLog>>("/activity", { params, ...o })),
};

/** Managers' and viewers' home: what needs a decision (GET /dashboard). */
/** The four decision tiles of the managers' home. */
export type DashboardBucket = "overdue" | "due_soon" | "unassigned" | "stalled";

export interface DashboardOverview {
  counts: { overdue: number; due_soon: number; unassigned: number; stalled: number; open: number; done_today: number };
  lists: Record<DashboardBucket, Task[]>;
  projects: {
    id: number;
    name: string;
    color: string | null;
    icon: string | null;
    ends_on: string | null;
    days_left: number | null;
    total: number;
    done: number;
    overdue: number;
    progress: number;
    risk: "late" | "overdue" | "tight";
  }[];
  team: { user: Pick<User, "id" | "name" | "avatar_url">; open: number; overdue: number; due_soon: number }[];
  thresholds: { stall_days: number; soon_hours: number };
  health: { on_track: number; done_week: number };
  trend: { date: string; created: number; completed: number }[];
}

export const dashboardApi = {
  overview: (o: CallOptions = {}) => data(http.get<DashboardOverview>("/dashboard", o)),
  /** One tile's tasks in full, 20 per page. */
  bucket: (bucket: DashboardBucket, page = 1, o: CallOptions = {}) =>
    data(http.get<Paginated<Task>>(`/dashboard/${bucket}`, { params: { page }, ...o })),
};

export const analyticsApi = {
  report: (params: { scope: AnalyticsScopeType; id?: number | null; from?: string; to?: string; entity_id?: number | null }, o: CallOptions = {}) =>
    data(http.get<AnalyticsReport>("/analytics", { params, ...o })),
};

export const appApi = {
  /** Current build info + a fresh signed download link, for signed-in people. */
  latest: (platform: "android" = "android", o: CallOptions = {}) =>
    data(http.get<AppRelease>("/app/releases/latest", { params: { platform }, ...o })),
};

export const apiKeysApi = {
  list: (o: CallOptions = {}) => data(http.get<ApiKey[]>("/api-keys", o)),
  create: (payload: { name: string; abilities: ApiAbility[]; expires_at?: string | null }) => data(http.post<ApiKey>("/api-keys", payload)),
  revoke: (id: number) => http.delete(`/api-keys/${id}`),
};

export const observerRequestsApi = {
  /** The signed-in person's own requests and their outcome. */
  mine: (o: CallOptions = {}) => data(http.get<ObserverRequest[]>("/observer-requests/mine", o)),
  /** Pending requests a decider may act on. */
  pending: (o: CallOptions = {}) => data(http.get<ObserverRequest[]>("/observer-requests", o)),
  create: (payload: { message: string; project_id?: number | null }) => data(http.post<ObserverRequest>("/observer-requests", payload)),
  approve: (id: number, taskIds: number[]) => data(http.post<ObserverRequest>(`/observer-requests/${id}/approve`, { task_ids: taskIds })),
  reject: (id: number, message: string) => data(http.post<ObserverRequest>(`/observer-requests/${id}/reject`, { message })),
};

export const notificationsApi = {
  list: (page = 1, unread = false) =>
    data(http.get<Paginated<AppNotification> & { meta: { unread: number; last_page: number } }>("/notifications", { params: { page, unread: unread ? 1 : 0 } })),
  read: (id: string) => http.post(`/notifications/${id}/read`),
  readAll: () => http.post("/notifications/read-all"),
  /** Sends the signed-in person a test alert on every channel (inbox, e-mail, push). */
  test: () => data(http.post<{ devices: number; mail: string }>("/notifications/test")),
  registerDevice: (token: string, platform: "web" | "android" | "ios") => http.post("/device-tokens", { token, platform }),
  unregisterDevice: (token: string) => http.delete("/device-tokens", { data: { token } }),
};
