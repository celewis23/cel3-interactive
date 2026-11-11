import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runInThisContext } from "node:vm";
import ts from "typescript";

// Exercises the real pricing module (no mocks needed — config.ts and pricing.ts have
// no external dependencies) to lock in the numbers from the downloaded proposal PDF.
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
const { quoteHoopsSelection, HoopsPricingError } = loadModule(
  "lib/mockups/hoopsbasketballacademy/pricing.ts",
  { "./config": config },
);

test("special offer: $2,000 due today, $125/month, editor included, add-on not chargeable", () => {
  const quote = quoteHoopsSelection("special-offer", false);
  assert.equal(quote.dueTodayCents, 200_000);
  assert.equal(quote.monthlyCents, 12_500);
  assert.equal(quote.addOn, true);

  const withAddOnRequested = quoteHoopsSelection("special-offer", true);
  assert.equal(withAddOnRequested.dueTodayCents, 200_000, "requesting the add-on again must not double-charge it");
});

test("tier 1: $1,500 due today, $80/month, no add-on available", () => {
  const quote = quoteHoopsSelection("tier1", false);
  assert.equal(quote.dueTodayCents, 150_000);
  assert.equal(quote.monthlyCents, 8_000);
  assert.equal(quote.addOn, false);
  assert.throws(() => quoteHoopsSelection("tier1", true), HoopsPricingError);
});

test("tier 2: $2,500 due today ($3,000 with add-on), $160/month", () => {
  assert.equal(quoteHoopsSelection("tier2", false).dueTodayCents, 250_000);
  const withAddOn = quoteHoopsSelection("tier2", true);
  assert.equal(withAddOn.dueTodayCents, 300_000);
  assert.equal(withAddOn.monthlyCents, 16_000);
  assert.equal(withAddOn.addOn, true);
});

test("tier 3: $3,500 due today ($4,000 with add-on), $200/month", () => {
  assert.equal(quoteHoopsSelection("tier3", false).dueTodayCents, 350_000);
  const withAddOn = quoteHoopsSelection("tier3", true);
  assert.equal(withAddOn.dueTodayCents, 400_000);
  assert.equal(withAddOn.monthlyCents, 20_000);
});

test("rejects an unknown selection id", () => {
  assert.throws(() => quoteHoopsSelection("tier4", false), HoopsPricingError);
  assert.throws(() => quoteHoopsSelection(undefined, false), HoopsPricingError);
});

test("line item names identify what was bought", () => {
  assert.match(quoteHoopsSelection("tier1", false).lineItemName, /Tier 1/);
  assert.match(quoteHoopsSelection("special-offer", false).lineItemName, /Special offer/);
});
