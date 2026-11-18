package dz.bessa.pilotask.offline;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class SyncProgressTest {

    @Test
    public void reportsTheFirstStepThenAtMostOncePerInterval() {
        SyncProgress progress = new SyncProgress(400);
        progress.setTotal(100);

        assertTrue(progress.step(1_000));
        assertFalse(progress.step(1_100));
        assertFalse(progress.step(1_399));
        assertTrue(progress.step(1_400));
        assertEquals(4, progress.done());
    }

    @Test
    public void alwaysReportsTheLastStep() {
        SyncProgress progress = new SyncProgress(10_000);
        progress.setTotal(3);

        assertTrue(progress.step(0));
        assertFalse(progress.step(1));
        assertTrue(progress.step(2)); // last one, even inside the interval
        assertEquals(100, progress.percent());
    }

    @Test
    public void percentIsZeroUntilTheTotalIsKnownAndNeverAboveAHundred() {
        SyncProgress progress = new SyncProgress(0);
        assertEquals(-1, progress.total());
        progress.step(0);
        assertEquals(0, progress.percent());

        progress.setTotal(1);
        progress.step(1); // more items than announced: capped
        assertEquals(100, progress.percent());
    }

    @Test
    public void percentOfLargeSyncsDoesNotOverflow() {
        SyncProgress progress = new SyncProgress(0);
        progress.setTotal(30_000_000);
        for (int i = 0; i < 15_000_000; i++) progress.step(i);
        assertEquals(50, progress.percent());
    }

    @Test
    public void aNegativeTotalCountsAsNothingToDo() {
        SyncProgress progress = new SyncProgress(0);
        progress.setTotal(-5);
        assertEquals(0, progress.total());
        assertEquals(0, progress.percent());
    }
}
