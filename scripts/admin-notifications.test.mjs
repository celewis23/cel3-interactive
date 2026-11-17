import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";

const source = readFileSync("public/admin-notifications-sw.js", "utf8");
function worker(notifications = []) {
  const listeners = {};
  const opened = [];
  const windows = [];
  const self = {
    location: { origin: "https://cel3interactive.com" },
    addEventListener: (name, callback) => { listeners[name] = callback; },
    registration: {
      async getNotifications() { return [...notifications]; },
      async showNotification(title, options) {
        const old = notifications.findIndex(item => item.tag === options.tag);
        if (old !== -1) notifications.splice(old, 1);
        const notification = { title, ...structuredClone(options), close() {
          const index = notifications.indexOf(notification);
          if (index !== -1) notifications.splice(index, 1);
        } };
        notifications.push(notification);
      },
    },
    clients: { async matchAll() { return windows; }, async openWindow(url) { opened.push(url); } },
  };
  vm.runInNewContext(source, { self, URL, Date, Promise });
  async function dispatch(name, details) {
    const tasks = [];
    listeners[name]({ ...details, waitUntil: task => tasks.push(task) });
    await Promise.all(tasks);
  }
  return { notifications, opened, windows, dispatch, push: payload => dispatch("push", { data: { json: () => payload } }) };
}
const email = id => ({ title: `Email ${id}`, body: "A new email", tag: `email:${id}`, href: `/admin/email/thread/${id}` });
const message = id => ({ title: `Client ${id}`, body: "A new message", tag: `message:${id}`, href: `/admin/messages/${id}` });

test("four emails and two client messages become two groups even when delivered together", async () => {
  const w = worker();
  await Promise.all([1, 2, 3, 4].map(id => w.push(email(id))).concat([w.push(message(1)), w.push(message(2))]));
  assert.equal(w.notifications.length, 2);
  assert.deepEqual(w.notifications.map(item => item.title).sort(), ["2 new messages", "4 new emails"]);
  assert.equal(w.notifications.find(item => item.tag === "cel3:group:email").data.url, "/admin/notifications?kind=email");
  assert.equal(w.notifications.find(item => item.tag === "cel3:group:message").data.entries.length, 2);
});
test("single alert opens its exact item; retry does not increment count; worker restart retains group", async () => {
  const w = worker();
  await w.push(email(1));
  assert.equal(w.notifications[0].data.url, "https://cel3interactive.com/admin/email/thread/1");
  await w.push(email(1));
  assert.equal(w.notifications[0].data.entries.length, 1);
  const restarted = worker(w.notifications);
  await restarted.push(email(2));
  assert.equal(restarted.notifications[0].title, "2 new emails");
  await restarted.dispatch("notificationclick", { notification: restarted.notifications[0] });
  assert.deepEqual(restarted.opened, ["https://cel3interactive.com/admin/notifications?kind=email"]);
  await restarted.push(email(3));
  assert.equal(restarted.notifications[0].data.entries.length, 1);
});
test("requests are separate; old individual alerts migrate into their category", async () => {
  const w = worker();
  await w.push(email(1));
  // Simulate an alert from the previous worker version.
  w.notifications.push({ tag: "email:old", title: "Older email", body: "", data: { url: "/admin/email/thread/old" }, close() { w.notifications.splice(w.notifications.indexOf(this), 1); } });
  await w.push(email(2));
  await w.push({ title: "Client request", tag: "client-request:1", href: "/admin/portal-requests?requestId=1" });
  await w.push({ title: "Client request", tag: "client-request:2", href: "/admin/portal-requests?requestId=2" });
  assert.equal(w.notifications.length, 2);
  assert.equal(w.notifications[0].title, "3 new emails");
  assert.equal(w.notifications[1].data.url, "/admin/notifications?kind=client_request");
});
test("foreground alerts use same grouping; foreign messages ignored; click avoids portal tabs", async () => {
  const w = worker();
  await w.push(message(1));
  await w.dispatch("message", { source: { url: "https://cel3interactive.com/admin" }, data: { type: "ADMIN_NOTIFICATION", payload: message(2) } });
  await w.dispatch("message", { source: { url: "https://example.com" }, data: { type: "ADMIN_NOTIFICATION", payload: email(1) } });
  assert.equal(w.notifications.length, 1);
  assert.equal(w.notifications[0].title, "2 new messages");
  let navigated;
  let focused = false;
  w.windows.push({ url: "https://cel3interactive.com/portal", navigate() { throw new Error("Should not navigate a portal tab"); } });
  w.windows.push({ url: "https://cel3interactive.com/admin", async navigate(url) { navigated = url; return { focus() { focused = true; } }; } });
  await w.dispatch("notificationclick", { notification: w.notifications[0] });
  assert.equal(navigated, "https://cel3interactive.com/admin/notifications?kind=message");
  assert.equal(focused, true);
});
test("notification links cannot navigate outside the admin application", async () => {
  const w = worker();
  await w.push({ title: "Unknown", href: "https://example.com/steal" });
  await w.dispatch("notificationclick", { notification: w.notifications[0] });
  assert.deepEqual(w.opened, ["https://cel3interactive.com/admin"]);
});
