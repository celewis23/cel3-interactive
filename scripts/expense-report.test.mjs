import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import ts from "typescript";
import { DateTime, Settings } from "luxon";
import { createDocumentStore } from "../lib/documents/store.mjs";
const require = createRequire(import.meta.url);

function route(documents, session = { isOwner: true }, denied = false) {
  const source = ts.transpileModule(readFileSync("app/api/admin/expenses/report/route.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const store = createDocumentStore(async () => documents.map(document => ({ document })));
  const exports = {};
  new Function("require", "exports", source)(name => {
    if (name === "@/lib/sanityServer") return { sanityServer: store };
    if (name === "@/lib/admin/permissions") return { requirePermission: async () => denied ? Response.json({}, { status: 403 }) : null, getSessionInfo: () => session };
    if (name === "next/server") return { NextResponse: Response };
    return require(name);
  }, exports);
  return exports.GET;
}

test("expense report returns numeric category totals, refunds and uncategorized spending", async () => {
  const original = Settings.now;
  Settings.now = () => Date.parse("2026-11-17T12:00:00Z");
  try {
    const expense = (date, amountCents, categoryId, staffId = "staff-a") => ({ _type: "expense", date, amountCents, categoryId, staffId });
    const docs = [expense("2026-01-02", 100, "hosting"), expense("2026-10-03", 200, "hosting"), expense("2026-11-04", 300, null), expense("2026-11-05", -50, "hosting"), expense("2025-01-01", 999, "old"), expense("2026-12-01", 999, "future"), expense("2026-11-06", 400, "hosting", "staff-b")];
    const report = await (await route(docs)({})).json();
    assert.equal(report.monthTotalCents, 650);
    assert.equal(report.quarterTotalCents, 850);
    assert.equal(report.yearTotalCents, 950);
    assert.deepEqual(report.categoryBreakdown, [{ categoryId: "hosting", totalCents: 650, count: 4 }, { categoryId: "uncategorized", totalCents: 300, count: 1 }]);
    const staff = await (await route(docs, { isOwner: false, staffId: "staff-a" })({})).json();
    assert.equal(staff.yearTotalCents, 550);
    assert.equal((await route(docs, { isOwner: false })({})).status, 401);
    assert.equal((await route(docs, null, true)({})).status, 403);
  } finally { Settings.now = original; }
});

test("empty report stays renderable and reporting periods use New York time", async () => {
  const original = Settings.now;
  Settings.now = () => Date.parse("2027-01-01T02:00:00Z");
  try {
    assert.equal(DateTime.now().setZone("America/New_York").year, 2026);
    const report = await (await route([])({})).json();
    assert.equal(report.period.year, 2026);
    assert.equal(report.yearTotalCents, 0);
    assert.deepEqual(report.categoryBreakdown, []);
  } finally { Settings.now = original; }
});

test("report tab contains null category responses and network failures instead of crashing", async t => {
  const { renderToStaticMarkup } = require("react-dom/server");
  const source = ts.transpileModule(readFileSync("components/admin/expenses/ExpenseReport.tsx", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  for (const failure of ["null-categories", "network"]) {
    const states = []; let cursor = 0, mounted = false;
    const exports = {};
    new Function("require", "exports", source)(name => name === "react" ? {
      useState: initial => { const index = cursor++; if (!(index in states)) states[index] = initial; return [states[index], value => { states[index] = value; }]; },
      useEffect: effect => { if (!mounted) { mounted = true; effect(); } },
    } : require(name), exports);
    t.mock.method(globalThis, "fetch", async () => {
      if (failure === "network") throw new Error("Network unavailable");
      return Response.json({ period: { year: 2026, month: 11, quarter: 4 }, categoryBreakdown: null });
    });
    exports.default({ categories: [] });
    await new Promise(resolve => setImmediate(resolve));
    cursor = 0;
    const html = renderToStaticMarkup(exports.default({ categories: [] }));
    assert.match(html, /role="alert"/);
    assert.doesNotMatch(html, /Loading report/);
    t.mock.restoreAll();
  }
});
