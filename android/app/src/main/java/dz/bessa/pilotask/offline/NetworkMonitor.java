package dz.bessa.pilotask.offline;

import android.content.Context;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.os.Handler;
import android.os.Looper;
import androidx.annotation.NonNull;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Watches for a working network (one Android has checked reaches the
 * internet, so a site Wi-Fi without internet counts as offline) for as long
 * as the app's process lives, in front or in the background:
 *
 * <ul>
 *   <li>lost → the "offline" notification, with the age of the copy;</li>
 *   <li>back → the notification goes, and a catch-up sync runs if the copy is old.</li>
 * </ul>
 *
 * Changes settle for a moment first, so moving from Wi-Fi to mobile data
 * does not flash the notification.
 */
final class NetworkMonitor {

    private static final long SETTLE_MS = 2_500;
    private static final long CATCH_UP_AFTER_MS = 5 * 60_000;

    private static NetworkMonitor instance;

    private final Context context;
    private final ConnectivityManager connectivity;
    private final Handler main = new Handler(Looper.getMainLooper());
    private final ExecutorService catchUps = Executors.newSingleThreadExecutor();
    private final Runnable evaluate = this::evaluate;
    /** Null until the first look: starting online is not "coming back". */
    private Boolean online;

    static synchronized void start(Context context) {
        if (instance != null) return;
        instance = new NetworkMonitor(context.getApplicationContext());
        instance.register();
    }

    /** After sign-in or sign-out: shows or hides the offline notification accordingly. */
    static synchronized void refresh(Context context) {
        start(context);
        instance.main.post(() -> instance.apply(instance.isOnline(), false));
    }

    static synchronized boolean isOnline(Context context) {
        start(context);
        return instance.isOnline();
    }

    private NetworkMonitor(Context context) {
        this.context = context;
        this.connectivity = context.getSystemService(ConnectivityManager.class);
    }

    private void register() {
        connectivity.registerDefaultNetworkCallback(
            new ConnectivityManager.NetworkCallback() {
                @Override
                public void onCapabilitiesChanged(@NonNull Network network, @NonNull NetworkCapabilities capabilities) {
                    settle();
                }

                @Override
                public void onLost(@NonNull Network network) {
                    settle();
                }

                @Override
                public void onAvailable(@NonNull Network network) {
                    settle();
                }
            }
        );
        main.post(evaluate);
    }

    private void settle() {
        main.removeCallbacks(evaluate);
        main.postDelayed(evaluate, SETTLE_MS);
    }

    private void evaluate() {
        boolean now = isOnline();
        if (online != null && online == now) return;
        boolean cameBack = Boolean.FALSE.equals(online) && now;
        online = now;
        apply(now, cameBack);
    }

    private boolean isOnline() {
        Network network = connectivity.getActiveNetwork();
        NetworkCapabilities capabilities = network == null ? null : connectivity.getNetworkCapabilities(network);
        return capabilities != null
            && capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            && capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED);
    }

    private void apply(boolean online, boolean cameBack) {
        Credentials credentials = Credentials.load(context);
        SyncNotifier notifier = new SyncNotifier(context, credentials == null ? "fr" : credentials.language);
        if (credentials == null) {
            notifier.hideOffline(); // signed out: nothing to read offline
            return;
        }
        if (!online) {
            notifier.showOffline(new OfflineStore(context).state().getLong(SyncState.LAST_SUCCESS));
            return;
        }
        notifier.hideOffline();
        if (!cameBack) return;
        catchUps.execute(() -> {
            long last = new OfflineStore(context).state().getLong(SyncState.LAST_SUCCESS);
            if (System.currentTimeMillis() - last >= CATCH_UP_AFTER_MS) OfflineSyncEngine.run(context);
        });
    }
}
