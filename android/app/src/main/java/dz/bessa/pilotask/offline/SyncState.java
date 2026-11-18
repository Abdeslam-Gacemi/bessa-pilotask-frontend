package dz.bessa.pilotask.offline;

import android.content.ContentValues;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import androidx.annotation.Nullable;

/** Where the last sync stopped and how it went, kept beside the data it describes. */
final class SyncState {

    static final String COMMENTS_SINCE = "comments_since";
    static final String LAST_SUCCESS = "last_success";
    static final String LAST_ATTEMPT = "last_attempt";
    static final String LAST_ERROR = "last_error";

    private final SQLiteDatabase db;

    SyncState(SQLiteDatabase db) {
        this.db = db;
    }

    @Nullable
    String get(String key) {
        try (Cursor cursor = db.rawQuery("SELECT value FROM state WHERE key = ?", new String[] { key })) {
            return cursor.moveToFirst() ? cursor.getString(0) : null;
        }
    }

    long getLong(String key) {
        String value = get(key);
        return value == null ? 0 : Long.parseLong(value);
    }

    void put(String key, @Nullable String value) {
        if (value == null) {
            db.delete("state", "key = ?", new String[] { key });
            return;
        }
        ContentValues row = new ContentValues(2);
        row.put("key", key);
        row.put("value", value);
        db.insertWithOnConflict("state", null, row, SQLiteDatabase.CONFLICT_REPLACE);
    }

    @Nullable
    String commentsSince() {
        return get(COMMENTS_SINCE);
    }

    void markAttempt() {
        put(LAST_ATTEMPT, Long.toString(System.currentTimeMillis()));
    }

    void markSuccess() {
        put(LAST_SUCCESS, Long.toString(System.currentTimeMillis()));
        put(LAST_ERROR, null);
    }

    void markError(String reason) {
        put(LAST_ERROR, reason);
    }
}
