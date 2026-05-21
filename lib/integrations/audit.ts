import { randomUUID } from "crypto";
import { NextRequest } from "next/server";
import { sql } from "@/lib/postgres";

export interface AuditEntry {
  integrationId: string;
  clientId: string;
  endpoint: string;
  method: string;
  statusCode: number;
  success: boolean;
  portalUserId: string | null;
  req: NextRequest;
}

export function logIntegrationAudit(entry: AuditEntry): void {
  const ip =
    entry.req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    entry.req.headers.get("x-real-ip") ??
    null;

  sql
    .query(
      `INSERT INTO external_app_audit_log
       (id, integration_id, client_id, endpoint, method,
        status_code, success, portal_user_id, requester_ip, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,now())`,
      [
        randomUUID(),
        entry.integrationId,
        entry.clientId,
        entry.endpoint,
        entry.method,
        entry.statusCode,
        entry.success,
        entry.portalUserId,
        ip,
      ]
    )
    .catch((e) => console.error("INTEGRATION_AUDIT_ERR:", e));
}
