export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { getContact, updateContact, deleteContact } from "@/lib/google/contacts";
import { syncContactProfileFromGoogle } from "@/lib/contacts/unifiedSync";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requirePermission(req, "clients", "view");
  if (authErr) return authErr;

  try {
    const { id } = await params;
    const resourceName = `people/${id}`;
    const contact = await getContact(resourceName);
    if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(contact);
  } catch (err) {
    console.error("CONTACTS_GET_ERROR:", err);
    return NextResponse.json({ error: "Failed to get contact" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requirePermission(req, "clients", "edit");
  if (authErr) return authErr;

  try {
    const { id } = await params;
    const resourceName = `people/${id}`;
    const body = await req.json();
    const { etag, ...updateParams } = body;
    if (!etag) {
      return NextResponse.json({ error: "etag is required" }, { status: 400 });
    }
    const contact = await updateContact(resourceName, etag, updateParams);
    await syncContactProfileFromGoogle({
      name: contact.displayName ?? [contact.givenName, contact.familyName].filter(Boolean).join(" ").trim(),
      email: contact.emails[0]?.value ?? null,
      phone: contact.phones[0]?.value ?? null,
      company: contact.organizations[0]?.name ?? null,
      notes: contact.notes ?? null,
      googleContactResourceName: contact.resourceName,
    });
    return NextResponse.json(contact);
  } catch (err) {
    console.error("CONTACTS_UPDATE_ERROR:", err);
    return NextResponse.json({ error: "Failed to update contact" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requirePermission(req, "clients", "edit");
  if (authErr) return authErr;

  try {
    const { id } = await params;
    const resourceName = `people/${id}`;
    await deleteContact(resourceName);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("CONTACTS_DELETE_ERROR:", err);
    return NextResponse.json({ error: "Failed to delete contact" }, { status: 500 });
  }
}
