import { NextRequest, NextResponse } from "next/server";
import { requirePermission, getSessionInfo } from "@/lib/admin/permissions";
import { sanityServer } from "@/lib/sanityServer";
import {
  listIntegrations,
  createIntegration,
  APP_TYPES,
  ALL_SCOPES,
  type AppType,
} from "@/lib/integrations/db";

export const runtime = "nodejs";

// ---------------------------------------------------------------------------
// GET — list all integrations + available portal users
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  const authErr = await requirePermission(req, "settings", "view");
  if (authErr) return authErr;

  try {
    const [integrations, portalUsers] = await Promise.all([
      listIntegrations(),
      sanityServer.fetch<
        Array<{ _id: string; email: string; name: string | null; company: string | null; status: string }>
      >(
        `*[_type == "clientPortalUser"] | order(email asc){
          _id, email, name, company, status
        }`
      ),
    ]);

    return NextResponse.json({ integrations, portalUsers, appTypes: APP_TYPES, scopes: ALL_SCOPES });
  } catch (err) {
    console.error("ADMIN_INTEGRATIONS_GET_ERR:", err);
    return NextResponse.json(
      { error: "Failed to load integrations" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST — create a new integration (returns secret once)
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  const authErr = await requirePermission(req, "settings", "edit");
  if (authErr) return authErr;

  try {
    const session = getSessionInfo(req);
    const body = await req.json();

    const { name, appType, portalUserId, allowedOrigins, allowedRedirectUrls, scopes } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "App name is required" }, { status: 400 });
    }
    if (!portalUserId?.trim()) {
      return NextResponse.json({ error: "Portal user is required" }, { status: 400 });
    }
    if (!APP_TYPES.includes(appType)) {
      return NextResponse.json({ error: "Invalid app type" }, { status: 400 });
    }
    if (!Array.isArray(scopes) || scopes.length === 0) {
      return NextResponse.json({ error: "At least one scope is required" }, { status: 400 });
    }
    const invalidScopes = scopes.filter((s: string) => !ALL_SCOPES.includes(s as never));
    if (invalidScopes.length > 0) {
      return NextResponse.json(
        { error: `Invalid scopes: ${invalidScopes.join(", ")}` },
        { status: 400 }
      );
    }

    const origins: string[] = Array.isArray(allowedOrigins)
      ? allowedOrigins.filter((o: unknown) => typeof o === "string" && o.trim())
      : [];
    const redirectUrls: string[] | null = Array.isArray(allowedRedirectUrls)
      ? allowedRedirectUrls.filter((u: unknown) => typeof u === "string" && u.trim())
      : null;

    // Fetch portal user email for denormalization
    const portalUser = await sanityServer.fetch<{ email: string } | null>(
      `*[_type == "clientPortalUser" && _id == $id][0]{ email }`,
      { id: portalUserId }
    );
    if (!portalUser) {
      return NextResponse.json({ error: "Portal user not found" }, { status: 404 });
    }

    const { integration, secret } = await createIntegration({
      name: name.trim(),
      appType: appType as AppType,
      portalUserId,
      portalUserEmail: portalUser.email,
      allowedOrigins: origins,
      allowedRedirectUrls: redirectUrls,
      scopes,
      createdByAdminId: session?.staffId ?? "owner",
    });

    // Return secret ONCE — it will never be retrievable again
    return NextResponse.json(
      { integration, secret, warning: "Save this secret now. It will not be shown again." },
      { status: 201 }
    );
  } catch (err) {
    console.error("ADMIN_INTEGRATIONS_POST_ERR:", err);
    return NextResponse.json(
      { error: "Failed to create integration" },
      { status: 500 }
    );
  }
}
