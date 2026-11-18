import { registerPlugin, type PluginListenerHandle } from "@capacitor/core";

/** State of the copy kept on the phone (android/…/offline/OfflineSyncPlugin.java). */
export interface OfflineStatus {
  configured: boolean;
  syncing: boolean;
  wifiOnly: boolean;
  /** Epoch milliseconds; 0 = never. */
  lastSuccessAt: number;
  lastAttemptAt: number;
  lastError?: string;
  tasks: number;
  comments: number;
  bytes: number;
  /** Only on syncNow(). */
  outcome?: "synced" | "busy" | "not_configured" | "unauthorized" | "failed";
}

/** Lists come back as JSON text, parsed once here rather than field by field by the bridge. */
interface JsonResult {
  json?: string;
}

export type OfflineScope = "open" | "done" | "shared";

/** Lists kept beside the tasks: profile, app settings, labels, projects, the inbox's first page. */
export type OfflineDocument = "me" | "meta" | "labels" | "projects" | "notifications";

export interface SyncProgress {
  done: number;
  total: number;
}

interface OfflineSyncPlugin {
  configure(options: { baseUrl: string; token: string; userId: number; language: string }): Promise<OfflineStatus>;
  clear(): Promise<OfflineStatus>;
  setWifiOnly(options: { value: boolean }): Promise<OfflineStatus>;
  syncNow(): Promise<OfflineStatus>;
  getStatus(): Promise<OfflineStatus>;
  listTasks(options: { scope: OfflineScope; search?: string }): Promise<JsonResult>;
  getTask(options: { id: number }): Promise<JsonResult>;
  listComments(options: { taskId: number }): Promise<JsonResult>;
  getDocument(options: { key: OfflineDocument }): Promise<JsonResult>;
  addListener(event: "stateChange", listener: (status: OfflineStatus) => void): Promise<PluginListenerHandle>;
  /** While a sync applies its changes, a few times a second at most. */
  addListener(event: "progress", listener: (progress: SyncProgress) => void): Promise<PluginListenerHandle>;
}

export const OfflineSync = registerPlugin<OfflineSyncPlugin>("OfflineSync");
