export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { listTaskLists } from "@/lib/google/tasks";

export async function GET(req: NextRequest) {
  const authErr = await requirePermission(req, "calendar", "view");
  if (authErr) return authErr;

  try {
    const taskLists = await listTaskLists();
    return NextResponse.json(taskLists);
  } catch (err) {
    console.error("TASKLISTS_LIST_ERROR:", err);
    return NextResponse.json({ error: "Failed to list task lists" }, { status: 500 });
  }
}
