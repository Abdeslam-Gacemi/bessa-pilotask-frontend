package dz.bessa.pilotask.offline;

import android.content.Context;
import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

/**
 * The background sync: run by WorkManager about every half hour, only with
 * network (Wi-Fi only if the person asked), never on a low battery. Android
 * may shift it to save power; it survives restarts and app updates.
 */
public final class OfflineSyncWorker extends Worker {

    public OfflineSyncWorker(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
    }

    @NonNull
    @Override
    public Result doWork() {
        return switch (OfflineSyncEngine.run(getApplicationContext())) {
            case SYNCED, BUSY -> Result.success();
            // Signed out, or the token was refused: nothing to do until the app signs in again.
            case NOT_CONFIGURED, UNAUTHORIZED -> {
                OfflineSyncScheduler.cancel(getApplicationContext());
                yield Result.failure();
            }
            // Retried with a growing delay, within WorkManager's limits.
            case FAILED -> getRunAttemptCount() < 3 ? Result.retry() : Result.success();
        };
    }
}
