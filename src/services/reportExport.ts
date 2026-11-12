import { Capacitor } from "@capacitor/core";

/**
 * Turns the analytics screen into a PDF report: the element is drawn as an
 * image (so Arabic, colours and charts look exactly as on screen), cut into A4
 * pages at block boundaries, then downloaded or handed to the share sheet
 * (native share on phones, Web Share where the browser has it).
 *
 * The heavy libraries load only when someone exports.
 */

const PAGE = { width: 210, height: 297, margin: 10 }; // A4, mm

export interface ExportOptions {
  fileName: string;
  /** Element children marked with this attribute are kept whole on one page when possible. */
  blockSelector?: string;
}

/** Renders `element` into a multi-page PDF blob. */
export async function renderPdf(element: HTMLElement, { blockSelector = "[data-export-block]" }: Partial<ExportOptions> = {}): Promise<Blob> {
  const [{ toCanvas }, { jsPDF }] = await Promise.all([import("html-to-image"), import("jspdf")]);

  element.classList.add("pt-exporting");
  // Let the export-only header appear and animations settle before drawing.
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  try {
    const background = getComputedStyle(document.body).backgroundColor || "#ffffff";
    const canvas = await toCanvas(element, {
      pixelRatio: Math.min(2, Math.max(1.5, window.devicePixelRatio || 1)),
      backgroundColor: background,
      cacheBust: true,
      filter: (node) => !(node instanceof HTMLElement && node.dataset.exportSkip !== undefined),
    });

    const scale = canvas.width / element.offsetWidth; // canvas px per CSS px
    const usableWidth = PAGE.width - PAGE.margin * 2;
    const usableHeight = PAGE.height - PAGE.margin * 2;
    const pxPerMm = canvas.width / usableWidth;
    const pageHeightPx = Math.floor(usableHeight * pxPerMm);

    // Where a page may end: the bottom of each block, so cards are not cut in half.
    const top = element.getBoundingClientRect().top;
    const stops = [...element.querySelectorAll<HTMLElement>(blockSelector)]
      .map((block) => Math.round((block.getBoundingClientRect().bottom - top) * scale))
      .filter((y) => y > 0)
      .sort((a, b) => a - b);

    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
    let start = 0;
    let first = true;
    while (start < canvas.height - 2) {
      let end = Math.min(start + pageHeightPx, canvas.height);
      if (end < canvas.height) {
        const fit = stops.filter((y) => y > start + pageHeightPx * 0.35 && y <= end).pop();
        if (fit) end = fit + Math.round(8 * scale); // keep the gap under the block
        end = Math.min(end, start + pageHeightPx);
      }

      const slice = document.createElement("canvas");
      slice.width = canvas.width;
      slice.height = end - start;
      const ctx = slice.getContext("2d")!;
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, slice.width, slice.height);
      ctx.drawImage(canvas, 0, start, canvas.width, slice.height, 0, 0, canvas.width, slice.height);

      if (!first) pdf.addPage();
      pdf.setFillColor(background);
      pdf.rect(0, 0, PAGE.width, PAGE.height, "F");
      pdf.addImage(slice.toDataURL("image/jpeg", 0.92), "JPEG", PAGE.margin, PAGE.margin, usableWidth, slice.height / pxPerMm, undefined, "FAST");
      first = false;
      start = end;
    }

    return pdf.output("blob");
  } finally {
    element.classList.remove("pt-exporting");
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function download(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement("a"), { href: url, download: fileName });
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Phones: write to the app cache and return its URI (for Share / opening). */
async function saveNative(blob: Blob, fileName: string, directory: "Cache" | "Documents"): Promise<string> {
  const { Filesystem, Directory } = await import("@capacitor/filesystem");
  const { uri } = await Filesystem.writeFile({ path: fileName, data: await blobToBase64(blob), directory: Directory[directory], recursive: true });
  return uri;
}

/**
 * Saves the PDF: a browser download on the web; on phones the file goes to
 * Documents and the share sheet opens so it can be opened or kept.
 */
export async function savePdf(blob: Blob, fileName: string, title: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return download(blob, fileName);
  const uri = await saveNative(blob, fileName, "Documents");
  const { Share } = await import("@capacitor/share");
  await Share.share({ title, files: [uri] }).catch(() => undefined);
}

/** Opens the share sheet with the PDF (falls back to a download where sharing files is not possible). */
export async function sharePdf(blob: Blob, fileName: string, title: string, text?: string): Promise<"shared" | "downloaded"> {
  if (Capacitor.isNativePlatform()) {
    const uri = await saveNative(blob, fileName, "Cache");
    const { Share } = await import("@capacitor/share");
    await Share.share({ title, text, files: [uri], dialogTitle: title });
    return "shared";
  }
  const file = new File([blob], fileName, { type: "application/pdf" });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title, text });
      return "shared";
    } catch (error) {
      if ((error as DOMException)?.name === "AbortError") return "shared";
    }
  }
  download(blob, fileName);
  return "downloaded";
}
