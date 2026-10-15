import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runInNewContext } from "node:vm";

const source = readFileSync(new URL("../public/mockups/ej-piano/device-view.js", import.meta.url), "utf8");
const origin = "https://example.test";
const mobilePath = concept => `/mockups/ej-piano/${concept}/Website ${concept.toUpperCase()} · Mobile-html/Mobile-${concept.toUpperCase()}.dc.html`;

function open({ concept = "a", layout = "desktop", width = 956, height = 440, screenWidth = width, screenHeight = height, touch = true, search = "", hash = "" } = {}) {
  const redirects = [], listeners = {}, queries = new Map();
  const viewport = { content: "width=device-width, initial-scale=1" };
  const links = ["auto", "mobile", "desktop"].map(view => ({
    dataset: { view }, href: "", attributes: {},
    setAttribute(name, value) { this.attributes[name] = value; },
    removeAttribute(name) { delete this.attributes[name]; },
  }));
  runInNewContext(source, {
    window: {
      screen: { width: screenWidth, height: screenHeight },
      matchMedia(query) {
        const media = { matches: query === "(max-width: 767px)" ? width <= 767 : query === "(any-pointer: coarse)" && touch,
          addEventListener(type, callback) { this.changed = callback; } };
        queries.set(query, media); return media;
      },
      addEventListener(type, callback) { listeners[type] = callback; },
    },
    document: {
      currentScript: { dataset: { concept, layout } }, readyState: "complete", body: {},
      querySelector: () => viewport, querySelectorAll: () => links,
    },
    location: { origin, search, hash, replace: href => redirects.push(new URL(href)) },
    MutationObserver: class { observe() {} }, URL, URLSearchParams,
  });
  return { redirects, viewport, links, listeners, queries };
}

for (const concept of ["a", "b", "c"]) {
  test(`${concept}: phones load the mobile piano in either orientation`, () => {
    for (const [width, height] of [[390, 844], [844, 390], [440, 956], [956, 440]]) {
      const result = open({ concept, width, height });
      assert.equal(result.redirects.length, 1, `${width} × ${height}`);
      assert.equal(decodeURI(result.redirects[0].pathname), mobilePath(concept));
    }
  });
  test(`${concept}: a bookmarked mobile piano stays mobile in landscape`, () => {
    assert.equal(open({ concept, layout: "mobile" }).redirects.length, 0);
  });
}

test("phone detection works when screen dimensions stay portrait in landscape", () => {
  const result = open({ width: 956, height: 380, screenWidth: 440, screenHeight: 956 });
  assert.equal(decodeURI(result.redirects[0].pathname), mobilePath("a"));
});

test("ordinary desktop windows and full-size tablets retain the desktop export", () => {
  for (const options of [
    { width: 1440, height: 900, touch: false },
    { width: 956, height: 440, screenWidth: 1920, screenHeight: 1080, touch: false },
    { width: 956, height: 440, screenWidth: 1920, screenHeight: 1080, touch: true },
    { width: 1180, height: 820 },
  ]) assert.equal(open(options).redirects.length, 0);
  assert.equal(open({ width: 600, height: 900, touch: false }).redirects.length, 1);
});

test("redirects preserve query parameters and the selected page section", () => {
  const result = open({ concept: "b", search: "?campaign=trial", hash: "#piano" });
  assert.equal(result.redirects[0].search, "?campaign=trial");
  assert.equal(result.redirects[0].hash, "#piano");
});

test("explicit view selections win and desktop remains zoomable on a sideways phone", () => {
  const desktop = open({ search: "?view=desktop" });
  assert.equal(desktop.redirects.length, 0);
  assert.equal(desktop.viewport.content, "width=1280");
  const mobile = open({ width: 1440, height: 900, touch: false, search: "?view=mobile" });
  assert.equal(mobile.redirects[0].search, "?view=mobile");
  assert.equal(open({ layout: "mobile", width: 1440, height: 900, touch: false, search: "?view=mobile" }).redirects.length, 0);
});

test("Auto links use the phone export and rotating does not reload an active piano", () => {
  const result = open({ layout: "mobile", width: 440, height: 956 });
  assert.equal(decodeURI(new URL(result.links[0].href).pathname), mobilePath("a"));
  assert.equal(result.links[0].attributes["aria-current"], "page");
  const query = result.queries.get("(max-width: 767px)");
  query.matches = false; query.changed(); result.listeners.pageshow();
  assert.equal(result.redirects.length, 0);
  assert.equal(decodeURI(new URL(result.links[0].href).pathname), mobilePath("a"));
});
