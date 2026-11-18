package com.cel3.meterwise;

/** Intent extras cannot turn the console into an arbitrary URL launcher. */
final class ConsoleNavigation {
    static String entry(String path) {
        return path != null && path.matches("/admin(?:/[A-Za-z0-9_-]+)*/?") ? path : "/admin";
    }
    static boolean internal(String origin, String url) { return BackofficeScope.contains(origin + "/", url); }
}
