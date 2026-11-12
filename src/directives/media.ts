import type { Directive } from "vue";
import { trackImageLoading } from "@/components/editor/imageNode";

/**
 * `v-media` on read-only rich text (v-html): images show a shimmer while they
 * download and a quiet placeholder if they fail, instead of popping in.
 */
function scan(el: HTMLElement): void {
  el.querySelectorAll("img").forEach(trackImageLoading);
}

export const media: Directive<HTMLElement> = {
  mounted: scan,
  updated: scan,
};

declare module "vue" {
  interface GlobalDirectives {
    vMedia: typeof media;
  }
}
