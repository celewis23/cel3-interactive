package com.cel3.meterwise;

import android.content.Context;
import android.content.Intent;

final class BackofficeLauncher {
    static Intent intent(Context c) {
        return new Intent(c, ConsoleActivity.class).putExtra("path", "/admin/meterwise")
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
    }
}
