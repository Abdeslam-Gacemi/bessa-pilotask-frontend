package dz.bessa.pilotask.offline;

import java.text.DateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;

/**
 * Words of the sync and offline notifications, in the language chosen in the
 * app (which may differ from the phone's). French is the default.
 */
final class NotifierTexts {

    private final String language;
    private final Locale locale;
    private final TimeZone zone;

    NotifierTexts(String language, TimeZone zone) {
        this.language = "en".equals(language) || "ar".equals(language) ? language : "fr";
        this.locale = Locale.forLanguageTag(this.language);
        this.zone = zone;
    }

    String channelName() {
        return pick("Synchronisation hors ligne", "Offline sync", "المزامنة دون اتصال");
    }

    String channelDescription() {
        return pick(
            "Progression de la synchronisation et mode hors ligne.",
            "Sync progress and offline mode.",
            "تقدم المزامنة ووضع عدم الاتصال."
        );
    }

    String syncTitle() {
        return pick("Synchronisation des données hors ligne", "Syncing offline data", "مزامنة البيانات دون اتصال");
    }

    String connecting() {
        return pick("Connexion au serveur…", "Connecting to the server…", "جارٍ الاتصال بالخادم…");
    }

    String applying(int done, int total) {
        return String.format(locale, pick("%1$d sur %2$d éléments", "%1$d of %2$d items", "%1$d من %2$d عنصر"), done, total);
    }

    String doneTitle() {
        return pick("Données hors ligne à jour", "Offline data up to date", "البيانات دون اتصال محدثة");
    }

    String doneText(int changes) {
        if (changes == 1) return pick("1 modification enregistrée sur le téléphone", "1 change saved on the phone", "تم حفظ تعديل واحد على الهاتف");
        return String.format(locale, pick("%d modifications enregistrées sur le téléphone", "%d changes saved on the phone", "تم حفظ %d تعديلات على الهاتف"), changes);
    }

    String failedTitle() {
        return pick("Synchronisation interrompue", "Sync interrupted", "توقفت المزامنة");
    }

    String failedText() {
        return pick(
            "Nouvel essai automatique plus tard. Les données déjà enregistrées restent consultables.",
            "It will retry later. Data already saved stays available.",
            "ستتم إعادة المحاولة لاحقاً. تبقى البيانات المحفوظة متاحة."
        );
    }

    String offlineTitle() {
        return pick("Pilotask hors ligne · lecture seule", "Pilotask offline · read-only", "Pilotask غير متصل · قراءة فقط");
    }

    /** "Tâches et notifications consultables · données du 18 nov. 2026, 15:14" */
    String offlineText(long lastSuccessMs) {
        String what = pick("Tâches et notifications consultables", "Tasks and notifications available", "المهام والإشعارات متاحة للاطلاع");
        if (lastSuccessMs <= 0) return what + " · " + pick("aucune donnée enregistrée", "nothing saved yet", "لا توجد بيانات محفوظة");
        DateFormat format = DateFormat.getDateTimeInstance(DateFormat.MEDIUM, DateFormat.SHORT, locale);
        format.setTimeZone(zone);
        return what + " · " + String.format(locale, pick("données du %s", "data from %s", "بيانات %s"), format.format(new Date(lastSuccessMs)));
    }

    private String pick(String fr, String en, String ar) {
        return switch (language) {
            case "en" -> en;
            case "ar" -> ar;
            default -> fr;
        };
    }
}
