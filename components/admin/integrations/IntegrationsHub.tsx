"use client";

import { useState, useEffect } from "react";

// ── Types ────────────────────────────────────────────────────────────────────

interface GoogleStatus {
  connected: boolean;
  email?: string;
  connectedAt?: string;
  tokenExpiry?: number;
  expired?: boolean;
  healthy?: boolean;
  lastError?: string | null;
}

interface StripeStatus {
  connected: boolean;
  mode?: "live" | "test";
  accountName?: string | null;
  healthy?: boolean;
  lastError?: string | null;
  keyPrefix?: string;
}

interface AllStatus {
  google: GoogleStatus;
  stripe: StripeStatus;
}

// ── Icons ────────────────────────────────────────────────────────────────────

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function StripeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none">
      <rect width="24" height="24" rx="4" fill="#635BFF"/>
      <path d="M11.5 9.5c0-.83.67-1.5 1.5-1.5.55 0 1.04.3 1.3.74l1.7-1.04C15.43 6.68 14.28 6 13 6c-1.93 0-3.5 1.57-3.5 3.5 0 3.5 4.5 2.5 4.5 4.5 0 .83-.67 1.5-1.5 1.5-.62 0-1.17-.37-1.44-.91L9.34 15.6C9.88 16.5 10.87 17 13 17c1.93 0 3.5-1.57 3.5-3.5C16.5 10 11.5 11 11.5 9.5z" fill="white"/>
    </svg>
  );
}

function ResendIcon() {
  return (
    <div className="w-7 h-7 rounded bg-black flex items-center justify-center text-white font-bold text-xs">R</div>
  );
}

function ComingSoonIcon({ letter }: { letter: string }) {
  return (
    <div className="w-7 h-7 rounded-lg bg-white/8 flex items-center justify-center text-white/40 font-semibold text-xs">{letter}</div>
  );
}

// ── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: "connected" | "disconnected" | "error" | "warning" }) {
  const styles = {
    connected: "bg-emerald-500/15 text-emerald-400",
    disconnected: "bg-white/8 text-white/40",
    error: "bg-red-500/15 text-red-400",
    warning: "bg-amber-500/15 text-amber-400",
  };
  const labels = {
    connected: "Connected",
    disconnected: "Not connected",
    error: "Error",
    warning: "Token expired",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${status === "connected" ? "bg-emerald-400" : status === "error" ? "bg-red-400" : status === "warning" ? "bg-amber-400" : "bg-white/30"}`} />
      {labels[status]}
    </span>
  );
}

// ── Sub-service chips (for Google) ───────────────────────────────────────────

const GOOGLE_SERVICES = [
  { label: "Gmail", icon: "✉" },
  { label: "Calendar", icon: "📅" },
  { label: "Drive", icon: "📁" },
  { label: "Chat", icon: "💬" },
  { label: "Meet", icon: "📹" },
  { label: "Contacts", icon: "👤" },
  { label: "Photos", icon: "🖼" },
];

// ── Google Card ───────────────────────────────────────────────────────────────

function GoogleCard({ status, onRefresh }: { status: GoogleStatus; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  const cardStatus = !status.connected
    ? "disconnected"
    : status.expired
    ? "warning"
    : !status.healthy
    ? "error"
    : "connected";

  async function handleDisconnect() {
    if (!confirmDisconnect) { setConfirmDisconnect(true); return; }
    setDisconnecting(true);
    setConfirmDisconnect(false);
    try {
      await fetch("/api/admin/integrations/google/disconnect", { method: "POST" });
      onRefresh();
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <div className="bg-white/3 border border-white/8 rounded-xl overflow-hidden">
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 mt-0.5"><GoogleIcon /></div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h3 className="text-base font-semibold text-white">Google Workspace</h3>
              <StatusBadge status={cardStatus} />
            </div>
            <p className="text-sm text-white/45 mt-1">
              Powers Gmail, Calendar, Drive, Chat, Meet, Contacts, and Photos — all via a single OAuth connection.
            </p>

            {status.connected && (
              <div className="mt-3 space-y-1.5">
                <p className="text-xs text-white/50">
                  <span className="text-white/30">Account</span>{" "}
                  <span className="text-white/70">{status.email}</span>
                </p>
                {status.connectedAt && (
                  <p className="text-xs text-white/50">
                    <span className="text-white/30">Connected</span>{" "}
                    {new Date(status.connectedAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                  </p>
                )}
                {status.lastError && (
                  <p className="text-xs text-red-400 mt-1">
                    Last error: {status.lastError}
                  </p>
                )}
              </div>
            )}

            {status.connected && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {GOOGLE_SERVICES.map((svc) => (
                  <span
                    key={svc.label}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${status.healthy ? "bg-emerald-500/10 text-emerald-400/80" : "bg-white/5 text-white/30"}`}
                  >
                    <span className="text-[10px]">{svc.icon}</span>
                    {svc.label}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex-shrink-0 flex flex-col items-end gap-2">
            {!status.connected ? (
              <a
                href="/api/admin/email/auth/connect"
                className="px-3 py-1.5 bg-sky-500 hover:bg-sky-400 text-white text-xs font-medium rounded-lg transition-colors"
              >
                Connect
              </a>
            ) : (
              <>
                {(status.expired || !status.healthy) && (
                  <a
                    href="/api/admin/email/auth/connect"
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-white text-xs font-medium rounded-lg transition-colors"
                  >
                    Re-authenticate
                  </a>
                )}
                {confirmDisconnect ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-red-400">Sure?</span>
                    <button
                      onClick={handleDisconnect}
                      disabled={disconnecting}
                      className="px-2 py-1 bg-red-500 hover:bg-red-400 text-white text-xs rounded-lg transition-colors disabled:opacity-50"
                    >
                      Yes, disconnect
                    </button>
                    <button
                      onClick={() => setConfirmDisconnect(false)}
                      className="px-2 py-1 bg-white/5 hover:bg-white/10 text-white/60 text-xs rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleDisconnect}
                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white text-xs rounded-lg transition-colors"
                  >
                    Disconnect
                  </button>
                )}
              </>
            )}
            {status.connected && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-xs text-white/30 hover:text-white/60 transition-colors flex items-center gap-1"
              >
                Settings
                <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className={`transition-transform ${expanded ? "rotate-180" : ""}`}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Settings panel */}
      {expanded && status.connected && (
        <div className="border-t border-white/8 px-5 py-4 bg-white/2 space-y-4">
          <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">Google Workspace Settings</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-white/30 mb-1">Connected Account</p>
              <p className="text-white/70">{status.email}</p>
            </div>
            <div>
              <p className="text-xs text-white/30 mb-1">OAuth Scopes</p>
              <p className="text-white/50">Gmail, Calendar, Drive, Chat, Contacts</p>
            </div>
            <div>
              <p className="text-xs text-white/30 mb-1">Token Expires</p>
              <p className="text-white/50">
                {status.tokenExpiry
                  ? new Date(status.tokenExpiry).toLocaleString()
                  : "Unknown"}
              </p>
            </div>
            <div>
              <p className="text-xs text-white/30 mb-1">Re-authorize</p>
              <a
                href="/api/admin/email/auth/connect"
                className="text-sky-400 hover:text-sky-300 text-xs transition-colors"
              >
                Click to re-authenticate →
              </a>
            </div>
          </div>
          <div className="pt-2 border-t border-white/5">
            <p className="text-xs text-white/25">
              All Google services (Gmail, Calendar, Drive, Chat, Meet, Contacts, Photos) share this connection.
              Disconnecting will disable all of them simultaneously.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Stripe Card ───────────────────────────────────────────────────────────────

function StripeCard({ status }: { status: StripeStatus }) {
  const [expanded, setExpanded] = useState(false);

  const cardStatus = !status.connected
    ? "disconnected"
    : !status.healthy
    ? "error"
    : "connected";

  return (
    <div className="bg-white/3 border border-white/8 rounded-xl overflow-hidden">
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 mt-0.5"><StripeIcon /></div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h3 className="text-base font-semibold text-white">Stripe</h3>
              <StatusBadge status={cardStatus} />
              {status.connected && status.mode && (
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${status.mode === "live" ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"}`}>
                  {status.mode === "live" ? "Live" : "Test"} mode
                </span>
              )}
            </div>
            <p className="text-sm text-white/45 mt-1">
              Payment processing, invoicing, subscriptions, and customer management.
            </p>

            {status.connected && (
              <div className="mt-3 space-y-1">
                {status.accountName && (
                  <p className="text-xs text-white/50">
                    <span className="text-white/30">Account</span>{" "}
                    <span className="text-white/70">{status.accountName}</span>
                  </p>
                )}
                <p className="text-xs text-white/50">
                  <span className="text-white/30">API Key</span>{" "}
                  <span className="font-mono text-white/40">{status.keyPrefix}</span>
                </p>
                {status.lastError && (
                  <p className="text-xs text-red-400 mt-1">Last error: {status.lastError}</p>
                )}
              </div>
            )}
          </div>
          <div className="flex-shrink-0 flex flex-col items-end gap-2">
            {!status.connected ? (
              <span className="text-xs text-white/30 italic">Configure via env var</span>
            ) : (
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-xs text-white/30 hover:text-white/60 transition-colors flex items-center gap-1"
              >
                Settings
                <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className={`transition-transform ${expanded ? "rotate-180" : ""}`}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {expanded && status.connected && (
        <div className="border-t border-white/8 px-5 py-4 bg-white/2 space-y-4">
          <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">Stripe Settings</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-white/30 mb-1">Mode</p>
              <p className={status.mode === "live" ? "text-emerald-400" : "text-amber-400"}>
                {status.mode === "live" ? "Live (production)" : "Test mode"}
              </p>
            </div>
            <div>
              <p className="text-xs text-white/30 mb-1">Account</p>
              <p className="text-white/70">{status.accountName ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-white/30 mb-1">API Key</p>
              <p className="text-white/40 font-mono text-xs">{status.keyPrefix}</p>
            </div>
            <div>
              <p className="text-xs text-white/30 mb-1">Health</p>
              <p className={status.healthy ? "text-emerald-400" : "text-red-400"}>
                {status.healthy ? "API reachable" : "Connection error"}
              </p>
            </div>
          </div>
          <div className="pt-2 border-t border-white/5">
            <p className="text-xs text-white/25">
              Stripe is configured via the <span className="font-mono">STRIPE_SECRET_KEY</span> environment variable.
              To switch modes or accounts, update the variable in your deployment settings.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Resend Card (env-based, informational) ────────────────────────────────────

function ResendCard() {
  const [expanded, setExpanded] = useState(false);
  const connected = true; // env-based, always "connected" if in use

  return (
    <div className="bg-white/3 border border-white/8 rounded-xl overflow-hidden">
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 mt-0.5"><ResendIcon /></div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h3 className="text-base font-semibold text-white">Resend</h3>
              {connected ? <StatusBadge status="connected" /> : <StatusBadge status="disconnected" />}
            </div>
            <p className="text-sm text-white/45 mt-1">
              Transactional email delivery for notifications, form submissions, and booking confirmations.
            </p>
            {connected && (
              <p className="text-xs text-white/40 mt-2">
                From: <span className="text-white/60">CEL3 Interactive &lt;noreply@cel3interactive.com&gt;</span>
              </p>
            )}
          </div>
          <div className="flex-shrink-0">
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-white/30 hover:text-white/60 transition-colors flex items-center gap-1"
            >
              Settings
              <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className={`transition-transform ${expanded ? "rotate-180" : ""}`}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-white/8 px-5 py-4 bg-white/2 space-y-4">
          <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">Resend Settings</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-white/30 mb-1">From Address</p>
              <p className="text-white/60 text-xs">CEL3 Interactive &lt;noreply@cel3interactive.com&gt;</p>
            </div>
            <div>
              <p className="text-xs text-white/30 mb-1">Usage</p>
              <p className="text-white/60 text-xs">Form submissions, booking confirmations</p>
            </div>
          </div>
          <div className="pt-2 border-t border-white/5">
            <p className="text-xs text-white/25">
              Configured via <span className="font-mono">RESEND_API_KEY</span> environment variable.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Coming Soon Card ──────────────────────────────────────────────────────────

function ComingSoonCard({ name, letter, description }: { name: string; letter: string; description: string }) {
  return (
    <div className="bg-white/2 border border-white/5 rounded-xl p-5 opacity-60">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 mt-0.5"><ComingSoonIcon letter={letter} /></div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-semibold text-white/50">{name}</h3>
            <span className="px-2 py-0.5 rounded text-xs bg-white/5 text-white/30">Coming soon</span>
          </div>
          <p className="text-sm text-white/25 mt-1">{description}</p>
        </div>
      </div>
    </div>
  );
}

// ── Health Summary Banner ─────────────────────────────────────────────────────

function HealthBanner({ status }: { status: AllStatus | null }) {
  if (!status) return null;

  const issues: string[] = [];
  if (status.google.connected && status.google.expired) issues.push("Google Workspace token has expired");
  if (status.google.connected && !status.google.healthy && !status.google.expired) issues.push("Google Workspace connection error");
  if (status.stripe.connected && !status.stripe.healthy) issues.push("Stripe API unreachable");

  if (issues.length === 0) return null;

  return (
    <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
      <div className="flex items-start gap-3">
        <svg className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
        <div>
          <p className="text-sm font-medium text-amber-400">Integration issues detected</p>
          <ul className="mt-1 space-y-0.5">
            {issues.map((issue, i) => (
              <li key={i} className="text-xs text-amber-400/70">{issue}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function IntegrationsHub() {
  const [status, setStatus] = useState<AllStatus | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchStatus() {
    try {
      const res = await fetch("/api/admin/integrations/status");
      if (res.ok) setStatus(await res.json());
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchStatus(); }, []);

  const COMING_SOON = [
    { name: "Zoom", letter: "Z", description: "Video conferencing for client calls and team meetings." },
    { name: "Slack", letter: "S", description: "Team notifications, alerts, and workflow automation." },
    { name: "QuickBooks", letter: "Q", description: "Accounting sync — invoices, expenses, and reporting." },
    { name: "DocuSign", letter: "D", description: "Enterprise-grade e-signature for high-value contracts." },
    { name: "Zapier", letter: "Z", description: "No-code automation to connect with 5,000+ apps." },
    { name: "Twilio", letter: "T", description: "SMS notifications, reminders, and two-way messaging." },
  ];

  return (
    <div className="space-y-8">
      {/* Health banner */}
      {status && <HealthBanner status={status} />}

      {/* Active integrations */}
      <section>
        <h2 className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-4">Connected Services</h2>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-white/3 border border-white/8 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {status && (
              <>
                <GoogleCard status={status.google} onRefresh={fetchStatus} />
                <StripeCard status={status.stripe} />
              </>
            )}
            <ResendCard />
          </div>
        )}
      </section>

      {/* Coming soon */}
      <section>
        <h2 className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-4">On the Roadmap</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {COMING_SOON.map((svc) => (
            <ComingSoonCard key={svc.name} {...svc} />
          ))}
        </div>
      </section>
    </div>
  );
}
