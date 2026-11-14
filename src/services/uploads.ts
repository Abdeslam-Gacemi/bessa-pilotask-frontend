import type { Meta } from "@/types/models";

/**
 * Upload rules shared with the API (GET /meta → uploads), checked here first so
 * a wrong file is refused at once instead of after a long upload. The server
 * checks everything again, by content.
 */
export type UploadKind = "image" | "file";
export type UploadRules = NonNullable<Meta["uploads"]>;

const MB = 1024 * 1024;

export const DEFAULT_UPLOAD_RULES: UploadRules = {
  images: { extensions: ["jpg", "jpeg", "png", "webp", "svg"], max_bytes: 20 * MB },
  files: { extensions: ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx"], max_bytes: 200 * MB },
  max_per_comment: 10,
  image_edge: 2560,
};

export const extensionOf = (name: string): string => (name.includes(".") ? (name.split(".").pop() ?? "").toLowerCase() : "");

export type Classified =
  | { ok: true; kind: UploadKind; extension: string }
  | { ok: false; reason: "type" | "imageTooLarge" | "fileTooLarge" | "empty"; max?: number };

export function classify(file: File, rules: UploadRules): Classified {
  const extension = extensionOf(file.name);
  const kind: UploadKind | null = rules.images.extensions.includes(extension) ? "image" : rules.files.extensions.includes(extension) ? "file" : null;
  if (!kind) return { ok: false, reason: "type" };
  if (file.size === 0) return { ok: false, reason: "empty" };
  const max = kind === "image" ? rules.images.max_bytes : rules.files.max_bytes;
  if (file.size > max) return { ok: false, reason: kind === "image" ? "imageTooLarge" : "fileTooLarge", max };
  return { ok: true, kind, extension };
}

/** Value for <input type="file" accept>. */
export const acceptOf = (rules: UploadRules, kinds: UploadKind[] = ["image", "file"]): string =>
  [...(kinds.includes("image") ? rules.images.extensions : []), ...(kinds.includes("file") ? rules.files.extensions : [])].map((e) => `.${e}`).join(",");

/** 1 536 000 → "1,5 Mo" (units from the translations, numbers from the locale). */
export function formatSize(bytes: number, units: string[], locale: string): string {
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  const digits = unit === 0 || value >= 100 ? 0 : 1;
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(value)} ${units[unit]}`;
}

/** Office and PDF families, for icons and labels. */
export function familyOf(extension: string): "pdf" | "word" | "excel" | "powerpoint" | "image" {
  if (extension === "pdf") return "pdf";
  if (extension === "doc" || extension === "docx") return "word";
  if (extension === "xls" || extension === "xlsx") return "excel";
  if (extension === "ppt" || extension === "pptx") return "powerpoint";
  return "image";
}

/**
 * Large photos are shrunk on the device before they are sent: a 12 MB phone
 * picture becomes ~1 MB, which is much faster on a mobile connection. The
 * server optimises again anyway. SVG, small pictures and anything that does not
 * get smaller are sent as they are.
 */
export async function prepareImage(file: File, edge: number): Promise<File> {
  const extension = extensionOf(file.name);
  if (extension === "svg" || typeof createImageBitmap !== "function") return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return file; // the server will say what is wrong with it
  }
  const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size < 1.5 * MB) {
    bitmap.close();
    return file;
  }

  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const encode = (type: string) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.86));
  let blob = await encode("image/webp");
  // Browsers without a WebP encoder return PNG: use JPEG, unless transparency matters.
  if (!blob || blob.type !== "image/webp") blob = extension === "png" ? null : await encode("image/jpeg");
  if (!blob || blob.size >= file.size) return file;

  const ext = blob.type === "image/webp" ? "webp" : "jpg";
  return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.${ext}`, { type: blob.type, lastModified: file.lastModified });
}
