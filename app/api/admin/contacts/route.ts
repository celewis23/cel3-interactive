export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { listContacts, searchContacts, createContact } from "@/lib/google/contacts";

export async function GET(req: NextRequest) {
  const authErr = await requirePermission(req, "clients", "view");
  if (authErr) return authErr;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const pageToken = searchParams.get("pageToken") ?? undefined;

  try {
    if (q) {
      const contacts = await searchContacts(q);
      return NextResponse.json({ contacts, totalItems: contacts.length });
    } else {
      const result = await listContacts({ pageToken });
      return NextResponse.json(result);
    }
  } catch (err) {
    console.error("CONTACTS_LIST_ERROR:", err);
    const msg = err instanceof Error ? err.message : "Failed to list contacts";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authErr = await requirePermission(req, "clients", "edit");
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const contact = await createContact(body);
    return NextResponse.json(contact, { status: 201 });
  } catch (err) {
    console.error("CONTACTS_CREATE_ERROR:", err);
    return NextResponse.json({ error: "Failed to create contact" }, { status: 500 });
  }
}
