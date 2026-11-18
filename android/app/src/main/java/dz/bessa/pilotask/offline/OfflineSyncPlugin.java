package dz.bessa.pilotask.offline;

import android.content.Context;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Read-only copy of the person's tasks for use without network (see
 * src/offline in the app). Lists come back as JSON text: the app parses them
 * once, instead of the bridge converting every field.
 */
@CapacitorPlugin(name = "OfflineSync")
public class OfflineSyncPlugin extends Plugin implements SyncEvents.Listener {

    /** Syncs leave the plugin thread free for reads. */
    private final ExecutorService syncs = Executors.newSingleThreadExecutor();

    @Override
    public void load() {
        SyncEvents.add(this);
    }

    @Override
    protected void handleOnDestroy() {
        SyncEvents.remove(this);
        syncs.shutdown();
    }

    @Override
    public void onSyncStateChanged(Context context) {
        notifyListeners("stateChange", status());
    }

    /** Signed in: keeps what the background sync needs and starts it. Another person → the old copy goes. */
    @PluginMethod
    public void configure(PluginCall call) {
        String baseUrl = call.getString("baseUrl");
        String token = call.getString("token");
        Long userId = call.getLong("userId");
        if (baseUrl == null || token == null || userId == null || userId <= 0) {
            call.reject("baseUrl, token and userId are required");
            return;
        }
        Context context = getContext();
        long previous = Credentials.storedUserId(context);
        if (previous != 0 && previous != userId) OfflineSyncEngine.wipe(context);

        Credentials.save(context, baseUrl, token, userId, call.getString("language", "fr"));
        OfflineSyncScheduler.schedule(context, Credentials.wifiOnly(context));
        call.resolve(status());
    }

    /** Signed out: stops the background sync and forgets everything. */
    @PluginMethod
    public void clear(PluginCall call) {
        Context context = getContext();
        OfflineSyncScheduler.cancel(context);
        Credentials.clear(context);
        syncs.execute(() -> {
            OfflineSyncEngine.wipe(context);
            call.resolve(status());
        });
    }

    @PluginMethod
    public void setWifiOnly(PluginCall call) {
        Context context = getContext();
        boolean wifiOnly = Boolean.TRUE.equals(call.getBoolean("value", false));
        Credentials.setWifiOnly(context, wifiOnly);
        if (Credentials.storedUserId(context) != 0) OfflineSyncScheduler.schedule(context, wifiOnly);
        call.resolve(status());
    }

    /** Now, whatever the Wi-Fi setting (the person asked, or the app just came back online). */
    @PluginMethod
    public void syncNow(PluginCall call) {
        Context context = getContext();
        syncs.execute(() -> {
            OfflineSyncEngine.Outcome outcome = OfflineSyncEngine.run(context);
            JSObject result = status();
            result.put("outcome", outcome.name().toLowerCase(java.util.Locale.ROOT));
            call.resolve(result);
        });
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        call.resolve(status());
    }

    @PluginMethod
    public void listTasks(PluginCall call) {
        call.resolve(json(new OfflineStore(getContext()).tasks(OfflineStore.Scope.of(call.getString("scope")), call.getString("search"))));
    }

    @PluginMethod
    public void getTask(PluginCall call) {
        Long id = call.getLong("id");
        if (id == null) {
            call.reject("id is required");
            return;
        }
        call.resolve(json(new OfflineStore(getContext()).entry("t:" + id)));
    }

    @PluginMethod
    public void listComments(PluginCall call) {
        Long taskId = call.getLong("taskId");
        if (taskId == null) {
            call.reject("taskId is required");
            return;
        }
        call.resolve(json(new OfflineStore(getContext()).comments(taskId)));
    }

    /** Start-up lists: "me", "meta", "labels", "projects". */
    @PluginMethod
    public void getDocument(PluginCall call) {
        String key = call.getString("key");
        if (key == null || !key.matches("[a-z]+")) {
            call.reject("key is required");
            return;
        }
        call.resolve(json(new OfflineStore(getContext()).entry("d:" + key)));
    }

    private static JSObject json(String value) {
        JSObject result = new JSObject();
        result.put("json", value);
        return result;
    }

    private JSObject status() {
        Context context = getContext();
        OfflineStore store = new OfflineStore(context);
        SyncState state = store.state();
        JSObject status = new JSObject();
        status.put("configured", Credentials.storedUserId(context) != 0);
        status.put("syncing", OfflineSyncEngine.isRunning());
        status.put("wifiOnly", Credentials.wifiOnly(context));
        status.put("lastSuccessAt", state.getLong(SyncState.LAST_SUCCESS));
        status.put("lastAttemptAt", state.getLong(SyncState.LAST_ATTEMPT));
        status.put("lastError", state.get(SyncState.LAST_ERROR));
        status.put("tasks", store.count("entries"));
        status.put("comments", store.count("comments"));
        status.put("bytes", store.bytes());
        return status;
    }
}
