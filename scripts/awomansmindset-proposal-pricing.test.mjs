import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runInThisContext } from "node:vm";
import ts from "typescript";

// Exercises the real pricing module (no mocks needed — config.ts and pricing.ts have
// no external dependencies) to lock in the numbers from the A Woman's Mindset proposal export.
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
const { quoteAwmSelection, AwmPricingError } = loadModule(
  "lib/mockups/awomansmindset/pricing.ts",
  { "./config": config },
);

test("special offer: $2,000 due today, $125/month", () => {
  const quote = quoteAwmSelection("special-offer");
  assert.equal(quote.dueTodayCents, 200_000);
  assert.equal(quote.monthlyCents, 12_500);
  assert.equal(quote.oneTimeOnly, false);
});

test("tier 1: $1,500 due today, $75/month", () => {
  const quote = quoteAwmSelection("tier1");
  assert.equal(quote.dueTodayCents, 150_000);
  assert.equal(quote.monthlyCents, 7_500);
});

test("tier 2: $2,500 due today, $100/month", () => {
  const quote = quoteAwmSelection("tier2");
  assert.equal(quote.dueTodayCents, 250_000);
  assert.equal(quote.monthlyCents, 10_000);
});

test("tier 3: $3,500 due today, $150/month", () => {
  const quote = quoteAwmSelection("tier3");
  assert.equal(quote.dueTodayCents, 350_000);
  assert.equal(quote.monthlyCents, 15_000);
});

test("design-only code handoff: $1,200 due today, no monthly fee", () => {
  const quote = quoteAwmSelection("code");
  assert.equal(quote.dueTodayCents, 120_000);
  assert.equal(quote.monthlyCents, 0);
  assert.equal(quote.oneTimeOnly, true);
});

test("rejects an unknown selection id", () => {
  assert.throws(() => quoteAwmSelection("tier4"), AwmPricingError);
  assert.throws(() => quoteAwmSelection(undefined), AwmPricingError);
});

test("line item names identify what was bought", () => {
  assert.match(quoteAwmSelection("tier1").lineItemName, /Tier 1/);
  assert.match(quoteAwmSelection("special-offer").lineItemName, /Special offer/);
  assert.match(quoteAwmSelection("code").lineItemName, /Design only/);
});
