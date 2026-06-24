import { NextRequest, NextResponse } from "next/server";
import { PlatformBuilderValidationError, submitPlatformBuilderLead } from "@/lib/platformBuilder/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await submitPlatformBuilderLead(body, req.nextUrl.origin);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof PlatformBuilderValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("PLATFORM_BUILDER_SUBMIT_ERR:", err);
    return NextResponse.json({ error: "Failed to generate proposal. Please try again." }, { status: 500 });
  }
}
