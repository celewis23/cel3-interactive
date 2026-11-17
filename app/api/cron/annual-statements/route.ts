import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { dueStatementYear } from "@/lib/billing/annualStatements";
import { runAnnualStatements } from "@/lib/billing/annualStatementService";
import { withActivity } from "@/lib/audit/withActivity";

export const runtime = "nodejs";
export const maxDuration = 300;
async function handleGET(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  const actual = req.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!expected || !actual || Buffer.byteLength(expected) !== Buffer.byteLength(actual) || !timingSafeEqual(Buffer.from(expected), Buffer.from(actual))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const year = dueStatementYear();
  if (year === null) return NextResponse.json({ skipped: "Not due until January 15, America/New_York" });
  try {
    const result = await runAnnualStatements(year);
    return NextResponse.json(result);
  } catch (error) {
    console.error("ANNUAL_STATEMENTS_ERR", error);
    return NextResponse.json({ error: "Annual statements failed; inspect delivery records before retrying" }, { status: 500 });
  }
}
export const GET = withActivity("/api/cron/annual-statements", "GET", handleGET);
