package dz.bessa.pilotask.offline;

import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import androidx.annotation.Nullable;
import java.io.File;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Reads for the screens. Rows already hold the API's JSON, so a list is built
 * by joining strings: nothing is parsed or rebuilt on this side, and the app
 * gets exactly what the API would have sent.
 */
final class OfflineStore {

    enum Scope {
        OPEN,
        DONE,
        SHARED;

        static Scope of(@Nullable String value) {
            if ("done".equals(value)) return DONE;
            if ("shared".equals(value)) return SHARED;
            return OPEN;
        }
    }

    private static final int MAX_TASKS = 500;

    private final Context context;
    private final SQLiteDatabase db;

    OfflineStore(Context context) {
        this.context = context.getApplicationContext();
        this.db = OfflineDatabase.get(context).getReadableDatabase();
    }

    /** "My tasks" tabs, filtered and sorted like the API does (TaskFilters). */
    String tasks(Scope scope, @Nullable String search) {
        StringBuilder sql = new StringBuilder("SELECT json FROM entries WHERE task_id IS NOT NULL AND ");
        List<String> args = new ArrayList<>(1);
        switch (scope) {
            case OPEN -> sql.append("assigned = 1 AND (category IS NULL OR category IN ('todo', 'in_progress'))");
            case DONE -> sql.append("assigned = 1 AND category = 'done'");
            case SHARED -> sql.append("observed = 1");
        }
        if (search != null && !search.isBlank()) {
            sql.append(" AND instr(search, ?) > 0");
            args.add(search.trim().toLowerCase(Locale.ROOT));
        }
        sql.append(scope == Scope.OPEN ? " ORDER BY due_at IS NULL, due_at, task_id" : " ORDER BY updated_at DESC, task_id DESC");
        sql.append(" LIMIT ").append(MAX_TASKS);
        return jsonArray(sql.toString(), args.toArray(new String[0]));
    }

    @Nullable
    String entry(String key) {
        try (Cursor cursor = db.rawQuery("SELECT json FROM entries WHERE key = ?", new String[] { key })) {
            return cursor.moveToFirst() ? cursor.getString(0) : null;
        }
    }

    /** Newest first, like the API. */
    String comments(long taskId) {
        return jsonArray("SELECT json FROM comments WHERE task_id = ? ORDER BY created_at DESC, id DESC", new String[] { Long.toString(taskId) });
    }

    int count(String table) {
        String where = "entries".equals(table) ? " WHERE task_id IS NOT NULL" : "";
        try (Cursor cursor = db.rawQuery("SELECT COUNT(*) FROM " + table + where, null)) {
            return cursor.moveToFirst() ? cursor.getInt(0) : 0;
        }
    }

    /** Space taken on the phone, WAL included. */
    long bytes() {
        File file = context.getDatabasePath(OfflineDatabase.NAME);
        long total = 0;
        for (String suffix : new String[] { "", "-wal", "-shm" }) total += new File(file.getPath() + suffix).length();
        return total;
    }

    SyncState state() {
        return new SyncState(db);
    }

    /** Forgets everything; callers go through OfflineSyncEngine.wipe, which waits for a running sync. */
    static void wipe(Context context) {
        SQLiteDatabase db = OfflineDatabase.get(context).getWritableDatabase();
        db.beginTransactionNonExclusive();
        try {
            db.execSQL("DELETE FROM entries");
            db.execSQL("DELETE FROM comments");
            db.execSQL("DELETE FROM state");
            db.setTransactionSuccessful();
        } finally {
            db.endTransaction();
        }
        // Gives the space back and leaves no readable leftovers in free pages.
        db.execSQL("VACUUM");
    }

    private String jsonArray(String sql, String[] args) {
        try (Cursor cursor = db.rawQuery(sql, args)) {
            StringBuilder out = new StringBuilder(Math.max(64, cursor.getCount() * 2048)).append('[');
            boolean first = true;
            while (cursor.moveToNext()) {
                if (!first) out.append(',');
                out.append(cursor.getString(0));
                first = false;
            }
            return out.append(']').toString();
        }
    }
}
