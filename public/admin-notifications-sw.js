let notificationQueue = Promise.resolve();
const notificationGroups = {
  email: "emails", message: "messages", client_request: "client requests",
  form_submission: "form submissions", lead: "leads", booking: "bookings", announcement: "announcements",
};
function notificationKind(payload) {
  if (notificationGroups[payload.kind]) return payload.kind;
  const prefix = (payload.tag || "").split(":")[0];
  return ({ email: "email", message: "message", "client-request": "client_request", client_request: "client_request", form: "form_submission", lead: "lead", booking: "booking", announcement: "announcement" })[prefix];
}
function adminUrl(value) {
  const url = new URL(value || "/admin", self.location.origin);
  return url.origin === self.location.origin && /^\/admin(?:\/|$)/.test(url.pathname) ? url.href : new URL("/admin", self.location.origin).href;
}
async function displayNotification(payload) {
  const kind = notificationKind(payload);
  const tag = kind ? `cel3:group:${kind}` : payload.tag;
  const current = kind ? (await self.registration.getNotifications()).filter(item =>
    item.tag === tag || notificationKind({ tag: item.tag }) === kind
  ) : [];
  const entries = current.flatMap(item => item.data?.entries || [{
    key: item.tag, title: item.title, body: item.body, href: adminUrl(item.data?.url), timestamp: Date.now(),
  }]);
  const entry = { key: payload.tag || payload.key || payload.href, title: payload.title || "CEL3 Backoffice", body: payload.body || "", href: adminUrl(payload.href), timestamp: Date.now() };
  const existing = entries.findIndex(item => item.key === entry.key);
  if (existing !== -1) entries.splice(existing, 1);
  entries.push(entry);
  // Retain previews in the notification itself, across worker restarts.
  const items = entries.slice(-100);
  const grouped = kind && items.length > 1;
  const title = grouped ? `${items.length} new ${notificationGroups[kind]}` : entry.title;
  const body = grouped ? items.slice(-3).reverse().map(item => `${item.title}${item.body ? ` — ${item.body}` : ""}`).join("\n") : entry.body;
  await self.registration.showNotification(title, {
    body, icon: "/icon-192.png", badge: "/icon-192.png", tag,
    renotify: !!tag && existing === -1,
    requireInteraction: payload.requireInteraction === true,
    data: { entries: items, kind, url: grouped ? `/admin/notifications?kind=${kind}` : entry.href },
  });
  current.filter(item => item.tag !== tag).forEach(item => item.close());
}
function enqueueNotification(payload) {
  // Pushes and foreground polling can arrive together. Serialize read/replace.
  const work = notificationQueue.then(() => displayNotification(payload));
  notificationQueue = work.catch(() => {});
  return work;
}
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", event => event.waitUntil(self.clients.claim()));
self.addEventListener("push", event => {
  let payload;
  try { payload = event.data ? event.data.json() : {}; } catch { payload = {}; }
  event.waitUntil(enqueueNotification(payload));
});
self.addEventListener("message", event => {
  if (event.data?.type !== "ADMIN_NOTIFICATION" || !event.source?.url || new URL(event.source.url).origin !== self.location.origin) return;
  event.waitUntil(enqueueNotification(event.data.payload));
});
self.addEventListener("notificationclick", event => {
  event.notification.close();
  const fullUrl = adminUrl(event.notification.data?.url);
  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const client = clients.find(item => new URL(item.url).origin === self.location.origin && /^\/admin(?:\/|$)/.test(new URL(item.url).pathname));
    if (client) {
      const navigated = await client.navigate(fullUrl);
      if (navigated) return navigated.focus();
    }
    return self.clients.openWindow(fullUrl);
  })());
});
