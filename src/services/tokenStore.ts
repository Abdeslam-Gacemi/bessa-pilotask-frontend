import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";

const KEY = "pt.token";
let cached: string | null = null;

/**
 * Keeps the API token in memory for requests, persisted in localStorage on
 * the web and in native preferences on phones (survives WebView resets).
 */
export const tokenStore = {
  async load(): Promise<string | null> {
    if (Capacitor.isNativePlatform()) {
      cached = (await Preferences.get({ key: KEY })).value;
    } else {
      cached = localStorage.getItem(KEY);
    }
    return cached;
  },
  get(): string | null {
    return cached;
  },
  async set(token: string | null): Promise<void> {
    cached = token;
    if (Capacitor.isNativePlatform()) {
      if (token) await Preferences.set({ key: KEY, value: token });
      else await Preferences.remove({ key: KEY });
    } else if (token) {
      localStorage.setItem(KEY, token);
    } else {
      localStorage.removeItem(KEY);
    }
  },
};
