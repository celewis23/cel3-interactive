import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import ts from "typescript";
import { createDocumentStore } from "../lib/documents/store.mjs";

const require = createRequire(import.meta.url);
function service(documents) {
  const store = createDocumentStore(async () => documents.map(document => ({ document })));
  const source = ts.transpileModule(readFileSync("lib/lead-intelligence/service.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  new Function("require", "exports", source)(name => {
    if (name === "crypto") return require(name);
    if (name === "@/lib/sanityServer") return { sanityServer: store };
    return {};
  }, exports);
  return exports;
}

test("Lead Intelligence lists execute through the current document store with bounded limits", async () => {
  const api = service([
    { _id: "s1", _type: "leadIntelligenceSearch", _createdAt: "2026-01-01" },
    { _id: "s2", _type: "leadIntelligenceSearch", _createdAt: "2026-02-01" },
    { _id: "run", _type: "leadIntelligenceSearchRun" },
    { _id: "r1", _type: "leadIntelligenceSearchResult", runId: "a", score: { leadScore: 10 } },
    { _id: "r2", _type: "leadIntelligenceSearchResult", runId: "b", score: { leadScore: 90 } },
  ]);
  assert.deepEqual((await api.listLeadIntelligenceSearches(1)).map(row => row._id), ["s2"]);
  assert.equal((await api.listLeadIntelligenceRuns()).length, 1);
  assert.deepEqual((await api.listLeadIntelligenceResults(undefined, 1)).map(row => row._id), ["r2"]);
  assert.deepEqual((await api.listLeadIntelligenceResults("a", 50)).map(row => row._id), ["r1"]);
  for (const limit of [0, -1, 1.5, NaN, 1001, "1] | *[]"]) {
    await assert.rejects(api.listLeadIntelligenceSearches(limit), /query limit/);
    await assert.rejects(api.listLeadIntelligenceRuns(limit), /query limit/);
    await assert.rejects(api.listLeadIntelligenceResults(undefined, limit), /query limit/);
  }
});

test("Lead Intelligence opens with no saved searches or results", async () => {
  const api = service([]);
  assert.deepEqual(await api.listLeadIntelligenceSearches(20), []);
  assert.deepEqual(await api.listLeadIntelligenceResults(undefined, 50), []);
});
