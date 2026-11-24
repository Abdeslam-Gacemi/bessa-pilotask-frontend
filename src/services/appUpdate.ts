import { Capacitor } from "@capacitor/core";
import { appApi } from "@/api/endpoints";
import { safeDownloadUrl } from "@/services/downloadUrl";
import type { AppRelease } from "@/types/models";

/**
 * In-app update for the Android build. We compare the running versionCode
 * (Capacitor `App.getInfo().build`) with the current server release; if the
 * server is newer we return it so the UI can offer an optional update.
 */
export async function checkForAndroidUpdate(): Promise<AppRelease | null> {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") return null;

  try {
    const { App } = await import("@capacitor/app");
    const info = await App.getInfo();
    const current = Number.parseInt(info.build, 10) || 0;

    const release = await appApi.latest();
    if (!release.available || !release.version_code) return null;

    return release.version_code > current ? release : null;
  } catch {
    return null;
  }
}

/**
 * Downloads the APK to the app cache, then hands it to the system installer
 * through the share sheet ("Open with…" → Package installer). The OS runs the
 * actual install; the app cannot do it silently.
 */
export async function installAndroidUpdate(release: AppRelease): Promise<void> {
  if (!release.download_url) return;

  const { Filesystem, Directory } = await import("@capacitor/filesystem");
  const { Share } = await import("@capacitor/share");

  const { path } = await Filesystem.downloadFile({
    url: safeDownloadUrl(release.download_url),
    path: `updates/pilotask-${release.version_name ?? "latest"}.apk`,
    directory: Directory.Cache,
    recursive: true,
  });

  const uri = path ? (path.startsWith("file:") || path.startsWith("content:") ? path : `file://${path}`) : null;
  if (uri) await Share.share({ title: `Pilotask ${release.version_name ?? ""}`.trim(), files: [uri] }).catch(() => undefined);
}
