package dz.bessa.pilotask.offline;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import androidx.annotation.Nullable;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

/**
 * What the background sync needs without the app open: the API address, the
 * signed-in person and their token. The token is encrypted with a key that
 * never leaves the Android Keystore; if it cannot be read back (a restored
 * backup, a reset key), the sync simply waits for the app to hand a new one.
 */
final class Credentials {

    private static final String PREFS = "pilotask_offline";
    private static final String KEY_ALIAS = "pilotask_offline_token";
    private static final String TRANSFORMATION = "AES/GCM/NoPadding";
    private static final int IV_BYTES = 12;
    private static final int TAG_BITS = 128;

    final String baseUrl;
    final String token;
    final long userId;
    final String language;
    final boolean wifiOnly;

    private Credentials(String baseUrl, String token, long userId, String language, boolean wifiOnly) {
        this.baseUrl = baseUrl;
        this.token = token;
        this.userId = userId;
        this.language = language;
        this.wifiOnly = wifiOnly;
    }

    @Nullable
    static Credentials load(Context context) {
        SharedPreferences prefs = prefs(context);
        String baseUrl = prefs.getString("base_url", null);
        String sealed = prefs.getString("token", null);
        long userId = prefs.getLong("user_id", 0);
        if (baseUrl == null || sealed == null || userId == 0) return null;
        String token = open(sealed);
        if (token == null) return null;
        return new Credentials(baseUrl, token, userId, prefs.getString("language", "fr"), prefs.getBoolean("wifi_only", false));
    }

    /** Previous person, to wipe their copy when someone else signs in. */
    static long storedUserId(Context context) {
        return prefs(context).getLong("user_id", 0);
    }

    static boolean wifiOnly(Context context) {
        return prefs(context).getBoolean("wifi_only", false);
    }

    static void save(Context context, String baseUrl, String token, long userId, String language) {
        prefs(context)
            .edit()
            .putString("base_url", baseUrl)
            .putString("token", seal(token))
            .putLong("user_id", userId)
            .putString("language", language)
            .apply();
    }

    static void setWifiOnly(Context context, boolean wifiOnly) {
        prefs(context).edit().putBoolean("wifi_only", wifiOnly).apply();
    }

    static void clear(Context context) {
        prefs(context).edit().clear().apply();
    }

    private static SharedPreferences prefs(Context context) {
        return context.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    private static String seal(String plain) {
        try {
            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            cipher.init(Cipher.ENCRYPT_MODE, key());
            byte[] iv = cipher.getIV();
            byte[] body = cipher.doFinal(plain.getBytes(StandardCharsets.UTF_8));
            return Base64.encodeToString(ByteBuffer.allocate(iv.length + body.length).put(iv).put(body).array(), Base64.NO_WRAP);
        } catch (Exception e) {
            throw new IllegalStateException("Cannot protect the session token", e);
        }
    }

    @Nullable
    private static String open(String sealed) {
        try {
            byte[] all = Base64.decode(sealed, Base64.NO_WRAP);
            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            cipher.init(Cipher.DECRYPT_MODE, key(), new GCMParameterSpec(TAG_BITS, all, 0, IV_BYTES));
            return new String(cipher.doFinal(all, IV_BYTES, all.length - IV_BYTES), StandardCharsets.UTF_8);
        } catch (Exception e) {
            return null;
        }
    }

    private static SecretKey key() throws Exception {
        KeyStore store = KeyStore.getInstance("AndroidKeyStore");
        store.load(null);
        if (store.getKey(KEY_ALIAS, null) instanceof SecretKey existing) return existing;

        KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
        generator.init(
            new KeyGenParameterSpec.Builder(KEY_ALIAS, KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256)
                .build()
        );
        return generator.generateKey();
    }
}
