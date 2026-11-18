package com.cel3.meterwise;

import android.app.PendingIntent;
import android.appwidget.*;
import android.content.*;
import android.os.Bundle;
import android.view.View;
import android.widget.RemoteViews;
import org.json.*;
import java.text.NumberFormat;
import java.time.Instant;
import java.util.Locale;

public class MeterwiseWidget extends AppWidgetProvider {
    static String money(double value) { return NumberFormat.getCurrencyInstance(Locale.US).format(Double.isFinite(value) ? value : 0); }
    static String relative(String date) {
        try {
            long minutes = Math.max(0, (System.currentTimeMillis() - Instant.parse(date).toEpochMilli()) / 60000);
            return minutes < 1 ? "just now" : minutes < 60 ? minutes + "m ago" : minutes < 1440 ? (minutes / 60) + "h ago" : (minutes / 1440) + "d ago";
        } catch (Exception ignored) { return "unknown time"; }
    }
    static String providers(JSONObject data, int limit) {
        JSONArray rows = data.optJSONArray("providers"); StringBuilder text = new StringBuilder();
        if (rows != null) for (int i = 0; i < Math.min(limit, rows.length()); i++) {
            JSONObject row = rows.optJSONObject(i); if (row == null) continue;
            if (text.length() > 0) text.append("\n");
            text.append(row.optString("name")).append("  ").append(money(row.optDouble("cost")));
        }
        return text.length() == 0 ? "No provider spend yet" : text.toString();
    }
    static String activity(JSONObject data, int limit, boolean detailed) {
        JSONArray rows = data.optJSONArray("syncActivity"); StringBuilder text = new StringBuilder();
        if (rows != null) for (int i = 0; i < Math.min(limit, rows.length()); i++) {
            JSONObject row = rows.optJSONObject(i); if (row == null) continue;
            if (text.length() > 0) text.append(detailed ? "\n\n" : "\n");
            text.append(row.optString("provider")).append(" · ").append(row.optString("status"))
                .append(" · ").append(relative(row.optString("startedAt")));
            if (detailed) text.append("\n").append(row.optString("account")).append(" · ")
                .append(row.optInt("recordsIngested")).append(" records · ").append(row.optInt("errorCount")).append(" errors");
        }
        return text.length() == 0 ? "No recent sync activity" : text.toString();
    }
    static void renderAll(Context c) {
        AppWidgetManager manager = AppWidgetManager.getInstance(c);
        for (int id : manager.getAppWidgetIds(new ComponentName(c, MeterwiseWidget.class))) render(c, manager, id);
    }
    private static void render(Context c, AppWidgetManager manager, int id) {
        Bundle options = manager.getAppWidgetOptions(id);
        boolean landscape = c.getResources().getConfiguration().orientation == android.content.res.Configuration.ORIENTATION_LANDSCAPE;
        int height = options.getInt(landscape ? AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT : AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, 110);
        RemoteViews views = new RemoteViews(c.getPackageName(), height < 210 ? R.layout.widget_meterwise_compact : R.layout.widget_meterwise);
        views.setOnClickPendingIntent(R.id.widget_root, PendingIntent.getActivity(c, 0,
            new Intent(c, MainActivity.class), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
        views.setOnClickPendingIntent(R.id.refresh, PendingIntent.getBroadcast(c, 1,
            new Intent(c, MeterwiseWidget.class).setAction("com.cel3.meterwise.REFRESH"), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
        views.setViewVisibility(R.id.details, height >= 390 ? View.VISIBLE : View.GONE);
        String saved = Vault.snapshot(c);
        try {
            if (saved != null && Vault.token(c) != null) {
                JSONObject data = new JSONObject(saved);
                views.setTextViewText(R.id.spend, money(data.optDouble("mtdCost")));
                views.setTextViewText(R.id.projection, "Month-to-date · Projected " + money(data.optDouble("projectedMonthlyCost")));
                views.setTextViewText(R.id.stats, "Providers " + data.optInt("connectedProviders") + "     Projects " + data.optInt("activeProjects")
                    + "\nDaily avg " + money(data.optDouble("averageDailySpend")) + "     Sync issues " + data.optInt("recentSyncIssues"));
                views.setTextColor(R.id.stats, data.optInt("recentSyncIssues") > 0 ? 0xFFFBBF24 : 0xFFFFFFFF);
                views.setTextViewText(R.id.providers, providers(data, 3));
                views.setTextViewText(R.id.activity, activity(data, 4, false));
                String message = Vault.message(c);
                views.setTextViewText(R.id.updated, (message.isEmpty() ? "Updated " + relative(data.optString("updatedAt")) : message + " · Saved " + relative(data.optString("updatedAt"))));
            } else {
                views.setTextViewText(R.id.updated, Vault.token(c) == null ? "Tap to sign in to Meterwise" : "Waiting for first refresh · Tap to open");
                views.setViewVisibility(R.id.details, View.GONE);
            }
        } catch (Exception ignored) { views.setTextViewText(R.id.updated, "Tap to open Meterwise and refresh"); }
        manager.updateAppWidget(id, views);
    }
    @Override public void onUpdate(Context c, AppWidgetManager manager, int[] ids) {
        renderAll(c); if (Vault.token(c) != null) { RefreshWorker.schedule(c); RefreshWorker.refresh(c); }
    }
    @Override public void onAppWidgetOptionsChanged(Context c, AppWidgetManager manager, int id, Bundle options) { render(c, manager, id); }
    @Override public void onReceive(Context c, Intent intent) {
        super.onReceive(c, intent);
        if ("com.cel3.meterwise.REFRESH".equals(intent.getAction())) { RefreshWorker.refresh(c); }
    }
    @Override public void onDisabled(Context c) { RefreshWorker.cancel(c); }
}
