import assert from "node:assert/strict";
import { test } from "node:test";
import { parse, evaluate } from "groq-js";
import { candidateQuery, createDocumentStore, parseDocumentPath } from "../lib/documents/store.mjs";

test("query candidates keep every independent dataset branch", () => {
  const candidate = candidateQuery(parse('{"clients": *[_type == "client"], "invoices": *[_type == "invoice" && _id in $ids]}'), { ids: ["invoice.1"] });
  assert.deepEqual(candidate.params, ["client", "invoice", ["invoice.1"]]);
  assert.match(candidate.query, / OR /);
  assert.match(candidate.query, /ANY\(\$3::text\[\]\)/);
});

test("unknown predicates broaden candidates and query values stay parameterized", () => {
  const input = "'; DELETE FROM app_documents; --";
  const candidate = candidateQuery(parse('*[_type == $kind || references($id)]'), { kind: input, id: "client.1" });
  assert.ok(candidate.params.includes(input));
  assert.ok(!candidate.query.includes(input));
  assert.match(candidate.query, /OR TRUE/);
  assert.match(candidateQuery(parse("*[]")).query, /WHERE \(TRUE\)/);
});

test("queries preserve projections, aggregations, nested lookups and references", async () => {
  const documents = [
    { _id: "client.1", _type: "client", name: "Example", enabled: true },
    { _id: "invoice.1", _type: "invoice", amount: 10, client: { _ref: "client.1" } },
    { _id: "invoice.2", _type: "invoice", amount: 20, client: { _ref: "client.1" } },
  ];
  const store = createDocumentStore(async (_query, params) => params?.[0] === "client.1"
    ? documents.filter(doc => doc._id === "client.1").map(document => ({ document }))
    : documents.map(document => ({ document })));
  const query = '{"invoices": *[_type == "invoice"] | order(amount desc){_id, amount, "client": client->name}, "total": math::sum(*[_type == "invoice"].amount), "clients": *[_type == "client"]{name,"count": count(*[_type == "invoice" && client._ref == ^._id])}}';
  const expected = await (await evaluate(parse(query), { dataset: documents })).get();
  assert.deepEqual(await store.fetch(query), expected);
});

test("patch operations encode keyed arrays, preserve identity and reject unsupported paths", async () => {
  let mutations;
  const store = createDocumentStore(async (_query, params) => { mutations = JSON.parse(params[0]); return [{ documents: [{ _id: "example" }] }]; });
  await store.patch("example").set({ _id: "different", _type: "different", "branchPath.step-1": "done" })
    .setIfMissing({ notes: [] }).insert("after", "notes[-1]", [{ _key: "note-1", text: "hello" }])
    .unset(['receipts[_key == "receipt-1"]']).inc({ count: 1 }).commit();
  assert.equal(mutations[0].id, "example");
  assert.deepEqual(mutations[0].operations[0].path, ["branchPath", "step-1"]);
  assert.equal(mutations[0].operations[2].kind, "append");
  assert.deepEqual(mutations[0].operations[3].path, ["receipts", { key: "receipt-1" }]);
  assert.throws(() => parseDocumentPath("foo[*]"));
  assert.throws(() => store.patch("example").inc({ count: NaN }));
});

test("query deletes use revision guards and one atomic batch", async () => {
  const calls = [];
  const doc = { _id: "activity.1", _type: "auditEvent", _rev: "original" };
  const store = createDocumentStore(async (query, params) => {
    calls.push({ query, params });
    return query.startsWith("SELECT document") ? [{ document: doc }] : [{ documents: [] }];
  });
  await store.delete({ query: '*[_type == "auditEvent"]' });
  assert.deepEqual(JSON.parse(calls[1].params[0]), [{ kind: "delete", id: doc._id, revision: doc._rev }]);
});
