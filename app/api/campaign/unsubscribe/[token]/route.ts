import { NextRequest, NextResponse } from "next/server";
import { unsubscribeByTrackToken } from "@/lib/campaigns/db";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  try {
    const result = await unsubscribeByTrackToken(token);
    const isPortalUser = result?.type === "portal_user";

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Unsubscribed — CEL3 Interactive</title>
  <style>
    body{margin:0;padding:0;background:#0d0d0d;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;display:flex;min-height:100dvh;align-items:center;justify-content:center;}
    .card{background:#111;border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:48px 40px;max-width:440px;width:90%;text-align:center;}
    .brand{font-size:18px;font-weight:700;color:#fff;margin:0 0 32px;}
    .brand span{color:#0ea5e9;}
    h1{font-size:22px;font-weight:700;color:#fff;margin:0 0 12px;}
    p{font-size:14px;color:rgba(255,255,255,.5);margin:0 0 24px;line-height:1.6;}
    a{display:inline-block;padding:10px 24px;background:#0ea5e9;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;}
  </style>
</head>
<body>
  <div class="card">
    <p class="brand">CEL3 <span>Interactive</span></p>
    <h1>${result ? "You're unsubscribed." : "Invalid link."}</h1>
    <p>${result
      ? isPortalUser
        ? "You will no longer receive marketing emails. You can still log in to your client portal at any time."
        : "You have been removed from our mailing list and will not receive further emails."
      : "This unsubscribe link is invalid or has already been used."
    }</p>
    ${isPortalUser ? '<a href="/portal">Go to Portal</a>' : '<a href="/">CEL3 Interactive</a>'}
  </div>
</body>
</html>`;

    return new NextResponse(html, { headers: { "Content-Type": "text/html" } });
  } catch {
    return new NextResponse("Something went wrong.", { status: 500 });
  }
}
