import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";

/**
 * Small, consistent haptic vocabulary. On phones it uses the Taptic engine /
 * vibrator through Capacitor; in browsers the plugin falls back to
 * navigator.vibrate where available. Failures are silent: haptics are a bonus.
 */
const safe = (run: () => Promise<void>) => void run().catch(() => undefined);

export const haptics = {
  /** A light tick: taps on primary buttons, picking an option, starting a drag. */
  tap: () => safe(() => Haptics.impact({ style: ImpactStyle.Light })),
  /** A firmer knock: something opened from a gesture (shake), a card dropped. */
  bump: () => safe(() => Haptics.impact({ style: ImpactStyle.Medium })),
  success: () => safe(() => Haptics.notification({ type: NotificationType.Success })),
  warning: () => safe(() => Haptics.notification({ type: NotificationType.Warning })),
  error: () => safe(() => Haptics.notification({ type: NotificationType.Error })),
};
