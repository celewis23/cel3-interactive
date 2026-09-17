import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import { runInThisContext } from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);

// Run the real TypeScript modules with Google/auth replaced, without loading
// credentials or sending email. No additional test dependencies are needed.
function loadModule(path, dependencies) {
  const source = readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const loadedModule = { exports: {} };
  const load = (name) => {
    if (name === "@/lib/audit/withActivity") return { withActivity: (_route, _method, handler) => handler };
    if (Object.hasOwn(dependencies, name)) return dependencies[name];
    if (name === "luxon" || name === "next/server") return require(name);
    throw new Error(`Unexpected dependency: ${name}`);
  };
  runInThisContext(`(function(require, module, exports) { ${outputText}\n})`, { filename: path })(load, loadedModule, loadedModule.exports);
  return loadedModule.exports;
}

function fixture(overrides = {}, options = {}) {
  const saved = {
    id: "meeting-123",
    etag: '"version-7"',
    sequence: 7,
    summary: "Planning meeting",
    status: "confirmed",
    organizer: { self: true, email: "owner@example.com" },
    start: { dateTime: "2026-10-01T14:00:00Z" },
    end: { dateTime: "2026-10-01T15:00:00Z" },
    attendees: [
      { email: "owner@example.com", organizer: true, responseStatus: "accepted" },
      { email: "guest@example.com", responseStatus: "tentative" },
    ],
    conferenceData: { entryPoints: [{ uri: "https://meet.google.com/example" }] },
    extendedProperties: { private: { existingKey: "keep" }, shared: { sharedKey: "keep" } },
    ...overrides,
  };
  const calls = { get: [], patch: [], permissions: [] };
  const calendar = loadModule("lib/google/calendar.ts", {
    "@/lib/gmail/client": {
      getAuthenticatedClient: async () => options.disconnected ? null : { oauth2Client: {}, email: "owner@example.com" },
    },
    googleapis: {
      google: { calendar: () => ({ events: {
        get: async (params) => {
          calls.get.push(params);
          return { data: structuredClone(saved) };
        },
        patch: async (params, requestOptions) => {
          calls.patch.push({ params, requestOptions });
          if (options.patchError) throw options.patchError;
          Object.assign(saved, {
            sequence: params.requestBody.sequence,
            extendedProperties: { ...saved.extendedProperties, ...params.requestBody.extendedProperties },
          });
          return { data: structuredClone(saved) };
        },
      } }) },
    },
  });
  const route = loadModule("app/api/admin/calendar/events/[id]/invite/route.ts", {
    "@/lib/google/calendar": calendar,
    "@/lib/admin/permissions": {
      requirePermission: async (_req, module, action) => {
        calls.permissions.push({ module, action });
        return options.denied ? Response.json({ error: "Forbidden" }, { status: 403 }) : null;
      },
    },
  });
  return { saved, calls, calendar, route };
}

test("sending invites notifies every guest and preserves meeting details and RSVPs", async () => {
  const { calendar, calls, saved } = fixture();
  const original = structuredClone(saved);
  const result = await calendar.sendEventInvites("team@example.com", saved.id);

  assert.deepEqual(calls.get, [{ calendarId: "team@example.com", eventId: saved.id }]);
  assert.equal(calls.patch.length, 1);
  const { params, requestOptions } = calls.patch[0];
  assert.equal(params.sendUpdates, "all");
  assert.equal(params.calendarId, "team@example.com");
  assert.equal(params.eventId, saved.id);
  assert.equal(params.requestBody.sequence, 8);
  assert.deepEqual(Object.keys(params.requestBody).sort(), ["extendedProperties", "sequence"]);
  assert.deepEqual(requestOptions, { headers: { "If-Match": original.etag }, retry: false });
  for (const field of ["summary", "start", "end", "attendees", "conferenceData"]) {
    assert.deepEqual(saved[field], original[field]);
  }
  assert.equal(saved.extendedProperties.private.existingKey, "keep");
  assert.equal(saved.extendedProperties.shared.sharedKey, "keep");
  assert.ok(Number.isFinite(Date.parse(result.invitesSentAt)));
  assert.equal(result.canSendInvites, true);
  assert.equal(result.calendarId, "team@example.com");
  assert.equal(result.attendees[1].responseStatus, "tentative");
});

for (const [name, event, options, status] of [
  ["disconnected Google account", {}, { disconnected: true }, 409],
  ["cancelled event", { status: "cancelled" }, {}, 409],
  ["someone else's event", { organizer: { self: false } }, {}, 403],
  ["event without an organizer", { organizer: undefined }, {}, 403],
  ["event without guests", { attendees: [] }, {}, 400],
  ["organizer as the only attendee", { attendees: [{ email: "owner@example.com", organizer: true }] }, {}, 400],
  ["unversioned event", { etag: undefined }, {}, 409],
]) {
  test(`rejects ${name} without sending an email`, async () => {
    const { calendar, calls } = fixture(event, options);
    await assert.rejects(calendar.sendEventInvites("primary", "meeting-123"), (err) => err.status === status);
    assert.equal(calls.patch.length, 0);
  });
}

test("immediate duplicate sends are rejected", async () => {
  const { calendar, calls } = fixture();
  await calendar.sendEventInvites("primary", "meeting-123");
  await assert.rejects(calendar.sendEventInvites("primary", "meeting-123"), (err) => err.status === 429);
  assert.equal(calls.patch.length, 1);
});

test("older invitations can be resent for an all-day event", async () => {
  const { calendar, saved } = fixture({
    sequence: undefined,
    start: { date: "2026-10-01" },
    end: { date: "2026-10-02" },
    extendedProperties: { private: { cel3InvitesSentAt: "2026-01-01T00:00:00Z" } },
  });
  const result = await calendar.sendEventInvites("primary", "meeting-123");
  assert.equal(saved.sequence, 1);
  assert.equal(result.allDay, true);
  assert.equal(result.end.date, "2026-10-02");
});

function request(calendarId = "primary") {
  return { nextUrl: new URL(`https://example.com/api/admin/calendar/events/meeting-123/invite?calendarId=${encodeURIComponent(calendarId)}`) };
}
const context = { params: Promise.resolve({ id: "meeting-123" }) };

test("API requires calendar edit permission before reading or sending", async () => {
  const { route, calls } = fixture({}, { denied: true });
  assert.equal((await route.POST(request(), context)).status, 403);
  assert.deepEqual(calls.permissions, [{ module: "calendar", action: "edit" }]);
  assert.equal(calls.get.length, 0);
  assert.equal(calls.patch.length, 0);
});

test("API sends invites for the selected calendar and returns the saved status", async () => {
  const { route, calls } = fixture();
  const response = await route.POST(request("team@example.com"), context);
  const result = await response.json();
  assert.equal(response.status, 200);
  assert.ok(result.invitesSentAt);
  assert.equal(calls.patch[0].params.calendarId, "team@example.com");
});

test("API rejects an empty calendar", async () => {
  const { route, calls } = fixture();
  assert.equal((await route.POST(request(" "), context)).status, 400);
  assert.equal(calls.get.length, 0);
});

test("API reports missing attendees", async () => {
  const { route, calls } = fixture({ attendees: [] });
  const response = await route.POST(request(), context);
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /attendee/);
  assert.equal(calls.patch.length, 0);
});

for (const [googleStatus, expected] of [[412, 409], [403, 403], [404, 404], [410, 404]]) {
  test(`API handles Google ${googleStatus} without reporting success or retrying`, async () => {
    const { route, calls, saved } = fixture({}, { patchError: { response: { status: googleStatus } } });
    const response = await route.POST(request(), context);
    assert.equal(response.status, expected);
    assert.ok((await response.json()).error);
    assert.equal(saved.extendedProperties.private.cel3InvitesSentAt, undefined);
    assert.equal(calls.patch.length, 1);
  });
}
