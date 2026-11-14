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

const config = loadModule("lib/mockups/juliansjuicebox/config.ts");
const { generateJuiceboxProposalPdf } = loadModule(
  "lib/mockups/juliansjuicebox/proposalPdf.ts",
  { "./config": config },
);

const base = {
  contractNumber: "CON-2026-001",
  businessName: "Julian's Juicebox LLC",
  contactName: "Julian Ramirez",
  email: "julian@juliansjuicebox.test",
  signerName: "Julian Ramirez",
  signedAt: "2026-11-14T18:00:00.000Z",
  ip: "203.0.113.5",
  priceHash: "abc123",
};

for (const selectionId of ["special-offer", "tier1", "tier2", "tier3"]) {
  test(`generates a well-formed PDF for ${selectionId}`, () => {
    const pdf = generateJuiceboxProposalPdf({
      ...base, selectionId, dueTodayCents: 123_400, monthlyCents: 8_000,
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
