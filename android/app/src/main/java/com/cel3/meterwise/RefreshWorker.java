package com.cel3.meterwise;

import android.content.Context;
import androidx.work.*;
import java.util.concurrent.TimeUnit;
import org.json.JSONObject;

public class RefreshWorker extends Worker {
    public RefreshWorker(Context context, WorkerParameters parameters) { super(context, parameters); }
    static void schedule(Context c) {
        Constraints constraints = new Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build();
        WorkManager.getInstance(c).enqueueUniquePeriodicWork("meterwise-periodic", ExistingPeriodicWorkPolicy.KEEP,
            new PeriodicWorkRequest.Builder(RefreshWorker.class, 30, TimeUnit.MINUTES).setConstraints(constraints).build());
    }
    static void refresh(Context c) {
        WorkManager.getInstance(c).enqueueUniqueWork("meterwise-refresh", ExistingWorkPolicy.KEEP,
            new OneTimeWorkRequest.Builder(RefreshWorker.class).build());
    }
    static void cancel(Context c) {
        WorkManager.getInstance(c).cancelUniqueWork("meterwise-periodic");
        WorkManager.getInstance(c).cancelUniqueWork("meterwise-refresh");
    }
    @Override public Result doWork() {
        Context c = getApplicationContext();
        String token = Vault.token(c);
        if (token == null) { MeterwiseWidget.renderAll(c); return Result.success(); }
        Result result = Result.success();
        try {
            Api.Result response = Api.request("GET", token);
            synchronized (Vault.class) {
                if (!token.equals(Vault.token(c))) return Result.success();
                if (response.status == 401 || response.status == 403) {
                    Vault.clear(c); Vault.message(c, "Sign in again. Your password or access may have changed.");
                    WorkManager.getInstance(c).cancelUniqueWork("meterwise-periodic");
                } else if (response.status == 200) {
                    JSONObject data = new JSONObject(response.body);
                    data.getString("updatedAt"); data.getDouble("mtdCost");
                    Vault.snapshot(c, token, response.body);
                } else {
                    Vault.message(c, Api.error(response));
                    if (response.status >= 500 && getRunAttemptCount() < 3) result = Result.retry();
                }
            }
        } catch (Exception error) {
            synchronized (Vault.class) {
                if (token.equals(Vault.token(c))) Vault.message(c, "Offline or unable to refresh. Showing last saved data.");
            }
            if (getRunAttemptCount() < 3) result = Result.retry();
        }
        MeterwiseWidget.renderAll(c);
        return result;
    }
}
