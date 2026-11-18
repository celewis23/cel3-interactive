package com.cel3.meterwise;

import java.net.URI;

final class BackofficeScope {
    static boolean contains(String scope, String target) {
        try {
            URI s = new URI(scope), t = new URI(target);
            int sp = s.getPort() < 0 ? 443 : s.getPort(), tp = t.getPort() < 0 ? 443 : t.getPort();
            if (!"https".equalsIgnoreCase(s.getScheme()) || !"https".equalsIgnoreCase(t.getScheme()) ||
                s.getHost() == null || !s.getHost().equalsIgnoreCase(t.getHost()) || sp != tp) return false;
            String path = s.getPath().isEmpty() ? "/" : s.getPath();
            return t.getPath().equals(path) || t.getPath().startsWith(path.endsWith("/") ? path : path + "/");
        } catch (Exception error) { return false; }
    }
}
