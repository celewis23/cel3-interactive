import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "cel3_admin_session";

// Public admin routes that don't require auth
const PUBLIC_ADMIN_PATHS = ["/admin/login", "/admin/pin"];
// API routes that handle their own auth
const PUBLIC_API_PATHS = [
  "/api/admin/auth/login",
  "/api/admin/auth/pin",
  "/api/admin/auth/logout",
  "/api/admin/notifications/",
];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only protect /admin routes
  if (!pathname.startsWith("/admin") && !pathname.startsWith("/api/admin/")) {
    return NextResponse.next();
  }

  // Allow public admin paths
  if (
    PUBLIC_ADMIN_PATHS.some((p) => pathname.startsWith(p)) ||
    PUBLIC_API_PATHS.some((p) => pathname.startsWith(p))
  ) {
    return NextResponse.next();
  }

  // Allow existing legacy admin bookings page (key-protected)
  if (pathname.startsWith("/admin/bookings")) {
    return NextResponse.next();
  }

  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }

  // Middleware runs on Edge — do basic structure check only
  // Full HMAC verification happens in API routes/pages
  const parts = token.split(".");
  if (parts.length !== 2) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const res = NextResponse.redirect(new URL("/admin/login", req.url));
    res.cookies.delete(COOKIE_NAME);
    return res;
  }

  try {
    const payload = JSON.parse(Buffer.from(parts[0], "base64").toString("utf8"));

    // Expired
    if (Date.now() > payload.exp) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Session expired" }, { status: 401 });
      }
      const res = NextResponse.redirect(new URL("/admin/login", req.url));
      res.cookies.delete(COOKIE_NAME);
      return res;
    }

    // Partial session — only allow /admin/pin
    if (payload.step === "partial" && !pathname.startsWith("/admin/pin")) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "PIN required" }, { status: 401 });
      }
      return NextResponse.redirect(new URL("/admin/pin", req.url));
    }
  } catch {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
