import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import type { Router } from "vue-router";
import { closeTopmostOverlay } from "@/composables/useOverlay";
import { useToast } from "@/composables/useToast";
import { i18n } from "@/plugins/i18n";

const EXIT_WINDOW = 2000;

/**
 * Android back button handler:
 * 1. If an overlay/sheet/popup is open, close it.
 * 2. If not on home route ("/"): navigate back in app history.
 *    If history has nowhere to go or fails, redirect to home ("/").
 * 3. If on home route ("/"): toast "press back again to exit"; second press exits app.
 */
export function installBackButton(router: Router): void {
  if (!Capacitor.isNativePlatform()) return;
  // One listener only, even if the module is evaluated twice (HMR, duplicated chunk).
  const flag = globalThis as { __ptBackButton?: boolean };
  if (flag.__ptBackButton) return;
  flag.__ptBackButton = true;
  let lastPress = 0;

  void App.addListener("backButton", () => {
    // 1. Sheet, dialog, or popover open -> close topmost overlay.
    if (closeTopmostOverlay()) return;

    const currentPath = router.currentRoute.value.path;
    const isHome = currentPath === "/" || router.currentRoute.value.name === "home";

    // 2. Not at home -> go back, or go home if cannot go back.
    if (!isHome) {
      if (window.history.state?.back) {
        router.back();
      } else {
        void router.replace("/");
      }
      return;
    }

    // 3. At home -> require double press to exit.
    const now = Date.now();
    if (now - lastPress < EXIT_WINDOW) {
      void App.exitApp();
    } else {
      lastPress = now;
      useToast().show(i18n.global.t("common.pressAgainToExit"));
    }
  });
}
