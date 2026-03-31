import { NextRequest, NextResponse } from "next/server";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";
import { verifyPassword } from "@/lib/admin/staffPassword";
import { createPortalSessionToken, PORTAL_COOKIE } from "@/lib/portal/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    const passwordValue = typeof password === "string" ? password : "";

    if (!normalizedEmail || !passwordValue) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const user = await sanityServer.fetch<{
      _id: string;
      email: string;
      status: string;
      passwordHash: string | null;
      passwordSalt: string | null;
      mustChangePassword: boolean | null;
    } | null>(
      `*[_type == "clientPortalUser" && email == $email][0]{
        _id, email, status, passwordHash, passwordSalt, mustChangePassword
      }`,
      { email: normalizedEmail }
    );

    if (
      !user ||
      user.status === "suspended" ||
      !user.passwordHash ||
      !user.passwordSalt ||
      !verifyPassword(passwordValue, user.passwordHash, user.passwordSalt)
    ) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    await sanityWriteClient.patch(user._id).set({
      lastLoginAt: new Date().toISOString(),
      status: "active",
    }).commit();

    const response = NextResponse.json({
      ok: true,
      redirectTo: user.mustChangePassword ? "/portal/auth/change-password" : "/portal",
    });
    response.cookies.set(PORTAL_COOKIE, createPortalSessionToken(user._id, user.email), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });
    return response;
  } catch (err) {
    console.error("PORTAL_AUTH_LOGIN_ERR:", err);
    return NextResponse.json({ error: "Failed to sign in" }, { status: 500 });
  }
}
