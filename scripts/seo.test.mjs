import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import { runInThisContext } from "node:vm";
import ts from "typescript";
import { parse, evaluate } from "groq-js";

const require = createRequire(import.meta.url);
function load(path, dependencies = {}) {
  const { outputText } = ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const module = { exports: {} };
  runInThisContext(`(function(require,module,exports){${outputText}\n})`, { filename: path })(name => {
    if (Object.hasOwn(dependencies, name)) return dependencies[name];
    if (name === "next/server") return require(name);
    throw new Error(`Unexpected dependency: ${name}`);
  }, module, module.exports);
  return module.exports;
}
const site = load("lib/seo/site.ts");
const schema = load("lib/seo/schema.ts", { "./site": site });
const queries = load("lib/sanity.queries.ts");
const fallbacks = load("lib/workCaseStudies.ts");
const documents = [
  { _id: "live", _type: "project", title: "Live", featured: true, slug: { current: "new-case" }, _updatedAt: "2026-10-01T00:00:00Z" },
  { _id: "drafts.live", _type: "project", title: "Not published", featured: true, slug: { current: "unpublished-case" } },
  { _id: "same-slug", _type: "project", slug: { current: "biobox" }, _updatedAt: "2026-09-01T00:00:00Z" },
  { _id: "other-type", _type: "secret", slug: { current: "not-a-project" } },
];
const fetchDocuments = async (query, params = {}) => (await evaluate(parse(query), { dataset: documents, params })).get();

test("all public templates have unique canonical titles and complete sharing metadata", () => {
  const titles = new Set();
  for (const path of Object.keys(site.publicPages)) {
    const metadata = site.publicPageMetadata(path);
    assert.equal(metadata.alternates.canonical, new URL(path, site.SITE_URL).href);
    assert.equal(metadata.openGraph.url, metadata.alternates.canonical);
    assert.equal(metadata.twitter.card, "summary_large_image");
    assert.ok(metadata.openGraph.images[0].url.startsWith(site.SITE_URL));
    assert.ok(metadata.description.length > 40);
    assert.equal(metadata.title.absolute.split(site.BUSINESS_NAME).length - 1, 1);
    assert.ok(!titles.has(metadata.title.absolute));
    titles.add(metadata.title.absolute);
  }
});

function validateGraph(document) {
  assert.equal(document["@context"], "https://schema.org");
  const ids = new Set(document["@graph"].map(node => node["@id"]));
  assert.equal(ids.size, document["@graph"].length);
  const visit = value => {
    if (!value || typeof value !== "object") return;
    if (value["@id"]) assert.ok(ids.has(value["@id"]), `Unresolved graph reference: ${value["@id"]}`);
    if (value["@type"] === "BreadcrumbList") {
      assert.ok(value.itemListElement.length >= 2);
      value.itemListElement.forEach((item, index) => {
        assert.equal(item.position, index + 1);
        assert.ok(item.name);
        assert.ok(item.item.startsWith(site.SITE_URL));
      });
    }
    Object.values(value).forEach(visit);
  };
  visit(document);
}

test("service, collection and case-study graphs resolve entities and breadcrumb positions", () => {
  for (const path of Object.keys(site.publicPages)) validateGraph(schema.publicPageGraph(path));
  for (const work of Object.values(fallbacks.workCaseStudyFallbacks)) validateGraph(schema.caseStudyGraph(work));
  const audit = schema.publicPageGraph("/assessment")["@graph"].find(node => node["@type"] === "Service");
  assert.equal(audit.offers.price, "150");
  assert.equal(audit.offers.priceCurrency, "USD");
  const business = schema.publicPageGraph("/")["@graph"].find(node => node["@type"] === "Organization");
  assert.equal(business.name, "CEL3 Interactive");
  for (const unconfirmed of ["telephone", "address", "foundingDate", "aggregateRating"]) assert.ok(!(unconfirmed in business));
});

test("CMS titles cannot terminate the JSON-LD script or inject markup", () => {
  const title = '</script><img src=x onerror=alert(1)>\u2028\u2029';
  const graph = schema.caseStudyGraph({ title, slug: "safe", summary: title });
  const serialized = schema.serializeSchema(graph);
  assert.doesNotMatch(serialized, /<|\u2028|\u2029/);
  assert.deepEqual(JSON.parse(serialized), graph);
});

test("sitemap merges CMS and fallback case studies, excludes drafts and uses real update dates", async () => {
  const sitemap = load("app/sitemap.ts", {
    "@/lib/seo/site": site,
    "@/lib/workCaseStudies": fallbacks,
    "@/lib/sanityServer": { sanityServer: { fetch: fetchDocuments } },
  }).default;
  const entries = await sitemap();
  assert.equal(new Set(entries.map(entry => entry.url)).size, entries.length);
  assert.ok(entries.some(entry => entry.url.endsWith("/work/new-case")));
  assert.ok(!entries.some(entry => /unpublished-case|not-a-project|www\./.test(entry.url)));
  assert.equal(entries.find(entry => entry.url.endsWith("/work/biobox")).lastModified.toISOString(), "2026-09-01T00:00:00.000Z");
  assert.ok(!entries.find(entry => entry.url === site.SITE_URL + "/").lastModified);
  for (const path of Object.keys(site.publicPages)) assert.ok(entries.some(entry => entry.url === site.absoluteUrl(path)));
});

test("public project queries cannot expose drafts through listings or direct URLs", async () => {
  for (const name of ["workIndexQuery", "workSlugsQuery", "featuredWorkQuery", "allWorkQuery"]) {
    const rows = await fetchDocuments(queries[name]);
    assert.ok(rows.length);
    assert.ok(rows.every(row => row.slug !== "unpublished-case"));
  }
  assert.equal(await fetchDocuments(queries.workBySlugQuery, { slug: "unpublished-case" }), null);
});

test("robots keeps marketing crawlable and lets bots read noindex on public utility pages", () => {
  const robots = load("app/robots.ts", { "@/lib/seo/site": site }).default();
  const rule = robots.rules[0];
  for (const path of Object.keys(site.publicPages)) {
    assert.ok(!rule.disallow.some(prefix => path === prefix || path.startsWith(prefix + "/")));
  }
  for (const path of ["/mockups", "/downloads", "/site-suspended", "/assessment/success"]) assert.ok(!rule.disallow.includes(path));
  assert.ok(rule.allow.includes("/admin/login"));
  assert.ok(rule.disallow.includes("/api"));
});

test("host redirects are permanent and private route headers exclude utility content", async () => {
  const config = load("next.config.ts").default;
  const redirects = await config.redirects();
  assert.ok(redirects.some(rule => rule.statusCode === 301 && rule.destination === site.SITE_URL + "/:path*"));
  const headers = await config.headers();
  for (const path of ["/mockups/:path*", "/admin/:path*", "/portal/:path*", "/assessment/success"]) {
    assert.ok(headers.find(rule => rule.source === path)?.headers.some(header => header.key === "X-Robots-Tag" && header.value.includes("noindex")));
  }
  assert.ok(!headers.some(rule => rule.source === "/:path*"));
});
