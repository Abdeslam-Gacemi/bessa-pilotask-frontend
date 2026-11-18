package dz.bessa.pilotask.offline;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;
import dz.bessa.pilotask.R;
import java.util.TimeZone;

/**
 * The two notifications of the offline copy, on their own quiet channel:
 *
 * <ul>
 *   <li>Sync: a progress bar while a sync takes a moment or brings changes,
 *       then "up to date" for a few seconds. A quick sync with nothing new
 *       stays silent, so the half-hourly background job never flickers.</li>
 *   <li>Offline: stays while the phone has no working network, saying what
 *       can still be read and how old it is.</li>
 * </ul>
 *
 * Nothing shows if the person turned notifications off.
 */
final class SyncNotifier {

    static final String CHANNEL_ID = "pilotask_offline";
    static final int SYNC_ID = 4101;
    static final int OFFLINE_ID = 4102;

    /** A sync over before this, with nothing to apply, shows nothing. */
    private static final long SHOW_AFTER_MS = 800;
    private static final long DONE_VISIBLE_MS = 4_000;
    private static final long FAILED_VISIBLE_MS = 8_000;

    private final Context context;
    private final NotificationManagerCompat manager;
    private final NotifierTexts texts;
    private final Handler main = new Handler(Looper.getMainLooper());
    private final Runnable showLate = this::showWaiting;

    private boolean shown;
    private boolean over;
    private int done;
    private int total = -1;

    SyncNotifier(Context context, String language) {
        this.context = context.getApplicationContext();
        this.manager = NotificationManagerCompat.from(this.context);
        this.texts = new NotifierTexts(language, TimeZone.getDefault());
        ensureChannel();
    }

    // ─── Sync ────────────────────────────────────────────────────────

    synchronized void started() {
        main.postDelayed(showLate, SHOW_AFTER_MS);
    }

    /** The API announced how many items follow; worth showing at once if there are any. */
    synchronized void totalKnown(int total) {
        this.total = total;
        if (total > 0) show();
    }

    synchronized void progress(int done, int total) {
        this.done = done;
        this.total = total;
        if (shown) post();
    }

    synchronized void finished(OfflineSyncEngine.Outcome outcome, int changes) {
        over = true;
        main.removeCallbacks(showLate);
        if (!allowed()) return;
        if (outcome == OfflineSyncEngine.Outcome.SYNCED && changes > 0) {
            manager.notify(SYNC_ID, base(texts.doneTitle(), texts.doneText(changes)).setTimeoutAfter(DONE_VISIBLE_MS).build());
        } else if (outcome == OfflineSyncEngine.Outcome.FAILED && shown) {
            manager.notify(SYNC_ID, base(texts.failedTitle(), texts.failedText()).setTimeoutAfter(FAILED_VISIBLE_MS).build());
        } else {
            manager.cancel(SYNC_ID);
        }
    }

    private synchronized void showWaiting() {
        if (!over) show();
    }

    private void show() {
        shown = true;
        post();
    }

    private void post() {
        if (over || !allowed()) return;
        boolean known = total > 0;
        manager.notify(
            SYNC_ID,
            base(texts.syncTitle(), known ? texts.applying(done, total) : texts.connecting())
                .setOngoing(true)
                .setProgress(known ? total : 0, known ? done : 0, !known)
                .setCategory(NotificationCompat.CATEGORY_PROGRESS)
                .build()
        );
    }

    // ─── Offline ─────────────────────────────────────────────────────

    void showOffline(long lastSuccessMs) {
        if (!allowed()) return;
        manager.notify(
            OFFLINE_ID,
            base(texts.offlineTitle(), texts.offlineText(lastSuccessMs))
                .setOngoing(true)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(texts.offlineText(lastSuccessMs)))
                .setCategory(NotificationCompat.CATEGORY_STATUS)
                .build()
        );
    }

    void hideOffline() {
        manager.cancel(OFFLINE_ID);
    }

    /** Sign-out: nothing about the previous session stays in the shade. */
    void cancelAll() {
        main.removeCallbacks(showLate);
        manager.cancel(SYNC_ID);
        manager.cancel(OFFLINE_ID);
    }

    // ─── Shared ──────────────────────────────────────────────────────

    private NotificationCompat.Builder base(String title, String text) {
        return new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_offline)
            .setColor(ContextCompat.getColor(context, R.color.pilotask_ink))
            .setContentTitle(title)
            .setContentText(text)
            .setContentIntent(openApp())
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOnlyAlertOnce(true)
            .setSilent(true)
            .setShowWhen(false)
            .setLocalOnly(true);
    }

    private PendingIntent openApp() {
        Intent launch = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (launch == null) launch = new Intent();
        launch.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(context, 0, launch, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    private boolean allowed() {
        if (!manager.areNotificationsEnabled()) return false;
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU
            || ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
    }

    private void ensureChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationChannel channel = new NotificationChannel(CHANNEL_ID, texts.channelName(), NotificationManager.IMPORTANCE_LOW);
        channel.setDescription(texts.channelDescription());
        channel.setShowBadge(false);
        context.getSystemService(NotificationManager.class).createNotificationChannel(channel);
    }
}
