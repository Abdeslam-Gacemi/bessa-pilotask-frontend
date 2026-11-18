package dz.bessa.pilotask.offline;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

import java.util.TimeZone;
import org.junit.Test;

public class NotifierTextsTest {

    private static final TimeZone ALGIERS = TimeZone.getTimeZone("Africa/Algiers");
    /** 18 Nov 2026, 14:14 UTC = 15:14 in Algiers. */
    private static final long SYNCED_AT = 1_795_011_240_000L;

    @Test
    public void frenchIsTheDefault() {
        assertEquals("Pilotask hors ligne · lecture seule", new NotifierTexts("de", ALGIERS).offlineTitle());
        assertEquals("Pilotask hors ligne · lecture seule", new NotifierTexts(null, ALGIERS).offlineTitle());
    }

    @Test
    public void progressCountsWhatIsApplied() {
        assertEquals("120 sur 412 éléments", new NotifierTexts("fr", ALGIERS).applying(120, 412));
        assertEquals("120 of 412 items", new NotifierTexts("en", ALGIERS).applying(120, 412));
    }

    @Test
    public void doneTextAgreesWithTheCount() {
        NotifierTexts fr = new NotifierTexts("fr", ALGIERS);
        assertEquals("1 modification enregistrée sur le téléphone", fr.doneText(1));
        assertEquals("12 modifications enregistrées sur le téléphone", fr.doneText(12));
        assertEquals("3 changes saved on the phone", new NotifierTexts("en", ALGIERS).doneText(3));
    }

    @Test
    public void offlineTextGivesTheAgeOfTheCopyInLocalTime() {
        String text = new NotifierTexts("fr", ALGIERS).offlineText(SYNCED_AT);
        assertTrue(text, text.startsWith("Tâches et notifications consultables · données du "));
        assertTrue(text, text.contains("18 nov. 2026"));
        assertTrue(text, text.contains("15:14"));
    }

    @Test
    public void offlineTextSaysWhenNothingIsSavedYet() {
        assertEquals("Tasks and notifications available · nothing saved yet", new NotifierTexts("en", ALGIERS).offlineText(0));
    }

    @Test
    public void arabicIsAvailable() {
        NotifierTexts ar = new NotifierTexts("ar", ALGIERS);
        assertEquals("Pilotask غير متصل · قراءة فقط", ar.offlineTitle());
        assertTrue(ar.applying(1, 2).contains("من"));
    }
}
