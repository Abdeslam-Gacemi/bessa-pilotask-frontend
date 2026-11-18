package dz.bessa.pilotask.offline;

/**
 * Counts what a sync has applied, and says when it is worth telling the
 * person: Android drops notification updates sent faster than a few per
 * second, and the screen does not need more. The last step is always told.
 */
final class SyncProgress {

    private final long minIntervalMs;
    private int total = -1;
    private int done;
    private long lastReportMs;
    private boolean reported;

    SyncProgress(long minIntervalMs) {
        this.minIntervalMs = minIntervalMs;
    }

    /** Announced by the API before the items; -1 until then. */
    void setTotal(int total) {
        this.total = Math.max(0, total);
    }

    int total() {
        return total;
    }

    int done() {
        return done;
    }

    /** One more item applied. True when this one should be reported. */
    boolean step(long nowMs) {
        done++;
        boolean last = total >= 0 && done >= total;
        if (last || !reported || nowMs - lastReportMs >= minIntervalMs) {
            reported = true;
            lastReportMs = nowMs;
            return true;
        }
        return false;
    }

    /** 0–100; 0 while the total is unknown. */
    int percent() {
        if (total <= 0) return 0;
        return Math.min(100, (int) ((done * 100L) / total));
    }
}
