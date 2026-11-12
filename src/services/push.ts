import { ref } from "vue";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { notificationsApi } from "@/api/endpoints";

/**
 * Push registration for phones (Capacitor → FCM/APNs) and browsers (Firebase
 * web messaging). Without Firebase web keys the browser keeps the in-app inbox.
 */
type Handlers = { onMessage: () => void; onOpen: (target: { task_id?: string | number | null; path?: string | null }) => void };

const env = import.meta.env;
const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: env.VITE_FIREBASE_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};
const vapidKey = env.VITE_FIREBASE_VAPID_KEY;
const native = Capacitor.isNativePlatform();

export const webPushSupported =
  !native &&
  typeof window !== "undefined" &&
  window.isSecureContext &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId && vapidKey);

export const pushEnabled = ref(false);
let currentToken: string | null = null;

async function registerNative(handlers: Handlers): Promise<void> {
  const permission = await PushNotifications.checkPermissions();
  const granted = permission.receive === "granted" || (await PushNotifications.requestPermissions()).receive === "granted";
  if (!granted) return;

  await PushNotifications.removeAllListeners();
  await PushNotifications.addListener("registration", async ({ value }) => {
    currentToken = value;
    await notificationsApi.registerDevice(value, Capacitor.getPlatform() === "ios" ? "ios" : "android");
    pushEnabled.value = true;
  });
  await PushNotifications.addListener("pushNotificationReceived", () => handlers.onMessage());
  await PushNotifications.addListener("pushNotificationActionPerformed", ({ notification }) => {
    handlers.onOpen({ task_id: notification.data?.task_id ?? null, path: notification.data?.path ?? null });
  });
  await PushNotifications.createChannel?.({ id: "pilotask_tasks", name: "Pilotask", importance: 4 }).catch(() => undefined);
  await PushNotifications.register();
}

async function registerWeb(handlers: Handlers, ask: boolean): Promise<void> {
  if (!webPushSupported) return;
  if (Notification.permission !== "granted") {
    if (!ask || (await Notification.requestPermission()) !== "granted") return;
  }

  const [{ initializeApp, getApps }, { getMessaging, getToken, onMessage, isSupported }] = await Promise.all([
    import("firebase/app"),
    import("firebase/messaging"),
  ]);
  if (!(await isSupported())) return;

  const app = getApps()[0] ?? initializeApp(firebaseConfig);
  const query = new URLSearchParams(firebaseConfig as Record<string, string>).toString();
  const registration = await navigator.serviceWorker.register(`/firebase-messaging-sw.js?${query}`, {
    scope: "/firebase-cloud-messaging-push-scope",
  });
  const messaging = getMessaging(app);
  currentToken = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
  if (!currentToken) return;

  await notificationsApi.registerDevice(currentToken, "web");
  pushEnabled.value = true;
  onMessage(messaging, () => handlers.onMessage());
}

/** Starts push for the signed-in person. `ask` shows the browser prompt (only after a user gesture). */
export async function startPush(handlers: Handlers, ask = false): Promise<void> {
  try {
    if (native) await registerNative(handlers);
    else await registerWeb(handlers, ask);
  } catch (error) {
    console.warn("Push registration failed", error);
  }
}

/** Unlinks this device before signing out, so the next person does not get the previous one's alerts. */
export async function stopPush(): Promise<void> {
  if (!currentToken) return;
  await notificationsApi.unregisterDevice(currentToken).catch(() => undefined);
  currentToken = null;
  pushEnabled.value = false;
}
