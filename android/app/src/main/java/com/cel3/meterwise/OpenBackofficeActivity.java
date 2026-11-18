package com.cel3.meterwise;

import android.app.Activity;
import android.os.Bundle;
import android.widget.Toast;

/** A direct PendingIntent activity satisfies modern Android widget launch rules. */
public class OpenBackofficeActivity extends Activity {
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        try {
            startActivity(BackofficeLauncher.intent(this));
        } catch (Exception error) { Toast.makeText(this, "Install or enable your backoffice app or browser, then try again.", Toast.LENGTH_LONG).show(); }
        finish();
    }
}
