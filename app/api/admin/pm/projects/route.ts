import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import { sanityWriteClient } from "@/lib/sanity.write";
import { sanityServer } from "@/lib/sanityServer";

export const runtime = "nodejs";

function requireAuth(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;
  return verifySessionToken(token)?.step === "full";
}

const DEFAULT_COLUMNS = [
  { id: "backlog", name: "Backlog", taskIds: [] as string[] },
  { id: "in-progress", name: "In Progress", taskIds: [] as string[] },
  { id: "in-review", name: "In Review", taskIds: [] as string[] },
  { id: "done", name: "Done", taskIds: [] as string[] },
];

export async function GET(req: NextRequest) {
  if (!requireAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const projects = await sanityServer.fetch(`
    *[_type == "pmProject"] | order(_createdAt desc) {
      _id, name, description, status, dueDate, clientRef, columns, _createdAt, _updatedAt
    }
  `);

  return NextResponse.json(projects);
}

export async function POST(req: NextRequest) {
  if (!requireAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (!body.name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const created = await sanityWriteClient.create({
    _type: "pmProject",
    name: body.name.trim(),
    description: body.description?.trim() ?? "",
    status: "active",
    dueDate: body.dueDate ?? null,
    clientRef: body.clientRef ?? null,
    columns: DEFAULT_COLUMNS,
  });

  return NextResponse.json(created, { status: 201 });
}
