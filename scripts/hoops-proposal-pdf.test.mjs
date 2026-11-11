import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runInThisContext } from "node:vm";
import ts from "typescript";

function transpile(path) {
  const source = readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
  return ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
}

function loadModule(path, extraDeps = {}) {
  const loaded = { exports: {} };
  const load = (name) => {
    if (Object.hasOwn(extraDeps, name)) return extraDeps[name];
    throw new Error(`Unexpected dependency: ${name}`);
  };
  runInThisContext(`(function(require, module, exports) { ${transpile(path)}\n})`, { filename: path })(
    load, loaded, loaded.exports,
  );
  return loaded.exports;
}

const config = loadModule("lib/mockups/hoopsbasketballacademy/config.ts");
const { generateHoopsProposalPdf } = loadModule(
  "lib/mockups/hoopsbasketballacademy/proposalPdf.ts",
  { "./config": config },
);

const base = {
  contractNumber: "CON-2026-001",
  businessName: "Hoops Basketball Academy",
  contactName: "Coach Jordan",
  email: "coach@hoopsbasketballacademy.test",
  signerName: "Coach Jordan",
  signedAt: "2026-11-11T18:00:00.000Z",
  ip: "203.0.113.5",
  priceHash: "abc123",
};

for (const selectionId of ["special-offer", "tier1", "tier2", "tier3"]) {
  test(`generates a well-formed PDF for ${selectionId}`, () => {
    const pdf = generateHoopsProposalPdf({
      ...base, selectionId, addOn: selectionId === "special-offer",
      dueTodayCents: 123_400, monthlyCents: 8_000,
    });
    assert.ok(Buffer.isBuffer(pdf));
    const text = pdf.toString("latin1");
    assert.match(text, /^%PDF-1\.4/);
    assert.match(text, /%%EOF$/);
    assert.match(text, /trailer/);
    // Every page object must be reachable from the Pages kids list — a stale "Kids []" would break the whole file.
    const kidsMatch = /\/Kids \[([^\]]*)\]/.exec(text);
    assert.ok(kidsMatch && kidsMatch[1].trim().length > 0, "Pages object must list at least one page");
  });
}
