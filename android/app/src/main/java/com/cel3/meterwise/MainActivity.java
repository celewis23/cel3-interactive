package com.cel3.meterwise;

import android.app.*;
import android.appwidget.AppWidgetManager;
import android.content.*;
import android.graphics.Color;
import android.net.Uri;
import android.os.*;
import android.view.*;
import android.widget.*;
import org.json.*;

public class MainActivity extends Activity {
    private LinearLayout content;
    private boolean connecting = false, foreground = false, loggingOut = false;
    private String displayed = "";
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Runnable watch = new Runnable() {
        public void run() {
            if (!foreground) return;
            if (!connecting) {
                String current = String.valueOf(Vault.snapshot(MainActivity.this)) + Vault.message(MainActivity.this) + Vault.token(MainActivity.this);
                if (!current.equals(displayed)) { displayed = current; dashboard(); }
            }
            handler.postDelayed(this, 1500);
        }
    };
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(Color.rgb(10, 15, 20));
        getWindow().setNavigationBarColor(Color.rgb(10, 15, 20));
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE);
        dashboard();
        if (Vault.token(this) != null) { RefreshWorker.schedule(this); RefreshWorker.refresh(this); }
        handleConnection(getIntent());
    }
    @Override protected void onResume() {
        super.onResume(); foreground = true; handler.post(watch);
        if (Vault.token(this) != null) RefreshWorker.refresh(this);
    }
    @Override protected void onPause() { foreground = false; handler.removeCallbacks(watch); super.onPause(); }
    private int dp(int n) { return Math.round(n * getResources().getDisplayMetrics().density); }
    private TextView text(String value, int size, int color) {
        TextView view = new TextView(this); view.setText(value); view.setTextSize(size); view.setTextColor(color);
        view.setPadding(0, dp(6), 0, dp(6)); content.addView(view); return view;
    }
    private void button(String title, View.OnClickListener action) {
        Button button = new Button(this); button.setText(title); button.setAllCaps(false);
        button.setOnClickListener(action); content.addView(button, new LinearLayout.LayoutParams(-1, dp(54)));
    }
    private void dashboard() {
        ScrollView scroll = new ScrollView(this); scroll.setFillViewport(true); scroll.setBackgroundColor(0xFF0A0F14);
        content = new LinearLayout(this); content.setOrientation(LinearLayout.VERTICAL); content.setPadding(dp(24), dp(32), dp(24), dp(32));
        scroll.addView(content); setContentView(scroll);
        text("CEL3 / METERWISE", 13, 0xFF38BDF8);
        if (Vault.token(this) == null) {
            text("Your spending, at a glance.", 30, Color.WHITE);
            text("Connect using your phone browser’s backoffice sign-in. If you’re already signed in, there’s no password to enter. Your app and widget share this connection.", 16, 0xFF9DAAB6);
            if (!Vault.message(this).isEmpty()) text(Vault.message(this), 14, 0xFFFBBF24);
            button(connecting ? "Connecting…" : "Connect to backoffice", v -> { if (!connecting) signIn(); });
            return;
        }
        String saved = Vault.snapshot(this);
        try {
            if (saved == null) text("Waiting for your first refresh…", 22, Color.WHITE);
            else {
                JSONObject data = new JSONObject(saved);
                text("Month-to-date spend", 14, 0xFF9DAAB6);
                text(MeterwiseWidget.money(data.optDouble("mtdCost")), 42, Color.WHITE);
                text("Projected " + MeterwiseWidget.money(data.optDouble("projectedMonthlyCost")) + " this month", 16, 0xFF9DAAB6);
                text("Connected providers   " + data.optInt("connectedProviders") + "\nActive projects   " + data.optInt("activeProjects")
                    + "\nAvg. daily spend   " + MeterwiseWidget.money(data.optDouble("averageDailySpend"))
                    + "\nSync issues (last 8 syncs)   " + data.optInt("recentSyncIssues"), 18, Color.WHITE);
                text("Updated " + MeterwiseWidget.relative(data.optString("updatedAt")), 12, 0xFF9DAAB6);
                text("Cost by provider", 22, Color.WHITE); text(MeterwiseWidget.providers(data, 100), 16, 0xFFBAE6FD);
                text("Recent sync activity", 22, Color.WHITE); text(MeterwiseWidget.activity(data, 8, true), 15, Color.WHITE);
            }
        } catch (Exception error) { text("Refresh to load your Meterwise information.", 16, Color.WHITE); }
        if (!Vault.message(this).isEmpty()) text(Vault.message(this), 14, 0xFFFBBF24);
        button("Refresh", v -> { RefreshWorker.refresh(this); toast("Refreshing Meterwise…"); });
        button("Add home-screen widget", v -> {
            AppWidgetManager manager = getSystemService(AppWidgetManager.class);
            if (manager.isRequestPinAppWidgetSupported()) manager.requestPinAppWidget(new ComponentName(this, MeterwiseWidget.class), null, null);
            else toast("Long-press your home screen, choose Widgets, then Meterwise.");
        });
        text("Resize the widget taller to see provider costs and sync activity. Background updates run about every 30 minutes when Android allows.", 13, 0xFF9DAAB6);
        button("Open backoffice in browser", v -> startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(BuildConfig.BACKOFFICE_URL + "/admin/meterwise"))));
        button(loggingOut ? "Logging out…" : "Log out of this device", v -> {
            if (!loggingOut) new AlertDialog.Builder(this).setMessage("Disconnect this device and clear its saved Meterwise information?")
                .setPositiveButton("Log out", (dialog, which) -> logout()).setNegativeButton("Cancel", null).show();
        });
    }
    private void toast(String message) { Toast.makeText(this, message, Toast.LENGTH_LONG).show(); }
    private void signIn() {
        try {
            byte[] bytes = new byte[32]; new java.security.SecureRandom().nextBytes(bytes);
            String verifier = hex(bytes); Vault.pending(this, verifier);
            String challenge = hex(java.security.MessageDigest.getInstance("SHA-256").digest(verifier.getBytes(java.nio.charset.StandardCharsets.UTF_8)));
            startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(BuildConfig.BACKOFFICE_URL + "/admin/meterwise/android/connect?challenge=" + challenge)));
        } catch (Exception error) { toast("Could not open your browser. Please try again."); }
    }
    private static String hex(byte[] bytes) {
        StringBuilder result = new StringBuilder(); for (byte b : bytes) result.append(String.format(java.util.Locale.ROOT, "%02x", b & 255)); return result.toString();
    }
    @Override protected void onNewIntent(Intent intent) { super.onNewIntent(intent); setIntent(intent); handleConnection(intent); }
    private void handleConnection(Intent intent) {
        Uri uri = intent.getData();
        if (uri == null || !"meterwise".equals(uri.getScheme()) || !"connect".equals(uri.getHost()) || connecting || Vault.token(this) != null) return;
        String code = uri.getQueryParameter("code"), verifier = Vault.pending(this);
        // Never retain the single-use callback in the Activity intent after processing it.
        intent.setData(null);
        if (code == null || !code.matches("[a-f0-9]{64}") || verifier == null) { toast("Connection expired. Tap Connect to backoffice again."); return; }
        connecting = true; dashboard();
        new Thread(() -> {
            try {
                Api.Result response = Api.connect(code, verifier);
                if (response.status != 200) throw new Exception(Api.error(response));
                String token = new JSONObject(response.body).getString("token");
                if (!token.matches("[a-f0-9]{64}")) throw new Exception("Invalid connection response");
                Vault.saveToken(this, token); RefreshWorker.schedule(this); RefreshWorker.refresh(this);
                runOnUiThread(() -> { connecting = false; dashboard(); toast("App and widget connected"); });
            } catch (Exception error) {
                runOnUiThread(() -> { connecting = false; dashboard(); toast("Could not connect. Tap Connect to backoffice to try again."); });
            }
        }).start();
    }
    private void logout() {
        final String token = Vault.token(this); if (token == null) { dashboard(); return; }
        loggingOut = true; dashboard();
        new Thread(() -> {
            try {
                Api.Result result = Api.request("DELETE", token);
                if (result.status != 200 && result.status != 401) throw new Exception("Logout failed");
                synchronized (Vault.class) { if (token.equals(Vault.token(this))) Vault.clear(this); }
                RefreshWorker.cancel(this); MeterwiseWidget.renderAll(this);
                runOnUiThread(() -> { loggingOut = false; dashboard(); });
            } catch (Exception error) {
                runOnUiThread(() -> { loggingOut = false; dashboard(); toast("Could not log out. Connect to the internet and try again."); });
            }
        }).start();
    }
    @Override protected void onDestroy() { handler.removeCallbacksAndMessages(null); super.onDestroy(); }
}
