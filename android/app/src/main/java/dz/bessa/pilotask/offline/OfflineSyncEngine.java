package dz.bessa.pilotask.offline;

import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteStatement;
import android.util.JsonReader;
import android.util.JsonToken;
import android.util.JsonWriter;
import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.net.HttpURLConnection;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.locks.ReentrantLock;

/**
 * One sync: tell the API what the phone holds (a hash per entry), receive only
 * the difference, and apply it.
 *
 * <p>The answer is read as a stream and written as it arrives, in one transaction,
 * with prepared statements: memory stays flat whatever the size, and the copy is
 * never half-updated — a cut connection rolls everything back. Only one sync runs
 * at a time, whether started by the app or by the background worker.
 */
final class OfflineSyncEngine {

    enum Outcome {
        /** The copy is up to date. */
        SYNCED,
        /** Another sync is running; it will do the work. */
        BUSY,
        /** Nobody signed in on this phone (or the token could not be read back). */
        NOT_CONFIGURED,
        /** The token was refused: the app must sign in again. */
        UNAUTHORIZED,
        /** Network or server trouble: try again later. */
        FAILED,
    }

    static final int COMMENTS_PER_TASK = 20;

    /** How often progress reaches the notification and the screen, at most. */
    private static final long PROGRESS_EVERY_MS = 400;
    private static final int CONNECT_TIMEOUT_MS = 15_000;
    private static final int READ_TIMEOUT_MS = 60_000;
    private static final ReentrantLock LOCK = new ReentrantLock();

    private OfflineSyncEngine() {}

    static boolean isRunning() {
        return LOCK.isLocked();
    }

    /**
     * Forgets the copy once any running sync is over, so a sync started for the
     * previous person can never write their tasks back after the wipe.
     */
    static void wipe(Context context) {
        LOCK.lock();
        try {
            OfflineStore.wipe(context);
        } finally {
            LOCK.unlock();
        }
        SyncEvents.emit(context);
    }

    static Outcome run(Context context) {
        if (!LOCK.tryLock()) return Outcome.BUSY;
        try {
            Credentials credentials = Credentials.load(context);
            if (credentials == null) return Outcome.NOT_CONFIGURED;

            SyncState state = new SyncState(OfflineDatabase.get(context).getWritableDatabase());
            state.markAttempt();
            SyncEvents.emit(context);

            SyncNotifier notifier = new SyncNotifier(context, credentials.language);
            SyncProgress progress = new SyncProgress(PROGRESS_EVERY_MS);
            notifier.started();

            Outcome outcome;
            try {
                outcome = exchange(context, credentials, new Progress(context, progress, notifier));
            } catch (IOException | RuntimeException e) {
                outcome = Outcome.FAILED;
                state.markError(e.getClass().getSimpleName());
            }
            if (outcome == Outcome.SYNCED) state.markSuccess();
            else if (outcome == Outcome.UNAUTHORIZED) state.markError("unauthorized");
            notifier.finished(outcome, Math.max(0, progress.total()));
            return outcome;
        } finally {
            LOCK.unlock();
            SyncEvents.emit(context);
        }
    }

    private static Outcome exchange(Context context, Credentials credentials, Progress progress) throws IOException {
        SQLiteDatabase db = OfflineDatabase.get(context).getWritableDatabase();
        SyncState state = new SyncState(db);

        HttpURLConnection connection = (HttpURLConnection) URI.create(endpoint(credentials.baseUrl)).toURL().openConnection();
        try {
            connection.setRequestMethod("POST");
            connection.setConnectTimeout(CONNECT_TIMEOUT_MS);
            connection.setReadTimeout(READ_TIMEOUT_MS);
            connection.setDoOutput(true);
            connection.setUseCaches(false);
            connection.setRequestProperty("Authorization", "Bearer " + credentials.token);
            connection.setRequestProperty("Accept", "application/json");
            connection.setRequestProperty("Content-Type", "application/json; charset=utf-8");
            connection.setRequestProperty("Accept-Language", credentials.language);
            // Gzip is asked for and unpacked by HttpURLConnection itself.

            try (OutputStream out = new BufferedOutputStream(connection.getOutputStream())) {
                writeRequest(db, state.commentsSince(), out);
            }

            int status = connection.getResponseCode();
            if (status == HttpURLConnection.HTTP_UNAUTHORIZED || status == HttpURLConnection.HTTP_FORBIDDEN) return Outcome.UNAUTHORIZED;
            if (status != HttpURLConnection.HTTP_OK) {
                state.markError("http_" + status);
                return Outcome.FAILED;
            }

            try (JsonReader reader = new JsonReader(new InputStreamReader(new BufferedInputStream(connection.getInputStream()), StandardCharsets.UTF_8))) {
                new Applier(db, progress).apply(reader);
            }
            return Outcome.SYNCED;
        } finally {
            connection.disconnect();
        }
    }

    private static String endpoint(String baseUrl) {
        return (baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl) + "/offline/sync";
    }

    /** {"known": {"t:12": "hash", …}, "comments_since": "…"} straight from the table. */
    private static void writeRequest(SQLiteDatabase db, String commentsSince, OutputStream out) throws IOException {
        JsonWriter writer = new JsonWriter(new OutputStreamWriter(out, StandardCharsets.UTF_8));
        writer.beginObject();
        writer.name("known").beginObject();
        try (Cursor cursor = db.rawQuery("SELECT key, hash FROM entries", null)) {
            while (cursor.moveToNext()) writer.name(cursor.getString(0)).value(cursor.getString(1));
        }
        writer.endObject();
        writer.name("comments_since");
        if (commentsSince == null) writer.nullValue();
        else writer.value(commentsSince);
        writer.endObject();
        writer.flush();
    }

    /** Tells the notification and the open app how far the sync got. */
    private static final class Progress {

        private final Context context;
        private final SyncProgress counter;
        private final SyncNotifier notifier;

        Progress(Context context, SyncProgress counter, SyncNotifier notifier) {
            this.context = context;
            this.counter = counter;
            this.notifier = notifier;
        }

        void total(int total) {
            counter.setTotal(total);
            notifier.totalKnown(counter.total());
            SyncEvents.progress(context, 0, counter.total());
        }

        void step() {
            if (!counter.step(System.currentTimeMillis())) return;
            notifier.progress(counter.done(), counter.total());
            SyncEvents.progress(context, counter.done(), counter.total());
        }
    }

    /** Applies the answer while it streams in (see OfflineSnapshot on the API side for its shape). */
    private static final class Applier {

        private final SQLiteDatabase db;
        private final Progress progress;
        /** Comments written by this run; a reset only drops the older ones, whatever the order of the answer. */
        private final long run = System.currentTimeMillis();

        private final SQLiteStatement upsertEntry;
        private final SQLiteStatement removeEntry;
        private final SQLiteStatement removeTaskComments;
        private final SQLiteStatement upsertComment;
        private final SQLiteStatement removeComment;
        private final SQLiteStatement resetComments;

        Applier(SQLiteDatabase db, Progress progress) {
            this.db = db;
            this.progress = progress;
            upsertEntry = db.compileStatement(
                "INSERT OR REPLACE INTO entries (key, hash, json, task_id, assigned, observed, category, due_at, updated_at, search)"
                    + " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
            );
            removeEntry = db.compileStatement("DELETE FROM entries WHERE key = ?");
            removeTaskComments = db.compileStatement("DELETE FROM comments WHERE task_id = ?");
            upsertComment = db.compileStatement("INSERT OR REPLACE INTO comments (id, task_id, created_at, json, run) VALUES (?, ?, ?, ?, ?)");
            removeComment = db.compileStatement("DELETE FROM comments WHERE id = ?");
            resetComments = db.compileStatement("DELETE FROM comments WHERE task_id = ? AND run <> ?");
        }

        void apply(JsonReader reader) throws IOException {
            String cursor = null;
            db.beginTransactionNonExclusive();
            try {
                reader.beginObject();
                while (reader.hasNext()) {
                    switch (reader.nextName()) {
                        case "total" -> progress.total(reader.nextInt());
                        case "cursor" -> cursor = reader.nextString();
                        case "upsert" -> forEachObject(reader, this::entry);
                        case "remove" -> forEachString(reader, this::removeEntry);
                        case "comments" -> comments(reader);
                        default -> reader.skipValue();
                    }
                }
                reader.endObject();
                if (cursor == null) throw new IOException("Incomplete answer");

                prune();
                new SyncState(db).put(SyncState.COMMENTS_SINCE, cursor);
                db.setTransactionSuccessful();
            } finally {
                db.endTransaction();
                closeStatements();
            }
        }

        private void entry(JsonReader reader) throws IOException {
            String key = null;
            String hash = null;
            String json = null;
            Index index = Index.EMPTY;
            reader.beginObject();
            while (reader.hasNext()) {
                switch (reader.nextName()) {
                    case "k" -> key = reader.nextString();
                    case "h" -> hash = reader.nextString();
                    case "j" -> json = reader.nextString();
                    case "i" -> index = Index.read(reader);
                    default -> reader.skipValue();
                }
            }
            reader.endObject();
            if (key == null || hash == null || json == null) throw new IOException("Incomplete entry");

            upsertEntry.clearBindings();
            upsertEntry.bindString(1, key);
            upsertEntry.bindString(2, hash);
            upsertEntry.bindString(3, json);
            long taskId = taskIdOf(key);
            if (taskId > 0) upsertEntry.bindLong(4, taskId);
            upsertEntry.bindLong(5, index.assigned ? 1 : 0);
            upsertEntry.bindLong(6, index.observed ? 1 : 0);
            bindNullable(upsertEntry, 7, index.category);
            bindNullable(upsertEntry, 8, index.dueAt);
            bindNullable(upsertEntry, 9, index.updatedAt);
            bindNullable(upsertEntry, 10, index.search);
            upsertEntry.executeInsert();
            progress.step();
        }

        private void removeEntry(String key) {
            removeEntry.bindString(1, key);
            removeEntry.executeUpdateDelete();
            long taskId = taskIdOf(key);
            if (taskId > 0) {
                removeTaskComments.bindLong(1, taskId);
                removeTaskComments.executeUpdateDelete();
            }
            progress.step();
        }

        private void comments(JsonReader reader) throws IOException {
            reader.beginObject();
            while (reader.hasNext()) {
                switch (reader.nextName()) {
                    case "reset" -> forEachLong(reader, taskId -> {
                        resetComments.bindLong(1, taskId);
                        resetComments.bindLong(2, run);
                        resetComments.executeUpdateDelete();
                    });
                    case "upsert" -> forEachObject(reader, this::comment);
                    case "remove" -> forEachLong(reader, id -> {
                        removeComment.bindLong(1, id);
                        removeComment.executeUpdateDelete();
                        progress.step();
                    });
                    default -> reader.skipValue();
                }
            }
            reader.endObject();
        }

        private void comment(JsonReader reader) throws IOException {
            long id = 0;
            long taskId = 0;
            String createdAt = null;
            String json = null;
            reader.beginObject();
            while (reader.hasNext()) {
                switch (reader.nextName()) {
                    case "id" -> id = reader.nextLong();
                    case "task_id" -> taskId = reader.nextLong();
                    case "created_at" -> createdAt = nextNullableString(reader);
                    case "j" -> json = reader.nextString();
                    default -> reader.skipValue();
                }
            }
            reader.endObject();
            if (id == 0 || taskId == 0 || json == null) throw new IOException("Incomplete comment");

            upsertComment.bindLong(1, id);
            upsertComment.bindLong(2, taskId);
            upsertComment.bindString(3, createdAt == null ? "" : createdAt);
            upsertComment.bindString(4, json);
            upsertComment.bindLong(5, run);
            upsertComment.executeInsert();
            progress.step();
        }

        /** Keeps the latest comments of each task the phone still holds, nothing else. */
        private void prune() {
            db.execSQL("DELETE FROM comments WHERE task_id NOT IN (SELECT task_id FROM entries WHERE task_id IS NOT NULL)");
            db.execSQL(
                "DELETE FROM comments WHERE (SELECT COUNT(*) FROM comments AS newer WHERE newer.task_id = comments.task_id"
                    + " AND (newer.created_at > comments.created_at OR (newer.created_at = comments.created_at AND newer.id > comments.id)))"
                    + " >= " + COMMENTS_PER_TASK
            );
        }

        private void closeStatements() {
            upsertEntry.close();
            removeEntry.close();
            removeTaskComments.close();
            upsertComment.close();
            removeComment.close();
            resetComments.close();
        }
    }

    /** The columns a task list needs, sent beside the JSON so it is never parsed here. */
    private static final class Index {

        static final Index EMPTY = new Index();

        boolean assigned;
        boolean observed;
        String category;
        String dueAt;
        String updatedAt;
        String search;

        static Index read(JsonReader reader) throws IOException {
            Index index = new Index();
            reader.beginObject();
            while (reader.hasNext()) {
                switch (reader.nextName()) {
                    case "assigned" -> index.assigned = reader.nextBoolean();
                    case "observed" -> index.observed = reader.nextBoolean();
                    case "category" -> index.category = nextNullableString(reader);
                    case "due_at" -> index.dueAt = nextNullableString(reader);
                    case "updated_at" -> index.updatedAt = nextNullableString(reader);
                    case "search" -> index.search = nextNullableString(reader);
                    default -> reader.skipValue();
                }
            }
            reader.endObject();
            return index;
        }
    }

    // ─── Small JSON helpers ──────────────────────────────────────────────

    private interface ObjectHandler {
        void handle(JsonReader reader) throws IOException;
    }

    private interface StringHandler {
        void handle(String value) throws IOException;
    }

    private interface LongHandler {
        void handle(long value) throws IOException;
    }

    private static void forEachObject(JsonReader reader, ObjectHandler handler) throws IOException {
        reader.beginArray();
        while (reader.hasNext()) handler.handle(reader);
        reader.endArray();
    }

    private static void forEachString(JsonReader reader, StringHandler handler) throws IOException {
        reader.beginArray();
        while (reader.hasNext()) handler.handle(reader.nextString());
        reader.endArray();
    }

    private static void forEachLong(JsonReader reader, LongHandler handler) throws IOException {
        reader.beginArray();
        while (reader.hasNext()) handler.handle(reader.nextLong());
        reader.endArray();
    }

    private static String nextNullableString(JsonReader reader) throws IOException {
        if (reader.peek() == JsonToken.NULL) {
            reader.nextNull();
            return null;
        }
        return reader.nextString();
    }

    private static void bindNullable(SQLiteStatement statement, int index, String value) {
        if (value == null) statement.bindNull(index);
        else statement.bindString(index, value);
    }

    /** "t:12" → 12; anything else → 0. */
    static long taskIdOf(String key) {
        if (!key.startsWith("t:")) return 0;
        try {
            return Long.parseLong(key.substring(2));
        } catch (NumberFormatException e) {
            return 0;
        }
    }
}
