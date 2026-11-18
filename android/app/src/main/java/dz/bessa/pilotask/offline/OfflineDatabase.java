package dz.bessa.pilotask.offline;

import android.content.Context;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;

/**
 * The read-only copy kept on the phone.
 *
 * <ul>
 *   <li>{@code entries}: tasks ("t:12") and start-up lists ("d:meta"), each the exact
 *       JSON of the API, plus the few columns the task lists filter and sort on.</li>
 *   <li>{@code comments}: the latest comments of those tasks.</li>
 *   <li>{@code state}: where the last sync stopped and how it went.</li>
 * </ul>
 *
 * One connection for the whole app (worker and plugin alike), in WAL mode so the
 * screens keep reading while a sync writes.
 */
final class OfflineDatabase extends SQLiteOpenHelper {

    static final String NAME = "pilotask-offline.db";
    private static final int VERSION = 1;

    private static volatile OfflineDatabase instance;

    static OfflineDatabase get(Context context) {
        OfflineDatabase local = instance;
        if (local == null) {
            synchronized (OfflineDatabase.class) {
                local = instance;
                if (local == null) {
                    local = new OfflineDatabase(context.getApplicationContext());
                    instance = local;
                }
            }
        }
        return local;
    }

    private OfflineDatabase(Context context) {
        super(context, NAME, null, VERSION);
    }

    @Override
    public void onConfigure(SQLiteDatabase db) {
        db.enableWriteAheadLogging();
    }

    @Override
    public void onCreate(SQLiteDatabase db) {
        db.execSQL(
            "CREATE TABLE entries ("
                + "key TEXT PRIMARY KEY,"
                + "hash TEXT NOT NULL,"
                + "json TEXT NOT NULL,"
                + "task_id INTEGER,"
                + "assigned INTEGER NOT NULL DEFAULT 0,"
                + "observed INTEGER NOT NULL DEFAULT 0,"
                + "category TEXT,"
                + "due_at TEXT,"
                + "updated_at TEXT,"
                + "search TEXT)"
        );
        db.execSQL("CREATE INDEX entries_task ON entries(task_id) WHERE task_id IS NOT NULL");
        db.execSQL(
            "CREATE TABLE comments ("
                + "id INTEGER PRIMARY KEY,"
                + "task_id INTEGER NOT NULL,"
                + "created_at TEXT NOT NULL,"
                + "json TEXT NOT NULL,"
                + "run INTEGER NOT NULL)"
        );
        db.execSQL("CREATE INDEX comments_task ON comments(task_id, created_at DESC, id DESC)");
        db.execSQL("CREATE TABLE state (key TEXT PRIMARY KEY, value TEXT)");
    }

    @Override
    public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
        // A copy, not a source: rebuilding it costs one full sync.
        db.execSQL("DROP TABLE IF EXISTS entries");
        db.execSQL("DROP TABLE IF EXISTS comments");
        db.execSQL("DROP TABLE IF EXISTS state");
        onCreate(db);
    }

    @Override
    public void onDowngrade(SQLiteDatabase db, int oldVersion, int newVersion) {
        onUpgrade(db, oldVersion, newVersion);
    }
}
