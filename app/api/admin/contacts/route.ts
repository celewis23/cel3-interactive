export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import { listContacts, searchContacts, createContact } from "@/lib/google/contacts";

function requireAuth(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;
  return verifySessionToken(token)?.step === "full";
}

export async function GET(req: NextRequest) {
  if (!requireAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
  if (!requireAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const contact = await createContact(body);
    return NextResponse.json(contact, { status: 201 });
  } catch (err) {
    console.error("CONTACTS_CREATE_ERROR:", err);
    return NextResponse.json({ error: "Failed to create contact" }, { status: 500 });
  }
}
