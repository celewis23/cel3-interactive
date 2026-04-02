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
    const message = err instanceof Error ? err.message : "Failed to list task lists";
    const lower = message.toLowerCase();
    const needsReconnect =
      lower.includes("insufficient authentication scopes") ||
      lower.includes("invalid credentials") ||
      lower.includes("not authenticated");
    const apiDisabled =
      lower.includes("tasks api") && (lower.includes("not been used") || lower.includes("disabled"));

    return NextResponse.json(
      {
        error: needsReconnect
          ? "Google Tasks needs new permissions. Reconnect your Google account from Email or Integrations to grant Tasks access."
          : apiDisabled
          ? "Google Tasks API is not enabled in your Google Cloud project yet."
          : message,
      },
      { status: 500 }
    );
  }
}
