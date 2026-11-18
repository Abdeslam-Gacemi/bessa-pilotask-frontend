package dz.bessa.pilotask.offline;

import android.content.Context;
import androidx.work.BackoffPolicy;
import androidx.work.Constraints;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;
import java.util.concurrent.TimeUnit;

/** The periodic background sync: one unique job, updated in place when its settings change. */
final class OfflineSyncScheduler {

    private static final String WORK_NAME = "pilotask-offline-sync";
    private static final long INTERVAL_MINUTES = 30;
    /** Lets Android run it at any point in the last part of the interval, batching with other apps. */
    private static final long FLEX_MINUTES = 10;

    private OfflineSyncScheduler() {}

    static void schedule(Context context, boolean wifiOnly) {
        Constraints constraints = new Constraints.Builder()
            .setRequiredNetworkType(wifiOnly ? NetworkType.UNMETERED : NetworkType.CONNECTED)
            .setRequiresBatteryNotLow(true)
            .build();

        PeriodicWorkRequest request = new PeriodicWorkRequest.Builder(
            OfflineSyncWorker.class,
            INTERVAL_MINUTES,
            TimeUnit.MINUTES,
            FLEX_MINUTES,
            TimeUnit.MINUTES
        )
            .setConstraints(constraints)
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 1, TimeUnit.MINUTES)
            .build();

        WorkManager.getInstance(context).enqueueUniquePeriodicWork(WORK_NAME, ExistingPeriodicWorkPolicy.UPDATE, request);
    }

    static void cancel(Context context) {
        WorkManager.getInstance(context).cancelUniqueWork(WORK_NAME);
    }
}
