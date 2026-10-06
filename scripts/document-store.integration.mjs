import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { documentStore as store } from "../lib/documents/store.mjs";

if (process.env.RUN_DOCUMENT_STORE_INTEGRATION !== "1") throw new Error("Set RUN_DOCUMENT_STORE_INTEGRATION=1 for isolated database test records");
const prefix = `migrationTest.${randomUUID()}`;
const ids = Array.from({ length: 6 }, (_, index) => `${prefix}.${index}`);
try {
  const attempts = await Promise.all(Array.from({ length: 8 }, (_, index) => store.createIfNotExists({ _id: ids[0], _type: "migrationTest", winner: index, count: 0, values: [] })));
  assert.equal(new Set(attempts.map(doc => doc.winner)).size, 1);
  await Promise.all(Array.from({ length: 12 }, () => store.patch(ids[0]).inc({ count: 1 }).commit()));
  assert.equal((await store.getDocument(ids[0])).count, 12);
  const wins = await Promise.all(Array.from({ length: 6 }, (_, index) => store.patch(ids[0]).setIfMissing({ owner: index }).commit()));
  assert.equal(new Set(wins.map(doc => doc.owner)).size, 1);
  const changed = await store.patch(ids[0]).set({ "nested.branch.value": "yes" }).setIfMissing({ notes: [] })
    .insert("after", "notes[-1]", [{ _key: "first", value: 1 }]).append("notes", [{ _key: "second", value: 2 }])
    .unset(['notes[_key == "first"]']).commit();
  assert.equal(changed.nested.branch.value, "yes");
  assert.deepEqual(changed.notes, [{ _key: "second", value: 2 }]);
  const array = await store.patch(ids[0]).append("values", [1, 3]).insert("before", "values[1]", [2]).commit();
  assert.deepEqual(array.values, [1, 2, 3]);
  await assert.rejects(store.transaction().create({ _id: ids[1], _type: "migrationTest" }).create({ _id: ids[0], _type: "migrationTest" }).commit());
  assert.equal(await store.getDocument(ids[1]), undefined, "failed transactions must roll back earlier writes");
  const saved = await store.getDocument(ids[0]);
  await store.patch(ids[0]).set({ newer: true }).commit();
  await assert.rejects(store.patch(ids[0]).ifRevisionId(saved._rev).set({ newer: false }).commit());
  const created = await store.create({ _id: ids[2], _type: "migrationTest", link: { _ref: ids[0] } });
  const linked = await store.fetch('*[_id == $id][0]{"count": link->count}', { id: created._id });
  assert.deepEqual(linked, { count: 12 });
  await store.delete({ query: '*[_id == $id]', params: { id: ids[2] } });
  assert.equal(await store.getDocument(ids[2]), undefined);
  console.log(JSON.stringify({ atomicCreation: true, concurrentUpdates: true, transactionRollback: true, keyedArrays: true, nestedFields: true, revisionGuards: true, referenceQueries: true }));
} finally {
  await store.transaction().delete(ids[0]).delete(ids[1]).delete(ids[2]).delete(ids[3]).delete(ids[4]).delete(ids[5]).commit();
}
