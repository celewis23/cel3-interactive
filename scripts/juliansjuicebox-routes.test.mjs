import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { runInThisContext } from "node:vm";
import ts from "typescript";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const PUBLIC = path.join(ROOT, "public");

function transpile(file) {
  const source = readFileSync(path.join(ROOT, file), "utf8");
  return ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
}

function loadNextConfig() {
  const loaded = { exports: {} };
  const load = (name) => {
    if (name === "next") return {};
    throw new Error(`Unexpected dependency: ${name}`);
  };
  runInThisContext(`(function(require, module, exports) { ${transpile("next.config.ts")}\n})`, { filename: "next.config.ts" })(
    load, loaded, loaded.exports,
  );
  return loaded.exports.default;
}

test("every juliansjuicebox rewrite destination exists on disk", async () => {
  const config = loadNextConfig();
  const rewrites = await config.rewrites();
  const juiceboxRewrites = rewrites.filter((r) => r.source.startsWith("/mockups/juliansjuicebox"));

  // 25 original clean routes, plus 38 new owner/customer-app screens x 3 designs = 139.
  assert.equal(juiceboxRewrites.length, 25 + 38 * 3, "expected one rewrite per clean route");

  for (const rewrite of juiceboxRewrites) {
    const relative = rewrite.destination.replace(/^\/mockups\//, "");
    const filePath = path.join(PUBLIC, "mockups", relative);
    assert.ok(existsSync(filePath), `${rewrite.source} -> ${rewrite.destination} (missing: ${filePath})`);
  }
});

test("every clean route destination has the preview chrome + base href injected", async () => {
  const config = loadNextConfig();
  const rewrites = await config.rewrites();
  const juiceboxRewrites = rewrites.filter((r) => r.source.startsWith("/mockups/juliansjuicebox"));

  for (const rewrite of juiceboxRewrites) {
    const relative = rewrite.destination.replace(/^\/mockups\//, "");
    const html = readFileSync(path.join(PUBLIC, "mockups", relative), "utf8");
    assert.match(html, /<base href="\/mockups\/juliansjuicebox\//, `${rewrite.destination} is missing <base href>`);
  }
});

test("the X-Robots-Tag header covers the juliansjuicebox path", async () => {
  const config = loadNextConfig();
  const headers = await config.headers();
  const match = headers.find((h) => h.source === "/mockups/juliansjuicebox/:path*");
  assert.ok(match, "expected a noindex header entry for /mockups/juliansjuicebox/:path*");
  assert.ok(match.headers.some((h) => h.key === "X-Robots-Tag" && /noindex/.test(h.value)));
});

// ─── cart-state.js: sessionStorage round-trip ──────────────────────────────

function makeSessionStorage() {
  const store = new Map();
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
}

function loadCartState() {
  const source = readFileSync(path.join(PUBLIC, "mockups/juliansjuicebox/cart-state.js"), "utf8");
  const fakeDocument = {
    querySelectorAll: () => [],
    documentElement: {},
  };
  const fakeWindow = { sessionStorage: makeSessionStorage() };
  const context = {
    window: fakeWindow,
    document: fakeDocument,
    MutationObserver: class { observe() {} disconnect() {} },
  };
  runInThisContext(`(function(window, document, MutationObserver) { ${source}\n})`, { filename: "cart-state.js" })(
    context.window, context.document, context.MutationObserver,
  );
  return fakeWindow.JuiceboxCart;
}

test("cart-state.js persists and counts cart items per design", () => {
  const cart = loadCartState();
  assert.deepEqual(cart.load("a"), {});
  cart.save("a", { apple: 2, beauty: 1 });
  assert.deepEqual(cart.load("a"), { apple: 2, beauty: 1 });
  assert.equal(cart.count("a"), 3);
  // Designs don't share a cart.
  assert.deepEqual(cart.load("b"), {});
  assert.equal(cart.count("b"), 0);
});
