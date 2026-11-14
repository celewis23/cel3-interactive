import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runInThisContext } from "node:vm";
import ts from "typescript";

// Exercises the real pricing module (no mocks needed — config.ts and pricing.ts have
// no external dependencies) to lock in the numbers from the Julian's Juicebox proposal export.
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
const { quoteJuiceboxSelection, JuiceboxPricingError } = loadModule(
  "lib/mockups/juliansjuicebox/pricing.ts",
  { "./config": config },
);

test("special offer: $2,000 due today, $125/month", () => {
  const quote = quoteJuiceboxSelection("special-offer");
  assert.equal(quote.dueTodayCents, 200_000);
  assert.equal(quote.monthlyCents, 12_500);
});

test("tier 1: $1,500 due today, $75/month", () => {
  const quote = quoteJuiceboxSelection("tier1");
  assert.equal(quote.dueTodayCents, 150_000);
  assert.equal(quote.monthlyCents, 7_500);
});

test("tier 2: $2,500 due today, $100/month", () => {
  const quote = quoteJuiceboxSelection("tier2");
  assert.equal(quote.dueTodayCents, 250_000);
  assert.equal(quote.monthlyCents, 10_000);
});

test("tier 3: $4,000 due today, $150/month", () => {
  const quote = quoteJuiceboxSelection("tier3");
  assert.equal(quote.dueTodayCents, 400_000);
  assert.equal(quote.monthlyCents, 15_000);
});

test("rejects an unknown selection id", () => {
  assert.throws(() => quoteJuiceboxSelection("tier4"), JuiceboxPricingError);
  assert.throws(() => quoteJuiceboxSelection(undefined), JuiceboxPricingError);
});

test("line item names identify what was bought", () => {
  assert.match(quoteJuiceboxSelection("tier1").lineItemName, /Tier 1/);
  assert.match(quoteJuiceboxSelection("special-offer").lineItemName, /Special offer/);
});
