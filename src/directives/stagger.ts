import type { Directive } from "vue";

/**
 * `v-stagger="index"`: list items rise in one after another on first render.
 * The delay is capped so long lists still settle quickly; with reduced motion
 * the global rule shortens it to nothing.
 */
export const stagger: Directive<HTMLElement, number | undefined> = {
  mounted(el, binding) {
    el.style.setProperty("--pt-i", String(Math.min(binding.value ?? 0, 14)));
    el.classList.add("pt-stagger");
    // Children animate too and their events bubble: only this element's own end counts.
    const done = (event: AnimationEvent) => {
      if (event.target !== el) return;
      el.classList.remove("pt-stagger");
      el.removeEventListener("animationend", done);
    };
    el.addEventListener("animationend", done);
  },
};

declare module "vue" {
  interface GlobalDirectives {
    vStagger: typeof stagger;
  }
}
