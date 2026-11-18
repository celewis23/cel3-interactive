package com.cel3.meterwise;

import android.app.Activity;
import android.content.Intent;
import android.content.pm.*;
import android.net.Uri;
import android.os.Bundle;
import android.provider.Settings;
import android.view.Gravity;
import android.widget.*;
import androidx.core.content.FileProvider;
import org.json.JSONObject;
import javax.net.ssl.HttpsURLConnection;
import java.net.URL;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Locale;

/** Opened directly by the widget; download and installation do not visit the backoffice download page. */
public class UpdateActivity extends Activity {
    private TextView status;
    private Button action;
    private File ready;
    private boolean waitingPermission;
    private volatile boolean closed;
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        LinearLayout panel = new LinearLayout(this); panel.setOrientation(LinearLayout.VERTICAL);
        panel.setGravity(Gravity.CENTER); panel.setPadding(48, 64, 48, 64); panel.setBackgroundColor(0xFF10172C);
        TextView title = new TextView(this); title.setText("Meterwise updates"); title.setTextSize(26); title.setTextColor(0xFF8DE6D8); panel.addView(title);
        status = new TextView(this); status.setTextColor(0xFFE1ECF8); status.setTextSize(16); status.setGravity(Gravity.CENTER); status.setPadding(0,32,0,32); panel.addView(status);
        action = new Button(this); action.setText("Check again"); action.setOnClickListener(v -> { if (ready != null) install(); else check(); }); panel.addView(action);
        Button close = new Button(this); close.setText("Close"); close.setOnClickListener(v -> finish()); panel.addView(close);
        setContentView(panel); check();
    }
    private HttpsURLConnection connection(String path) throws Exception {
        HttpsURLConnection c = (HttpsURLConnection) new URL(BuildConfig.BACKOFFICE_URL + path).openConnection();
        c.setInstanceFollowRedirects(false); c.setUseCaches(false); c.setConnectTimeout(15000); c.setReadTimeout(30000);
        c.setRequestProperty("Cache-Control", "no-cache"); return c;
    }
    private void check() {
        ready = null; status.setText("Checking for an update…"); action.setText("Check again"); action.setEnabled(false);
        new Thread(() -> {
            File file = null;
            try {
                HttpsURLConnection feed = connection("/api/meterwise/android-release");
                JSONObject release;
                try {
                    if (feed.getResponseCode() != 200) throw new IOException("The update feed is unavailable. Try again shortly.");
                    try (InputStream input = feed.getInputStream(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
                        byte[] bytes = new byte[2048]; int count;
                        while ((count = input.read(bytes)) != -1) { if (closed) throw new IOException("Update cancelled"); if (output.size() + count > 8192) throw new IOException("Invalid update information"); output.write(bytes,0,count); }
                        release = new JSONObject(output.toString(StandardCharsets.UTF_8.name()));
                    }
                } finally { feed.disconnect(); }
                long version = release.getLong("versionCode"), size = release.getLong("size"); String expected = release.getString("sha256");
                UpdatePolicy.validate(version, size, expected);
                if (version <= BuildConfig.VERSION_CODE) {
                    runOnUiThread(() -> { status.setText("You’re up to date.\nMeterwise " + BuildConfig.VERSION_NAME); action.setEnabled(true); }); return;
                }
                runOnUiThread(() -> status.setText("Downloading the widget update…\nAndroid will ask you to confirm installation."));
                File directory = new File(getCacheDir(), "updates"); if (!directory.isDirectory() && !directory.mkdirs()) throw new IOException("Cannot prepare update storage");
                // Only our private cache directory is shared with Android’s installer.
                file = File.createTempFile("meterwise-", ".apk", directory);
                HttpsURLConnection download = connection("/downloads/meterwise.apk");
                MessageDigest digest = MessageDigest.getInstance("SHA-256"); long total = 0;
                try {
                    if (download.getResponseCode() != 200) throw new IOException("The update is not available yet. Try again shortly.");
                    try (InputStream input = download.getInputStream(); FileOutputStream output = new FileOutputStream(file)) {
                        byte[] bytes = new byte[16384]; int count;
                        while ((count = input.read(bytes)) != -1) {
                            if (closed) throw new IOException("Update cancelled");
                            total += count; if (total > size || total > UpdatePolicy.MAX_BYTES) throw new IOException("Invalid update size");
                            digest.update(bytes, 0, count); output.write(bytes, 0, count);
                        }
                    }
                } finally { download.disconnect(); }
                StringBuilder actual = new StringBuilder(); for (byte b : digest.digest()) actual.append(String.format(Locale.ROOT, "%02x", b & 255));
                if (total != size || !expected.equals(actual.toString())) throw new IOException("The release changed while downloading. Please check again.");
                verifyPackage(file, version);
                File verified = file;
                runOnUiThread(() -> {
                    if (closed || isFinishing()) { verified.delete(); return; }
                    ready = verified; action.setEnabled(true); action.setText("Install update"); install();
                });
            } catch (Exception error) {
                if (file != null) file.delete();
                String message = error instanceof IOException ? error.getMessage() : "Could not verify the widget update. Please try again.";
                runOnUiThread(() -> { status.setText(message); action.setEnabled(true); });
            }
        }).start();
    }
    @SuppressWarnings("deprecation")
    private void verifyPackage(File file, long version) throws Exception {
        PackageManager manager = getPackageManager();
        PackageInfo candidate = manager.getPackageArchiveInfo(file.getAbsolutePath(), PackageManager.GET_SIGNATURES);
        PackageInfo installed = manager.getPackageInfo(getPackageName(), PackageManager.GET_SIGNATURES);
        if (candidate == null || !getPackageName().equals(candidate.packageName) || candidate.versionCode != version || candidate.versionCode <= installed.versionCode) throw new IOException("This update does not match Meterwise");
        byte[][] before = new byte[installed.signatures.length][], after = new byte[candidate.signatures.length][];
        for (int i = 0; i < before.length; i++) before[i] = installed.signatures[i].toByteArray();
        for (int i = 0; i < after.length; i++) after[i] = candidate.signatures[i].toByteArray();
        if (!UpdatePolicy.sameSigners(before, after)) throw new IOException("The update was signed by a different publisher");
    }
    @SuppressWarnings("deprecation")
    private void install() {
        if (ready == null) return;
        if (!getPackageManager().canRequestPackageInstalls()) {
            status.setText("Allow Meterwise to install updates in the Android screen that opens, then return here."); waitingPermission = true;
            try { startActivity(new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + getPackageName()))); }
            catch (Exception error) { waitingPermission = false; status.setText("Allow updates for Meterwise in Android Settings → Install unknown apps, then tap Install update."); }
            return;
        }
        try {
            Uri uri = FileProvider.getUriForFile(this, getPackageName() + ".updates", ready);
            Intent intent = new Intent(Intent.ACTION_INSTALL_PACKAGE).setDataAndType(uri, "application/vnd.android.package-archive").addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION).putExtra(Intent.EXTRA_RETURN_RESULT, true);
            startActivityForResult(intent, 42);
            status.setText("Confirm the update in Android’s installer. Your widget and sign-in will be kept.");
        } catch (Exception error) { status.setText("Unable to open Android’s installer. Tap Install update to retry."); }
    }
    @Override protected void onResume() {
        super.onResume();
        if (waitingPermission) { waitingPermission = false; if (getPackageManager().canRequestPackageInstalls()) install(); }
    }
    @Override protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        if (request == 42 && result == RESULT_OK) finish();
    }
    @Override protected void onDestroy() { closed = true; super.onDestroy(); }
}
