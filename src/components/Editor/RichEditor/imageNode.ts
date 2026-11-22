import { Node, mergeAttributes } from "@tiptap/vue-3";

/**
 * Block image for the rich-text editor (no extra package): `<img src alt>`.
 *
 * While a file uploads, the node shows the local preview (blob URL) dimmed,
 * with a progress ring; once the server answers, the src is swapped for the
 * real one (see RichEditor.insertImages). Any image still downloading shows
 * a shimmer until it has loaded.
 */

/** Upload progress listeners, by upload id (the node view registers itself). */
const progressViews = new Map<string, (percent: number) => void>();

export function reportUploadProgress(uploadId: string, percent: number): void {
  progressViews.get(uploadId)?.(percent);
}

/** Shimmer while an <img> downloads; a quiet placeholder if it fails. Used by the editor and read-only text. */
export function trackImageLoading(img: HTMLImageElement): void {
  if (img.dataset.ptTracked) return;
  img.dataset.ptTracked = "1";
  const done = () => img.classList.remove("pt-img-loading");
  if (img.complete && img.naturalWidth > 0) return;
  img.classList.add("pt-img-loading");
  img.addEventListener("load", done, { once: true });
  img.addEventListener(
    "error",
    () => {
      done();
      img.classList.add("pt-img-error");
    },
    { once: true },
  );
}

const RING = 2 * Math.PI * 16;

export const ImageNode = Node.create({
  name: "image",
  group: "block",
  draggable: true,
  atom: true,

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: null },
      title: { default: null },
      // Editor-only state, never written to the saved HTML.
      uploadId: { default: null, rendered: false },
    };
  },

  parseHTML() {
    return [{ tag: "img[src]" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    // An image still uploading has only a local preview: it is not part of the saved text yet.
    if (node.attrs.uploadId) return ["span", { "data-uploading": "" }];
    return ["img", mergeAttributes(HTMLAttributes, { loading: "lazy" })];
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement("div");
      dom.className = "pt-img-frame";
      dom.style.position = "relative";
      const img = document.createElement("img");
      dom.append(img);

      let overlay: HTMLElement | null = null;
      let ring: SVGCircleElement | null = null;
      let label: HTMLElement | null = null;
      let currentUpload: string | null = null;

      const setProgress = (percent: number) => {
        if (ring) ring.style.strokeDashoffset = String(RING * (1 - percent / 100));
        if (label) label.textContent = `${Math.round(percent)}%`;
      };

      const render = (attrs: Record<string, any>) => {
        if (img.getAttribute("src") !== attrs.src) {
          delete img.dataset.ptTracked;
          img.classList.remove("pt-img-error");
          if (attrs.src) img.setAttribute("src", attrs.src);
          trackImageLoading(img);
        }
        img.alt = attrs.alt ?? "";
        if (attrs.title) img.title = attrs.title;

        const uploading = Boolean(attrs.uploadId);
        dom.classList.toggle("is-uploading", uploading);
        if (uploading && !overlay) {
          overlay = document.createElement("div");
          overlay.className = "pt-img-upload";
          // Sizes, fill and stroke are set inline too: the ring must never fall back to a
          // full-width black disc if a stylesheet is late or stale.
          overlay.style.cssText = "position:absolute;inset:0;display:grid;place-items:center;pointer-events:none";
          overlay.innerHTML =
            `<svg width="48" height="48" viewBox="0 0 40 40" fill="none" aria-hidden="true" style="grid-area:1/1;width:48px;height:48px;transform:rotate(-90deg)">` +
            `<circle cx="20" cy="20" r="16" fill="none" stroke="rgba(255,255,255,0.6)" stroke-width="4" class="track"/>` +
            `<circle cx="20" cy="20" r="16" fill="none" stroke="#326899" stroke-width="4" stroke-linecap="round" class="bar" stroke-dasharray="${RING}" stroke-dashoffset="${RING}"/>` +
            `</svg><span style="grid-area:1/1;font-size:10px;font-weight:700;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.5)"></span>`;
          ring = overlay.querySelector("circle.bar");
          label = overlay.querySelector("span");
          dom.append(overlay);
        } else if (!uploading && overlay) {
          overlay.remove();
          overlay = ring = label = null;
        }

        if (currentUpload !== attrs.uploadId) {
          if (currentUpload) progressViews.delete(currentUpload);
          currentUpload = attrs.uploadId;
          if (currentUpload) progressViews.set(currentUpload, setProgress);
        }
      };

      render(node.attrs);

      return {
        dom,
        update: (updated) => {
          if (updated.type.name !== "image") return false;
          render(updated.attrs);
          return true;
        },
        destroy: () => {
          if (currentUpload) progressViews.delete(currentUpload);
        },
      };
    };
  },
});
