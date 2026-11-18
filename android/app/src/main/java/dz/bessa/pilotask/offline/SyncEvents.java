package dz.bessa.pilotask.offline;

import android.content.Context;
import java.util.concurrent.CopyOnWriteArraySet;

/** Tells the open app that the copy changed, whoever ran the sync (the app or the background worker). */
final class SyncEvents {

    interface Listener {
        void onSyncStateChanged(Context context);

        /** Throttled by the engine: a few times a second at most. */
        default void onSyncProgress(int done, int total) {}
    }

    private static final CopyOnWriteArraySet<Listener> LISTENERS = new CopyOnWriteArraySet<>();

    private SyncEvents() {}

    static void add(Listener listener) {
        LISTENERS.add(listener);
    }

    static void remove(Listener listener) {
        LISTENERS.remove(listener);
    }

    static void emit(Context context) {
        for (Listener listener : LISTENERS) listener.onSyncStateChanged(context);
    }

    static void progress(Context context, int done, int total) {
        for (Listener listener : LISTENERS) listener.onSyncProgress(done, total);
    }
}
