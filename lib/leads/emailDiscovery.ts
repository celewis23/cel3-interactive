// Discovers public contact emails for a lead by crawling its website:
// the homepage, the known contact URL, and common contact/about paths.
// Google Places never returns emails, so the business site is the source
// of truth. Returns addresses ranked best-first (hello@/info@/contact@
// style inboxes before role-specific ones), capped at MAX_EMAILS.

const MAX_EMAILS = 5;
const MAX_PAGES = 6;
const FETCH_TIMEOUT_MS = 8000;
const MAX_HTML_BYTES = 600_000;

const COMMON_CONTACT_PATHS = ["contact", "contact-us", "about", "about-us", "connect"];

const EMAIL_RE = /[A-Z0-9][A-Z0-9._%+-]{0,63}@[A-Z0-9][A-Z0-9.-]{0,254}\.[A-Z]{2,24}/gi;

// Asset filenames and framework/tracker artifacts that match the email regex
const ASSET_TAIL_RE = /\.(png|jpe?g|gif|svg|webp|avif|css|js|mjs|json|pdf|ico|woff2?|ttf|mp4|webm)$/i;
const JUNK_DOMAIN_RE =
  /(^|\.)(example\.(com|org|net)|sentry\.io|sentry\.wixpress\.com|wixpress\.com|sentry-next\.wixpress\.com|yourdomain|domain\.com$|email\.com$|mysite\.com$|godaddy\.com$|placeholder)/i;
const JUNK_LOCAL_RE = /^(no-?reply|do-?not-?reply|mailer-daemon|postmaster|abuse|spam|test|user|name|email|someone|username|firstname|lastname|example|filler|website)$/i;

// Shared-inbox prefixes, best first. Unmatched (personal-looking) addresses
// rank between these and the deprioritized role inboxes.
const PREFERRED_PREFIXES = [
  "hello", "info", "contact", "hi", "office", "team", "welcome",
  "events", "booking", "bookings", "frontdesk", "admin", "inquiries", "inquiry",
];
const DEPRIORITIZED_PREFIXES = [
  "careers", "jobs", "press", "media", "marketing", "privacy", "legal",
  "billing", "accounting", "support", "webmaster", "volunteer", "donations",
];

function cleanEmail(raw: string): string | null {
  const email = raw
    .trim()
    .toLowerCase()
    .replace(/^[^a-z0-9]+/, "")
    .replace(/[.,;:!?)\]]+$/, "");
  const match = email.match(EMAIL_RE);
  if (!match || match[0] !== email) return null;

  const [local, domain] = email.split("@");
  if (!local || !domain) return null;
  if (ASSET_TAIL_RE.test(email)) return null;
  if (JUNK_DOMAIN_RE.test(domain)) return null;
  if (JUNK_LOCAL_RE.test(local)) return null;
  return email;
}

function extractEmails(html: string): string[] {
  const found = new Set<string>();

  // mailto: links first — the strongest signal, sometimes URL-encoded
  for (const m of html.matchAll(/mailto:([^"'?\s<>]+)/gi)) {
    let value = m[1];
    try {
      value = decodeURIComponent(value);
    } catch {
      // keep raw value
    }
    const email = cleanEmail(value);
    if (email) found.add(email);
  }

  for (const m of html.matchAll(EMAIL_RE)) {
    const email = cleanEmail(m[0]);
    if (email) found.add(email);
  }

  return [...found];
}

function rankEmails(emails: string[]): string[] {
  const score = (email: string) => {
    const local = email.split("@")[0];
    const preferred = PREFERRED_PREFIXES.indexOf(local);
    if (preferred !== -1) return preferred;
    if (DEPRIORITIZED_PREFIXES.includes(local)) return 1000;
    return 100; // personal-looking addresses in the middle
  };
  return [...emails].sort((a, b) => score(a) - score(b) || a.localeCompare(b));
}

async function fetchHtml(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType && !contentType.includes("text/html")) return null;
    const text = await res.text();
    return text.slice(0, MAX_HTML_BYTES);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function discoverLeadEmails(opts: {
  website?: string | null;
  contactUrl?: string | null;
}): Promise<string[]> {
  const urls: string[] = [];
  const push = (value?: string | null) => {
    if (!value) return;
    try {
      const url = new URL(value.trim());
      if (url.protocol === "http:" || url.protocol === "https:") urls.push(url.toString());
    } catch {
      // ignore malformed URLs
    }
  };

  push(opts.contactUrl);
  push(opts.website);
  if (opts.website) {
    try {
      const base = new URL(opts.website.trim());
      for (const path of COMMON_CONTACT_PATHS) {
        push(new URL(`/${path}`, base.origin).toString());
      }
    } catch {
      // ignore malformed website URL
    }
  }

  // Collect from every page before ranking — stopping at the first few
  // addresses found would keep staff-directory entries over a generic
  // shared inbox that appears later in the page.
  const visited = new Set<string>();
  const emails = new Set<string>();
  let pagesFetched = 0;

  for (const url of urls) {
    if (pagesFetched >= MAX_PAGES) break;
    const key = url.replace(/\/+$/, "").toLowerCase();
    if (visited.has(key)) continue;
    visited.add(key);

    const html = await fetchHtml(url);
    if (html === null) continue;
    pagesFetched++;

    for (const email of extractEmails(html)) emails.add(email);
  }

  return rankEmails([...emails]).slice(0, MAX_EMAILS);
}
