import { NextRequest, NextResponse } from "next/server";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";
import { createPortalSessionToken, PORTAL_COOKIE } from "@/lib/portal/auth";

export const runtime = "nodejs";

type TokenDoc = {
  _id: string;
  userId: string;
  email: string;
  expiresAt: string;
  used: boolean;
};

async function consumeToken(token: string) {
  const tokenDoc = (await sanityServer.fetch(
    `*[_type == "clientPortalToken" && token == $tok][0]{ _id, userId, email, expiresAt, used }`,
    { tok: token }
  )) as TokenDoc | null;

  if (!tokenDoc || tokenDoc.used || new Date(tokenDoc.expiresAt) < new Date()) {
    return { error: "expired" as const };
  }

  const portalUser = await sanityServer.fetch<{ mustChangePassword: boolean | null } | null>(
    `*[_type == "clientPortalUser" && _id == $id][0]{ mustChangePassword }`,
    { id: tokenDoc.userId }
  );

  await sanityWriteClient.patch(tokenDoc._id).set({ used: true }).commit();
  await sanityWriteClient
    .patch(tokenDoc.userId)
    .set({ lastLoginAt: new Date().toISOString(), status: "active" })
    .commit();

  const sessionToken = createPortalSessionToken(tokenDoc.userId, tokenDoc.email);
  const redirectTo = portalUser?.mustChangePassword ? "/portal/auth/change-password" : "/portal";
  const response = NextResponse.json({ ok: true, redirectTo });
  response.cookies.set(PORTAL_COOKIE, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60,
    path: "/",
  });
  return { response };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.redirect(new URL("/portal/auth/login?error=invalid", req.url));
    }

    return NextResponse.redirect(new URL(`/portal/auth/verify?token=${encodeURIComponent(token)}`, req.url));
  } catch (err) {
    console.error("PORTAL_AUTH_VERIFY_ERR:", err);
    return NextResponse.redirect(new URL("/portal/auth/login?error=server", req.url));
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({})) as { token?: string };
    const token = body.token?.trim();

    if (!token) {
      return NextResponse.json({ error: "invalid" }, { status: 400 });
    }

    const result = await consumeToken(token);
    if ("response" in result) return result.response;
    return NextResponse.json({ error: result.error }, { status: 410 });
  } catch (err) {
    console.error("PORTAL_AUTH_VERIFY_POST_ERR:", err);
    return NextResponse.json({ error: "server" }, { status: 500 });
  }
}
