import { NextRequest, NextResponse } from "next/server";
import { requirePermission, getSessionInfo } from "@/lib/admin/permissions";
import { getMeterwiseConfigStatus, saveMeterwiseConfig, clearMeterwiseConfig } from "@/lib/meterwise/config";
import { getOverview, MeterwiseApiError } from "@/lib/meterwise/client";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const authErr = await requirePermission(req, "meterwise", "view");
  if (authErr) return authErr;

  const status = await getMeterwiseConfigStatus();
  return NextResponse.json(status);
}

export async function POST(req: NextRequest) {
  const authErr = await requirePermission(req, "meterwise", "manage");
  if (authErr) return authErr;

  const body = await req.json().catch(() => null);
  const baseUrl = typeof body?.baseUrl === "string" ? body.baseUrl.trim().replace(/\/+$/, "") : "";
  const apiKey = typeof body?.apiKey === "string" ? body.apiKey.trim() : "";

  if (!baseUrl || !apiKey) {
    return NextResponse.json({ error: "Base URL and API key are required" }, { status: 400 });
  }
  if (!/^https?:\/\//i.test(baseUrl)) {
    return NextResponse.json({ error: "Base URL must start with http:// or https://" }, { status: 400 });
  }

  // Save first so getOverview() (which reads from storage) can use it for the test call.
  const session = getSessionInfo(req);
  await saveMeterwiseConfig({ baseUrl, apiKey, connectedBy: session?.staffId ?? "owner" });

  try {
    await getOverview();
  } catch (err) {
    await clearMeterwiseConfig();
    if (err instanceof MeterwiseApiError) {
      return NextResponse.json({ error: `Meterwise rejected the request (${err.status})` }, { status: 400 });
    }
    return NextResponse.json({ error: "Could not reach Meterwise at that base URL" }, { status: 400 });
  }

  const status = await getMeterwiseConfigStatus();
  return NextResponse.json(status);
}

export async function DELETE(req: NextRequest) {
  const authErr = await requirePermission(req, "meterwise", "manage");
  if (authErr) return authErr;

  await clearMeterwiseConfig();
  return NextResponse.json({ configured: false });
}
