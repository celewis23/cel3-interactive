import { NextRequest, NextResponse } from "next/server";
import { verifyDevice, revokeDevice } from "@/lib/meterwise/deviceAuth";
import { getOverview, listProjects, listProviderAccounts, listSyncLogs, MeterwiseNotConfiguredError } from "@/lib/meterwise/client";
import { widgetSnapshot } from "@/lib/meterwise/widget";

export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store" };
export async function GET(req: NextRequest) {
  try {
    if (!await verifyDevice(req.headers.get("authorization"))) return NextResponse.json({ error: "Sign in again" }, { status: 401, headers });
    const [overview, projects, accounts, logs] = await Promise.all([getOverview(), listProjects(), listProviderAccounts(), listSyncLogs()]);
    return NextResponse.json(widgetSnapshot(overview, projects, accounts, logs), { headers });
  } catch (error) {
    return NextResponse.json({ error: error instanceof MeterwiseNotConfiguredError ? "Connect Meterwise in backoffice settings" : "Meterwise is temporarily unavailable" },
      { status: error instanceof MeterwiseNotConfiguredError ? 409 : 503, headers });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const device = await verifyDevice(req.headers.get("authorization"));
    if (device) await revokeDevice(device._id);
    return NextResponse.json({ ok: true }, { headers });
  } catch {
    return NextResponse.json({ error: "Could not log out. Try again when online." }, { status: 503, headers });
  }
}
