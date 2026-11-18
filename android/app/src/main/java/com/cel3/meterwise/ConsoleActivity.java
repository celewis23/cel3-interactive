package com.cel3.meterwise;

import android.app.*;
import android.content.*;
import android.graphics.Color;
import android.net.Uri;
import android.os.*;
import android.view.*;
import android.webkit.*;
import android.widget.*;
import org.json.*;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.util.Locale;
import java.util.concurrent.atomic.AtomicInteger;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.graphics.Insets;

/** Native application window, not a Chrome Custom Tab or external browser. */
public class ConsoleActivity extends Activity {
    private WebView web;
    private TextView notice;
    private boolean pairing, paired, loginPage;
    private volatile boolean closed;
    private final AtomicInteger authGeneration = new AtomicInteger();
    private ValueCallback<Uri[]> uploads;
    private final Handler handler = new Handler(Looper.getMainLooper());
    @android.annotation.SuppressLint("SetJavaScriptEnabled")
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(0xFF080E18); getWindow().setNavigationBarColor(0xFF080E18);
        LinearLayout panel = new LinearLayout(this); panel.setOrientation(LinearLayout.VERTICAL); panel.setBackgroundColor(Color.BLACK);
        ViewCompat.setOnApplyWindowInsetsListener(panel, (view, insets) -> {
            Insets safe = insets.getInsets(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout() | WindowInsetsCompat.Type.ime());
            view.setPadding(safe.left, safe.top, safe.right, safe.bottom); return WindowInsetsCompat.CONSUMED;
        });
        notice = new TextView(this); notice.setTextColor(0xFF8DE6D8); notice.setBackgroundColor(0xFF10172C); notice.setPadding(16, 12, 16, 12); notice.setVisibility(View.GONE);
        panel.addView(notice);
        web = new WebView(this); web.setBackgroundColor(Color.BLACK);
        WebSettings settings = web.getSettings(); settings.setJavaScriptEnabled(true); settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false); settings.setAllowContentAccess(true); settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSupportMultipleWindows(false);
        CookieManager.getInstance().setAcceptCookie(true); CookieManager.getInstance().setAcceptThirdPartyCookies(web, false);
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (!request.isForMainFrame()) return false;
                String url = request.getUrl().toString();
                if (ConsoleNavigation.internal(BuildConfig.BACKOFFICE_URL, url)) return false;
                external(request.getUrl()); return true;
            }
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                if (ConsoleNavigation.internal(BuildConfig.BACKOFFICE_URL, request.getUrl().toString()) &&
                    "/api/admin/auth/logout".equals(request.getUrl().getPath()) && "POST".equals(request.getMethod())) disconnectWidget(true);
                return null;
            }
            @Override public void onPageFinished(WebView view, String url) { trustedPage(url); }
            @Override public void doUpdateVisitedHistory(WebView view, String url, boolean reload) { view.post(() -> trustedPage(url)); }
            @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) showNotice("Unable to reach backoffice. Check your connection, then tap Backoffice to retry.");
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams parameters) {
                if (uploads != null) uploads.onReceiveValue(null);
                uploads = callback;
                try { startActivityForResult(parameters.createIntent(), 51); }
                catch (Exception error) { uploads.onReceiveValue(null); uploads = null; }
                return true;
            }
        });
        web.setDownloadListener((url, agent, disposition, mime, size) -> download(url, agent, disposition, mime));
        panel.addView(web, new LinearLayout.LayoutParams(-1, 0, 1));
        LinearLayout navigation = new LinearLayout(this); navigation.setBackgroundColor(0xFF080E18);
        nav(navigation, "Backoffice", v -> load("/admin"));
        nav(navigation, "Meterwise", v -> load("/admin/meterwise"));
        nav(navigation, "Widget", v -> startActivity(new Intent(this, MainActivity.class).putExtra("widgetSettings", true)));
        nav(navigation, "Update", v -> startActivity(new Intent(this, UpdateActivity.class)));
        panel.addView(navigation); setContentView(panel);
        ViewCompat.requestApplyInsets(panel);
        if (state == null || web.restoreState(state) == null) load(getIntent().getStringExtra("path"));
    }
    private void nav(LinearLayout bar, String label, View.OnClickListener action) {
        TextView item = new TextView(this); item.setText(label); item.setTextColor(0xFF8DE6D8); item.setTextSize(11); item.setGravity(Gravity.CENTER);
        item.setOnClickListener(action); bar.addView(item, new LinearLayout.LayoutParams(0, Math.round(48 * getResources().getDisplayMetrics().density), 1));
    }
    private void load(String path) { notice.setVisibility(View.GONE); web.loadUrl(BuildConfig.BACKOFFICE_URL + ConsoleNavigation.entry(path)); }
    private void showNotice(String text) { runOnUiThread(() -> { if (!closed) { notice.setText(text); notice.setVisibility(View.VISIBLE); } }); }
    private void external(Uri uri) {
        String scheme = uri.getScheme();
        if (!"https".equals(scheme) && !"http".equals(scheme) && !"mailto".equals(scheme) && !"tel".equals(scheme)) return;
        try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); }
        catch (Exception error) { showNotice("No app is available to open this link."); }
    }
    private static String hex(byte[] bytes) {
        StringBuilder out = new StringBuilder(); for (byte value : bytes) out.append(String.format(Locale.ROOT, "%02x", value & 255)); return out.toString();
    }
    private void trustedPage(String url) {
        if (closed || !ConsoleNavigation.internal(BuildConfig.BACKOFFICE_URL, url)) return;
        String path = Uri.parse(url).getPath();
        CookieManager.getInstance().flush();
        if (path == null || !path.startsWith("/admin")) return;
        if (path.startsWith("/admin/login") || path.startsWith("/admin/pin")) {
            if (!loginPage) authGeneration.incrementAndGet();
            loginPage = true; paired = false; pairing = false; return;
        }
        loginPage = false;
        if (paired || pairing) return;
        pairing = true;
        try {
            byte[] random = new byte[32]; new SecureRandom().nextBytes(random); String verifier = hex(random);
            String challenge = hex(MessageDigest.getInstance("SHA-256").digest(verifier.getBytes(StandardCharsets.UTF_8)));
            web.evaluateJavascript("window.__cel3WidgetPairing=null;fetch('/api/admin/meterwise/device',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({challenge:" + JSONObject.quote(challenge) + "})}).then(async r=>{window.__cel3WidgetPairing={status:r.status,...await r.json()}}).catch(()=>{window.__cel3WidgetPairing={status:503}})", ignored -> {});
            pollPairing(verifier, authGeneration.get(), 0);
        } catch (Exception error) { pairing = false; }
    }
    private void pollPairing(String verifier, int generation, int attempt) {
        if (closed || generation != authGeneration.get()) return;
        web.evaluateJavascript("JSON.stringify(window.__cel3WidgetPairing)", encoded -> {
            if (closed || generation != authGeneration.get()) return;
            try {
                Object value = new JSONTokener(encoded).nextValue();
                if (!(value instanceof String) || "null".equals(value)) {
                    if (attempt < 60) handler.postDelayed(() -> pollPairing(verifier, generation, attempt + 1), 500);
                    else pairing = false;
                    return;
                }
                web.evaluateJavascript("delete window.__cel3WidgetPairing", ignored -> {});
                JSONObject result = new JSONObject((String) value);
                if (result.optInt("status") != 200) {
                    pairing = false; paired = result.optInt("status") == 403;
                    if (paired) disconnectWidget(false);
                    return;
                }
                String code = result.getString("code");
                if (!code.matches("[a-f0-9]{64}")) { pairing = false; return; }
                new Thread(() -> {
                    try {
                        Api.Result response = Api.connect(code, verifier);
                        if (response.status != 200) throw new Exception("Connection failed");
                        String token = new JSONObject(response.body).getString("token");
                        if (!token.matches("[a-f0-9]{64}")) throw new Exception("Invalid connection");
                        String previous; boolean stale;
                        synchronized (Vault.class) {
                            stale = closed || generation != authGeneration.get();
                            previous = Vault.token(this);
                            if (!stale) Vault.saveToken(this, token);
                        }
                        if (stale) { try { Api.request("DELETE", token); } catch (Exception ignored) {} return; }
                        RefreshWorker.schedule(this); RefreshWorker.refresh(this); MeterwiseWidget.renderAll(this);
                        if (previous != null && !previous.equals(token)) { try { Api.request("DELETE", previous); } catch (Exception ignored) {} }
                        runOnUiThread(() -> { if (generation == authGeneration.get()) { pairing = false; paired = true; } });
                    } catch (Exception error) { runOnUiThread(() -> { if (generation == authGeneration.get()) pairing = false; }); }
                }).start();
            } catch (Exception error) { pairing = false; }
        });
    }
    private void disconnectWidget(boolean consoleLogout) {
        String token;
        synchronized (Vault.class) { authGeneration.incrementAndGet(); token = Vault.token(this); Vault.clear(this); }
        RefreshWorker.cancel(this); MeterwiseWidget.renderAll(this);
        if (consoleLogout) runOnUiThread(() -> { paired = false; pairing = false; CookieManager.getInstance().removeAllCookies(null); });
        if (token != null) new Thread(() -> { try { Api.request("DELETE", token); } catch (Exception ignored) {} }).start();
    }
    private void download(String url, String agent, String disposition, String mime) {
        if (!ConsoleNavigation.internal(BuildConfig.BACKOFFICE_URL, url)) { external(Uri.parse(url)); return; }
        try {
            DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
            String cookies = CookieManager.getInstance().getCookie(url); if (cookies != null) request.addRequestHeader("Cookie", cookies);
            request.addRequestHeader("User-Agent", agent); if (mime != null) request.setMimeType(mime);
            String name = URLUtil.guessFileName(url, disposition, mime); request.setTitle(name);
            request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            if (Build.VERSION.SDK_INT >= 29) request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, name);
            else request.setDestinationInExternalFilesDir(this, Environment.DIRECTORY_DOWNLOADS, name);
            getSystemService(DownloadManager.class).enqueue(request); Toast.makeText(this, "Download started", Toast.LENGTH_SHORT).show();
        } catch (Exception error) { showNotice("Unable to start this download. Please try again."); }
    }
    @Override protected void onNewIntent(Intent intent) { super.onNewIntent(intent); setIntent(intent); load(intent.getStringExtra("path")); }
    @Override protected void onSaveInstanceState(Bundle state) { web.saveState(state); super.onSaveInstanceState(state); }
    @Override protected void onPause() { CookieManager.getInstance().flush(); super.onPause(); }
    @Override protected void onResume() {
        super.onResume();
        String cookies = CookieManager.getInstance().getCookie(BuildConfig.BACKOFFICE_URL);
        String current = web.getUrl();
        if ((cookies == null || !cookies.contains("cel3_admin_session=")) && current != null &&
            !current.contains("/admin/login") && !current.contains("/admin/pin")) load("/admin/login");
    }
    @Override public void onBackPressed() { if (web.canGoBack()) web.goBack(); else super.onBackPressed(); }
    @Override protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        if (request == 51 && uploads != null) { uploads.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(result, data)); uploads = null; }
    }
    @Override protected void onDestroy() {
        closed = true; authGeneration.incrementAndGet(); handler.removeCallbacksAndMessages(null); if (uploads != null) uploads.onReceiveValue(null);
        web.stopLoading(); web.destroy(); super.onDestroy();
    }
}
