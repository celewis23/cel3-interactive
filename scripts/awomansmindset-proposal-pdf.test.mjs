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

const config = loadModule("lib/mockups/awomansmindset/config.ts");
const { generateAwmProposalPdf } = loadModule(
  "lib/mockups/awomansmindset/proposalPdf.ts",
  { "./config": config },
);

const base = {
  contractNumber: "CON-2026-001",
  businessName: "A Woman's Mindset",
  contactName: "Ada Thompson",
  email: "ada@awomansmindset.test",
  signerName: "Ada Thompson",
  signedAt: "2026-11-23T18:00:00.000Z",
  ip: "203.0.113.5",
  priceHash: "abc123",
};

for (const selectionId of ["special-offer", "tier1", "tier2", "tier3", "code"]) {
  test(`generates a well-formed PDF for ${selectionId}`, () => {
    const pdf = generateAwmProposalPdf({
      ...base, selectionId, dueTodayCents: 123_400, monthlyCents: selectionId === "code" ? 0 : 8_000,
    });
    assert.ok(Buffer.isBuffer(pdf));
    const text = pdf.toString("latin1");
    assert.match(text, /^%PDF-1\.4/);
    assert.match(text, /%%EOF$/);
    assert.match(text, /trailer/);
    const kidsMatch = /\/Kids \[([^\]]*)\]/.exec(text);
    assert.ok(kidsMatch && kidsMatch[1].trim().length > 0, "Pages object must list at least one page");
  });
}

test("one-time tier mentions no monthly fee instead of a $0 line", () => {
  const pdf = generateAwmProposalPdf({ ...base, selectionId: "code", dueTodayCents: 120_000, monthlyCents: 0 });
  const text = pdf.toString("latin1");
  assert.match(text, /no monthly fee/i);
});
