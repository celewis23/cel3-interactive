import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import { sanityServer } from "@/lib/sanityServer";

// ── Module / Action Definitions ───────────────────────────────────────────────

export const MODULES = {
  dashboard:        ["view"],
  clients:          ["view", "edit", "delete"],
  leads:            ["view", "edit", "delete"],
  projects:         ["view", "edit", "delete", "manage"],
  timeTracking:     ["view", "edit", "delete"],
  billing:          ["view", "edit"],
  invoices:         ["view", "edit"],
  estimates:        ["view", "edit", "delete"],
  contracts:        ["view", "edit", "delete"],
  email:            ["view", "edit"],
  calendar:         ["view", "edit"],
  drive:            ["view", "edit"],
  forms:            ["view", "edit"],
  photos:           ["view", "edit"],
  chat:             ["view", "edit"],
  meet:             ["view", "edit"],
  onboarding:       ["view", "edit", "manage"],
  analytics:        ["view"],
  staffManagement:  ["view", "edit", "manage"],
  auditLog:         ["view"],
  settings:         ["view", "manage"],
  announcements:    ["view", "post", "manage"],
} as const;

export type Module = keyof typeof MODULES;
export type RolePermissions = { [M in Module]?: { [action: string]: boolean } };

// ── Default Role Seeds ────────────────────────────────────────────────────────

function allTrue(): RolePermissions {
  const p: RolePermissions = {};
  for (const [mod, actions] of Object.entries(MODULES)) {
    (p as Record<string, Record<string, boolean>>)[mod] = Object.fromEntries(
      (actions as readonly string[]).map((a) => [a, true])
    );
  }
  return p;
}

function allFalse(): RolePermissions {
  const p: RolePermissions = {};
  for (const [mod, actions] of Object.entries(MODULES)) {
    (p as Record<string, Record<string, boolean>>)[mod] = Object.fromEntries(
      (actions as readonly string[]).map((a) => [a, false])
    );
  }
  return p;
}

function merge(base: RolePermissions, overrides: Partial<{ [M in Module]: Partial<Record<string, boolean>> }>): RolePermissions {
  const result = JSON.parse(JSON.stringify(base)) as RolePermissions;
  for (const [mod, actions] of Object.entries(overrides)) {
    if (actions && (result as Record<string, Record<string, boolean>>)[mod]) {
      Object.assign((result as Record<string, Record<string, boolean>>)[mod], actions);
    }
  }
  return result;
}

export const DEFAULT_ROLES: Array<{
  name: string;
  slug: string;
  isSystem: boolean;
  permissions: RolePermissions;
}> = [
  {
    name: "Owner",
    slug: "owner",
    isSystem: true,
    permissions: allTrue(),
  },
  {
    name: "Admin",
    slug: "admin",
    isSystem: true,
    permissions: merge(allTrue(), {
      billing:         { view: false, edit: false },
      staffManagement: { manage: false },
      settings:        { manage: false },
    }),
  },
  {
    name: "Manager",
    slug: "manager",
    isSystem: false,
    permissions: merge(allFalse(), {
      dashboard:    { view: true },
      clients:      { view: true, edit: true, delete: false },
      leads:        { view: true, edit: true, delete: false },
      projects:     { view: true, edit: true, delete: false, manage: true },
      timeTracking: { view: true, edit: true, delete: false },
      estimates:    { view: true, edit: true, delete: false },
      contracts:    { view: true, edit: true, delete: false },
      onboarding:   { view: true, edit: true, manage: true },
      invoices:     { view: true, edit: false },
      analytics:     { view: true },
      forms:         { view: true, edit: false },
      calendar:      { view: true, edit: true },
      email:         { view: true, edit: false },
      announcements: { view: true, post: false, manage: false },
    }),
  },
  {
    name: "Staff",
    slug: "staff",
    isSystem: false,
    permissions: merge(allFalse(), {
      dashboard:     { view: true },
      projects:      { view: true, edit: true, delete: false, manage: false },
      timeTracking:  { view: true, edit: true, delete: false },
      calendar:      { view: true, edit: false },
      announcements: { view: true, post: false, manage: false },
    }),
  },
  {
    name: "Client",
    slug: "client",
    isSystem: false,
    permissions: allFalse(),
  },
];

// ── Role Permission Cache ─────────────────────────────────────────────────────

interface CachedRole {
  permissions: RolePermissions;
  cachedAt: number;
}

const roleCache = new Map<string, CachedRole>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function fetchRolePermissions(roleSlug: string): Promise<RolePermissions | null> {
  const cached = roleCache.get(roleSlug);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return cached.permissions;
  }
  const role = await sanityServer.fetch<{ permissions: RolePermissions } | null>(
    `*[_type == "staffRole" && slug == $slug][0]{ permissions }`,
    { slug: roleSlug }
  );
  if (!role) return null;
  roleCache.set(roleSlug, { permissions: role.permissions, cachedAt: Date.now() });
  return role.permissions;
}

/** Invalidate the cache for a role (call after updating a role). */
export function invalidateRoleCache(roleSlug: string) {
  roleCache.delete(roleSlug);
}

// ── Session Helpers ───────────────────────────────────────────────────────────

export interface SessionInfo {
  staffId: string | null;
  roleSlug: string | null;
  isOwner: boolean;
}

export function getSessionInfo(req: NextRequest): SessionInfo | null {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const session = verifySessionToken(token);
  if (!session || session.step !== "full") return null;
  return {
    staffId:  session.staffId  ?? null,
    roleSlug: session.roleSlug ?? null,
    isOwner:  !session.staffId,
  };
}

// ── Core Permission Check ─────────────────────────────────────────────────────

/**
 * Returns null if authorized, or a NextResponse (401/403) if not.
 *
 * - Owner (no staffId in session) → always authorized.
 * - Staff → permission looked up from their role in Sanity.
 *
 * Replace the per-route `requireAuth` call with:
 *   const authErr = await requirePermission(req, "module", "action");
 *   if (authErr) return authErr;
 */
export async function requirePermission(
  req: NextRequest,
  module: Module,
  action: string
): Promise<NextResponse | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const session = verifySessionToken(token);
  if (!session || session.step !== "full") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Owner — full access
  if (!session.staffId) return null;

  // Staff — check their role's permissions
  const roleSlug = session.roleSlug;
  if (!roleSlug) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const permissions = await fetchRolePermissions(roleSlug);
  if (!permissions) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const modPerms = (permissions as Record<string, Record<string, boolean>>)[module];
  if (!modPerms || !modPerms[action]) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return null;
}

/**
 * Lightweight synchronous auth check (no permission check).
 * Equivalent to the original requireAuth — returns false if not authenticated.
 * Use this for routes where any authenticated user (including staff) should have access.
 */
export function requireAuth(req: NextRequest): boolean {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;
  const session = verifySessionToken(token);
  return !!(session && session.step === "full");
}
