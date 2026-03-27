self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  const payload = event.data ? event.data.json() : {};
  const title = payload.title || "CEL3 Backoffice";
  const options = {
    body: payload.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: {
      url: payload.href || "/admin",
    },
    tag: payload.tag || undefined,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/admin";
  const fullUrl = new URL(targetUrl, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Try to find an existing admin tab and navigate it to the right route
      for (const client of clientList) {
        if (client.url.includes(self.location.origin)) {
          return client.navigate(fullUrl).then((c) => c && c.focus());
        }
      }
      // No existing tab — open a new one
      return self.clients.openWindow(fullUrl);
    })
  );
});
