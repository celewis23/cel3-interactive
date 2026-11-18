package com.cel3.meterwise;

import android.content.*;
import android.content.pm.*;
import android.net.Uri;
import android.os.Bundle;
import java.util.*;

final class BackofficeLauncher {
    static Intent intent(Context c) {
        Uri target = Uri.parse(BuildConfig.BACKOFFICE_URL + "/admin/meterwise");
        Intent open = new Intent(Intent.ACTION_VIEW, target).addCategory(Intent.CATEGORY_BROWSABLE);
        PackageManager manager = c.getPackageManager();
        // An explicit installed WebAPK handler opens the existing standalone backoffice task
        // instead of letting Chrome handle the link as an ordinary browser tab.
        List<ResolveInfo> handlers = manager.queryIntentActivities(open, PackageManager.GET_META_DATA);
        ResolveInfo best = null; int bestScore = -1;
        for (ResolveInfo handler : handlers) {
            try {
                if (!handler.activityInfo.exported || !handler.activityInfo.enabled) continue;
                String name = handler.activityInfo.packageName;
                if (!name.startsWith("org.chromium.webapk.") && !name.startsWith("com.sec.android.app.sbrowser.webapk.")) continue;
                Bundle metadata = manager.getApplicationInfo(name, PackageManager.GET_META_DATA).metaData;
                String scope = metadata == null ? null : metadata.getString("org.chromium.webapk.shell_apk.scope");
                String start = metadata == null ? null : metadata.getString("org.chromium.webapk.shell_apk.startUrl");
                if (scope == null || !BackofficeScope.contains(scope, target.toString())) continue;
                int score = start != null && Uri.parse(start).getPath() != null && Uri.parse(start).getPath().startsWith("/admin") ? 2 : 1;
                if (score > bestScore) { best = handler; bestScore = score; }
            } catch (Exception ignored) { /* Continue to another installed handler. */ }
        }
        if (best != null) open.setComponent(new ComponentName(best.activityInfo.packageName, best.activityInfo.name));
        return open.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
    }
}
