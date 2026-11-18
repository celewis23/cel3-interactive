package com.cel3.meterwise;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import java.security.KeyStore;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

/** The password is never stored. The device token is encrypted with an Android Keystore key. */
final class Vault {
    private static final String ALIAS = "meterwise-device-v1";
    private static SharedPreferences prefs(Context c) { return c.getSharedPreferences("meterwise", Context.MODE_PRIVATE); }
    private static SecretKey key() throws Exception {
        KeyStore store = KeyStore.getInstance("AndroidKeyStore");
        store.load(null);
        if (store.containsAlias(ALIAS)) return (SecretKey) store.getKey(ALIAS, null);
        KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
        generator.init(new KeyGenParameterSpec.Builder(ALIAS, KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build());
        return generator.generateKey();
    }
    static synchronized void saveToken(Context c, String token) throws Exception {
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.ENCRYPT_MODE, key());
        String encrypted = Base64.encodeToString(cipher.doFinal(token.getBytes(java.nio.charset.StandardCharsets.UTF_8)), Base64.NO_WRAP);
        if (!prefs(c).edit().clear().putString("token", encrypted)
            .putString("iv", Base64.encodeToString(cipher.getIV(), Base64.NO_WRAP)).commit()) throw new Exception("Could not save device sign-in");
    }
    static synchronized String token(Context c) {
        try {
            String encrypted = prefs(c).getString("token", null);
            if (encrypted == null) return null;
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, key(), new GCMParameterSpec(128, Base64.decode(prefs(c).getString("iv", ""), Base64.NO_WRAP)));
            return new String(cipher.doFinal(Base64.decode(encrypted, Base64.NO_WRAP)), java.nio.charset.StandardCharsets.UTF_8);
        } catch (Exception error) { clear(c); return null; }
    }
    static synchronized void clear(Context c) { prefs(c).edit().clear().commit(); }
    static synchronized void pending(Context c, String verifier) throws Exception {
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding"); cipher.init(Cipher.ENCRYPT_MODE, key());
        if (!prefs(c).edit().putString("pending", Base64.encodeToString(cipher.doFinal(verifier.getBytes(java.nio.charset.StandardCharsets.UTF_8)), Base64.NO_WRAP))
            .putString("pendingIv", Base64.encodeToString(cipher.getIV(), Base64.NO_WRAP)).putLong("pendingAt", System.currentTimeMillis()).commit()) throw new Exception("Could not save connection verifier");
    }
    static synchronized String pending(Context c) {
        try {
            if (System.currentTimeMillis() - prefs(c).getLong("pendingAt", 0) > 10 * 60_000) return null;
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, key(), new GCMParameterSpec(128, Base64.decode(prefs(c).getString("pendingIv", ""), Base64.NO_WRAP)));
            return new String(cipher.doFinal(Base64.decode(prefs(c).getString("pending", ""), Base64.NO_WRAP)), java.nio.charset.StandardCharsets.UTF_8);
        } catch (Exception error) { return null; }
    }
    static String snapshot(Context c) { return prefs(c).getString("snapshot", null); }
    static String message(Context c) { return prefs(c).getString("message", ""); }
    static synchronized void message(Context c, String message) { prefs(c).edit().putString("message", message).commit(); }
    static synchronized void snapshot(Context c, String token, String json) {
        if (token.equals(token(c))) prefs(c).edit().putString("snapshot", json).remove("message").commit();
    }
}
