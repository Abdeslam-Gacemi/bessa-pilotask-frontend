import { Capacitor } from "@capacitor/core";
import type { Attachment } from "@/types/models";

/**
 * Opens or downloads an attachment. In a browser: a new tab (pictures, PDF) or
 * a download. In the phone app: saved to the app cache, then the system share
 * sheet ("Open with…", save, send) — WebViews cannot show PDFs or Office files.
 */
export async function openAttachment(attachment: Attachment, mode: "view" | "download" = "view"): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    const { Filesystem, Directory } = await import("@capacitor/filesystem");
    const { Share } = await import("@capacitor/share");
    const { path } = await Filesystem.downloadFile({
      url: attachment.download_url,
      path: `attachments/${attachment.id}/${attachment.name}`,
      directory: Directory.Cache,
      recursive: true,
    });
    const uri = path ? (path.startsWith("file:") || path.startsWith("content:") ? path : `file://${path}`) : null;
    if (uri) await Share.share({ title: attachment.name, files: [uri] }).catch(() => undefined);
    return;
  }

  if (mode === "view" && attachment.opens_inline) {
    window.open(attachment.url, "_blank", "noopener");
    return;
  }
  const link = document.createElement("a");
  link.href = attachment.download_url;
  link.rel = "noopener";
  link.download = attachment.name;
  document.body.append(link);
  link.click();
  link.remove();
}
