/**
 * Minimal Vercel REST API wrapper for domain-level redirect enforcement.
 * Used to put a suspended client's live site into maintenance mode (and,
 * as a side effect, block their own admin console) without touching that
 * client's own codebase — Vercel issues the redirect at the edge.
 */

const VERCEL_API_BASE = "https://api.vercel.com";

function authHeaders(): Record<string, string> {
  const token = process.env.VERCEL_TOKEN;
  if (!token) throw new Error("Missing VERCEL_TOKEN");
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

function withTeam(path: string): string {
  const teamId = process.env.VERCEL_TEAM_ID;
  if (!teamId) return path;
  return `${path}${path.includes("?") ? "&" : "?"}teamId=${encodeURIComponent(teamId)}`;
}

export type VercelResult = { ok: true } | { ok: false; error: string };

/**
 * Point a project domain at a target URL via a platform-level redirect.
 * Vercel serves this redirect for every request to the domain, independent
 * of the deployed application — this is what actually enforces maintenance
 * mode / blocks admin access on the client's live site.
 */
export async function setDomainRedirect(opts: {
  projectId: string;
  domain: string;
  redirectTo: string;
  statusCode?: 301 | 302 | 307 | 308;
}): Promise<VercelResult> {
  if (!process.env.VERCEL_TOKEN) {
    return { ok: false, error: "VERCEL_TOKEN is not configured" };
  }
  try {
    const res = await fetch(
      withTeam(`${VERCEL_API_BASE}/v9/projects/${encodeURIComponent(opts.projectId)}/domains/${encodeURIComponent(opts.domain)}`),
      {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({
          redirect: opts.redirectTo,
          redirectStatusCode: opts.statusCode ?? 307,
        }),
      }
    );
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { ok: false, error: body?.error?.message ?? `Vercel API returned ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Remove a previously-set domain redirect, restoring normal traffic to the deployment. */
export async function clearDomainRedirect(opts: { projectId: string; domain: string }): Promise<VercelResult> {
  if (!process.env.VERCEL_TOKEN) {
    return { ok: false, error: "VERCEL_TOKEN is not configured" };
  }
  try {
    const res = await fetch(
      withTeam(`${VERCEL_API_BASE}/v9/projects/${encodeURIComponent(opts.projectId)}/domains/${encodeURIComponent(opts.domain)}`),
      {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ redirect: null, redirectStatusCode: null }),
      }
    );
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { ok: false, error: body?.error?.message ?? `Vercel API returned ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
