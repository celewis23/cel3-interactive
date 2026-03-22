/**
 * Audit Log Write Service
 *
 * Single reusable utility for writing audit events across the entire system.
 * All writes are fire-and-forget — they never block or fail the caller.
 * If a write fails, the error is logged silently.
 *
 * Usage (in any route handler after a successful operation):
 *   logAudit(req, { action: "contract.sent", resourceType: "contract", resourceId: c._id, ... });
 *
 * For auth routes (no valid session yet):
 *   logAudit(req, { action: "auth.login_failed", ... }, { userId: null, userName: "unknown", userEmail, isOwner: false });
 */

import { NextRequest } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AuditUserInfo {
  userId: string | null;   // staffMember._id, or null for owner/system
  userName: string;
  userEmail: string;
  isOwner: boolean;
}

export interface AuditEventInput {
  action: string;                           // e.g. "contract.sent", "billing.invoice_created"
  resourceType: string;                     // e.g. "contract", "invoice", "staffMember"
  resourceId?: string | null;               // Sanity _id or Stripe ID
  resourceLabel?: string | null;            // human-readable: contract number, invoice #INV-001, etc.
  description: string;                      // one-line human-readable description
  before?: Record<string, unknown> | null;  // field values before change
  after?: Record<string, unknown> | null;   // field values after change
  metadata?: Record<string, unknown> | null;
}

// ── User Extraction ───────────────────────────────────────────────────────────

/** Cache to avoid repeated Sanity lookups for the same staff member within a request cycle. */
const staffCache = new Map<string, { name: string; email: string; cachedAt: number }>();

async function extractUser(req: NextRequest): Promise<AuditUserInfo> {
  try {
    const token = req.cookies.get(COOKIE_NAME)?.value;
    if (!token) return { userId: null, userName: "System", userEmail: "", isOwner: false };

    const session = verifySessionToken(token);
    if (!session) return { userId: null, userName: "System", userEmail: "", isOwner: false };

    // Owner (env-based credentials) — may have step="partial" (during pin) or "full"
    if (!session.staffId) {
      return {
        userId: null,
        userName: "Owner",
        userEmail: process.env.ADMIN_USERNAME ?? "owner",
        isOwner: true,
      };
    }

    // Staff member — look up from Sanity (with short-lived cache)
    const cached = staffCache.get(session.staffId);
    if (cached && Date.now() - cached.cachedAt < 60_000) {
      return { userId: session.staffId, userName: cached.name, userEmail: cached.email, isOwner: false };
    }

    const staff = await sanityServer.fetch<{ name: string; email: string } | null>(
      `*[_type == "staffMember" && _id == $id][0]{ name, email }`,
      { id: session.staffId }
    );

    const info = {
      userId: session.staffId,
      userName: staff?.name ?? "Unknown",
      userEmail: staff?.email ?? "",
      isOwner: false,
    };

    if (staff) {
      staffCache.set(session.staffId, { name: staff.name, email: staff.email, cachedAt: Date.now() });
      // Evict old entries
      if (staffCache.size > 50) staffCache.clear();
    }

    return info;
  } catch {
    return { userId: null, userName: "System", userEmail: "", isOwner: false };
  }
}

// ── Core Write ────────────────────────────────────────────────────────────────

async function _writeEvent(
  userInfo: AuditUserInfo,
  ipAddress: string | null,
  event: AuditEventInput
): Promise<void> {
  await sanityWriteClient.create({
    _type: "auditEvent",
    timestamp: new Date().toISOString(),
    userId: userInfo.userId,
    userName: userInfo.userName,
    userEmail: userInfo.userEmail,
    isOwner: userInfo.isOwner,
    ipAddress,
    action: event.action,
    resourceType: event.resourceType,
    resourceId: event.resourceId ?? null,
    resourceLabel: event.resourceLabel ?? null,
    description: event.description,
    before: event.before ?? null,
    after: event.after ?? null,
    metadata: event.metadata ?? null,
  });
}

function getIp(req: NextRequest): string | null {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    null
  );
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Fire-and-forget audit event writer.
 *
 * Automatically extracts user info from the request session.
 * Pass `userOverride` for auth routes where the session may not be valid yet
 * (e.g., failed login, pre-PIN owner login).
 *
 * This function is synchronous from the caller's perspective — it never throws.
 */
export function logAudit(
  req: NextRequest,
  event: AuditEventInput,
  userOverride?: AuditUserInfo
): void {
  const ip = getIp(req);

  const doWrite = userOverride
    ? _writeEvent(userOverride, ip, event)
    : extractUser(req).then((u) => _writeEvent(u, ip, event));

  doWrite.catch((err) => {
    console.error("AUDIT_WRITE_FAILED:", event.action, err?.message ?? err);
  });
}

// ── Action Constants ──────────────────────────────────────────────────────────
// Centralised so callers have autocomplete and consistent naming.

export const AuditAction = {
  // Auth
  AUTH_LOGIN:              "auth.login",
  AUTH_LOGIN_FAILED:       "auth.login_failed",
  AUTH_LOGOUT:             "auth.logout",
  AUTH_STAFF_INVITED:      "auth.staff_invited",
  AUTH_STAFF_ACTIVATED:    "auth.staff_activated",

  // Billing
  BILLING_INVOICE_CREATED: "billing.invoice_created",
  BILLING_INVOICE_SENT:    "billing.invoice_sent",
  BILLING_INVOICE_VOIDED:  "billing.invoice_voided",
  BILLING_CUSTOMER_CREATED:"billing.customer_created",
  BILLING_TIME_BILLED:     "billing.time_billed",

  // Estimates
  ESTIMATE_CREATED:        "estimate.created",
  ESTIMATE_SENT:           "estimate.sent",
  ESTIMATE_APPROVED:       "estimate.approved",
  ESTIMATE_DECLINED:       "estimate.declined",
  ESTIMATE_CONVERTED:      "estimate.converted",

  // Contracts
  CONTRACT_CREATED:        "contract.created",
  CONTRACT_SENT:           "contract.sent",
  CONTRACT_SIGNED:         "contract.signed",
  CONTRACT_DECLINED:       "contract.declined",
  CONTRACT_UPDATED:        "contract.updated",
  CONTRACT_DELETED:        "contract.deleted",

  // Projects
  PROJECT_CREATED:         "project.created",
  PROJECT_UPDATED:         "project.updated",
  PROJECT_DELETED:         "project.deleted",

  // Tasks
  TASK_CREATED:            "task.created",
  TASK_UPDATED:            "task.updated",
  TASK_MOVED:              "task.moved",
  TASK_COMPLETED:          "task.completed",
  TASK_DELETED:            "task.deleted",

  // Time
  TIME_CREATED:            "time.entry_created",
  TIME_UPDATED:            "time.entry_updated",
  TIME_DELETED:            "time.entry_deleted",
  TIME_BILLED:             "time.billed",

  // Leads / Pipeline
  LEAD_CREATED:            "lead.created",
  LEAD_UPDATED:            "lead.updated",
  LEAD_STAGE_CHANGED:      "lead.stage_changed",
  LEAD_CONVERTED:          "lead.converted",
  LEAD_DELETED:            "lead.deleted",

  // Staff
  STAFF_INVITED:           "staff.invited",
  STAFF_ACTIVATED:         "staff.activated",
  STAFF_UPDATED:           "staff.updated",
  STAFF_DEACTIVATED:       "staff.deactivated",
  STAFF_DELETED:           "staff.deleted",

  // Roles
  ROLE_CREATED:            "role.created",
  ROLE_UPDATED:            "role.updated",
  ROLE_DELETED:            "role.deleted",

  // Files
  FILE_UPLOADED:           "file.uploaded",
  FILE_DELETED:            "file.deleted",

  // Onboarding
  ONBOARDING_CREATED:      "onboarding.created",
  ONBOARDING_STEP_UPDATED: "onboarding.step_updated",
  ONBOARDING_COMPLETED:    "onboarding.completed",

  // Settings
  SETTINGS_UPDATED:        "settings.updated",

  // Portal users
  PORTAL_USER_CREATED:     "portal_user.created",
} as const;

export type AuditActionValue = typeof AuditAction[keyof typeof AuditAction];
