import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";
import { getOrCreatePortalClientRootFolder, ensureClientDriveFolderAccess } from "@/lib/portal/provision";
import { buildSiteAccessPatch } from "@/lib/siteAccess";

export const runtime = "nodejs";

type PortalUser = {
  _id: string;
  email: string;
  name: string | null;
  company: string | null;
  status: string;
  driveRootFolderId: string | null;
  stripeCustomerId: string | null;
  pipelineContactId: string | null;
  invitationSentAt: string | null;
  lastLoginAt: string | null;
  siteUrl: string | null;
  managementUrl: string | null;
  managementUsername: string | null;
  hasManagementPassword: boolean;
};

const PORTAL_PROJECTION = `{
  _id, email, name, company, status, driveRootFolderId,
  stripeCustomerId, pipelineContactId, invitationSentAt, lastLoginAt,
  siteUrl, managementUrl, managementUsername,
  "hasManagementPassword": defined(managementPasswordEncrypted)
}`;

async function readJsonBody(req: NextRequest) {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

function buildPortalSiteAccessPatch(body: Record<string, unknown>, defaults?: { siteUrl?: string | null; managementUrl?: string | null }) {
  const input: Parameters<typeof buildSiteAccessPatch>[0] = {};
  if ("siteUrl" in body) input.siteUrl = typeof body.siteUrl === "string" ? body.siteUrl : null;
  else if (defaults && "siteUrl" in defaults) input.siteUrl = defaults.siteUrl;

  if ("managementUrl" in body) input.managementUrl = typeof body.managementUrl === "string" ? body.managementUrl : null;
  else if (defaults && "managementUrl" in defaults) input.managementUrl = defaults.managementUrl;

  if ("managementUsername" in body) {
    input.managementUsername = typeof body.managementUsername === "string" ? body.managementUsername : null;
  }
  if ("managementPassword" in body && typeof body.managementPassword === "string") {
    input.managementPassword = body.managementPassword;
  }

  return buildSiteAccessPatch(input);
}

// GET — fetch portal user linked to this pipeline contact
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requirePermission(req, "clients", "view");
  if (authErr) return authErr;
  const { id } = await params;
  try {
    const portalUser = await sanityServer.fetch<PortalUser | null>(
      `*[_type == "clientPortalUser" && pipelineContactId == $id][0]${PORTAL_PROJECTION}`,
      { id }
    );
    return NextResponse.json({ portalUser: portalUser ?? null });
  } catch (err) {
    console.error("PORTAL_GET_ERR:", err);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

// POST — provision portal access (create Drive folder + portal user)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requirePermission(req, "clients", "edit");
  if (authErr) return authErr;
  const { id } = await params;
  try {
    const body = await readJsonBody(req);
    const contact = await sanityServer.fetch<{
      _id: string; name: string; email: string | null;
      company: string | null; stripeCustomerId: string | null;
      siteUrl: string | null; managementUrl: string | null;
      portalSiteUrl: string | null; portalManagementUrl: string | null;
      portalManagementUsername: string | null;
      portalManagementPasswordEncrypted: string | null; portalManagementPasswordIv: string | null;
    } | null>(
      `*[_type == "pipelineContact" && _id == $id][0]{
        _id, name, email, company, stripeCustomerId,
        siteUrl, managementUrl,
        portalSiteUrl, portalManagementUrl, portalManagementUsername,
        portalManagementPasswordEncrypted, portalManagementPasswordIv
      }`,
      { id }
    );
    if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    if (!contact.email) return NextResponse.json(
      { error: "Contact needs an email address before portal access can be granted" },
      { status: 400 }
    );

    const email = contact.email.toLowerCase();
    const siteAccessPatch = buildPortalSiteAccessPatch(body, {
      siteUrl: contact.portalSiteUrl ?? contact.siteUrl,
      managementUrl: contact.portalManagementUrl ?? contact.managementUrl,
    });
    if (!("managementUsername" in body) && contact.portalManagementUsername) {
      siteAccessPatch.managementUsername = contact.portalManagementUsername;
    }
    if (
      !("managementPassword" in body) &&
      contact.portalManagementPasswordEncrypted &&
      contact.portalManagementPasswordIv
    ) {
      siteAccessPatch.managementPasswordEncrypted = contact.portalManagementPasswordEncrypted;
      siteAccessPatch.managementPasswordIv = contact.portalManagementPasswordIv;
    }

    // Check for existing portal user (by contact link or email)
    const existing = await sanityServer.fetch<PortalUser | null>(
      `*[_type == "clientPortalUser" && (pipelineContactId == $id || email == $email)][0]${PORTAL_PROJECTION}`,
      { id, email }
    );

    if (existing) {
      // Re-link, restore if suspended, ensure Drive access
      const patch: Record<string, unknown> = { pipelineContactId: id, ...siteAccessPatch };
      if (existing.status === "suspended") patch.status = "ready";

      let folderId = existing.driveRootFolderId;
      if (!folderId) {
        const folder = await getOrCreatePortalClientRootFolder({ company: contact.company, name: contact.name, email });
        folderId = folder.id;
        patch.driveRootFolderId = folderId;
      }
      await sanityWriteClient.patch(existing._id).set(patch).commit();
      await ensureClientDriveFolderAccess({ folderId, email });

      const updated = await sanityServer.fetch<PortalUser | null>(
        `*[_type == "clientPortalUser" && _id == $pid][0]${PORTAL_PROJECTION}`,
        { pid: existing._id }
      );
      return NextResponse.json({ portalUser: updated });
    }

    // Create Drive folder
    const folder = await getOrCreatePortalClientRootFolder({ company: contact.company, name: contact.name, email });
    await ensureClientDriveFolderAccess({ folderId: folder.id, email });

    // Create portal user
    const created = await sanityWriteClient.create({
      _type: "clientPortalUser",
      email,
      name: contact.name,
      company: contact.company ?? null,
      stripeCustomerId: contact.stripeCustomerId ?? null,
      pipelineContactId: id,
      driveRootFolderId: folder.id,
      passwordHash: null,
      passwordSalt: null,
      mustChangePassword: false,
      invitationSentAt: null,
      status: "ready",
      createdAt: new Date().toISOString(),
      lastLoginAt: null,
      ...siteAccessPatch,
    });

    const portalUser = await sanityServer.fetch<PortalUser | null>(
      `*[_type == "clientPortalUser" && _id == $pid][0]${PORTAL_PROJECTION}`,
      { pid: created._id }
    );
    return NextResponse.json({ portalUser });
  } catch (err) {
    console.error("PORTAL_PROVISION_ERR:", err);
    return NextResponse.json({ error: "Failed to provision portal access" }, { status: 500 });
  }
}

// PATCH — update portal user name/company/status
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requirePermission(req, "clients", "edit");
  if (authErr) return authErr;
  const { id } = await params;
  try {
    const body = await req.json();
    const portalUser = await sanityServer.fetch<PortalUser | null>(
      `*[_type == "clientPortalUser" && pipelineContactId == $id][0]${PORTAL_PROJECTION}`,
      { id }
    );
    if (!portalUser) return NextResponse.json({ error: "Portal user not found" }, { status: 404 });

    const patch: Record<string, unknown> = {};
    if ("name" in body) patch.name = body.name ?? null;
    if ("company" in body) patch.company = body.company ?? null;
    if ("status" in body) patch.status = body.status;
    Object.assign(patch, buildPortalSiteAccessPatch(body));
    if (Object.keys(patch).length > 0) {
      await sanityWriteClient.patch(portalUser._id).set(patch).commit();
    }

    const updated = await sanityServer.fetch<PortalUser | null>(
      `*[_type == "clientPortalUser" && _id == $pid][0]${PORTAL_PROJECTION}`,
      { pid: portalUser._id }
    );
    return NextResponse.json({ portalUser: updated });
  } catch (err) {
    console.error("PORTAL_PATCH_ERR:", err);
    return NextResponse.json({ error: "Failed to update portal user" }, { status: 500 });
  }
}

// DELETE — suspend portal access (soft)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requirePermission(req, "clients", "edit");
  if (authErr) return authErr;
  const { id } = await params;
  try {
    const portalUser = await sanityServer.fetch<{ _id: string } | null>(
      `*[_type == "clientPortalUser" && pipelineContactId == $id][0]{ _id }`,
      { id }
    );
    if (!portalUser) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await sanityWriteClient.patch(portalUser._id).set({ status: "suspended" }).commit();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("PORTAL_SUSPEND_ERR:", err);
    return NextResponse.json({ error: "Failed to suspend portal access" }, { status: 500 });
  }
}
