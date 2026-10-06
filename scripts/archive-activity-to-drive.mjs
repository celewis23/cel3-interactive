import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { gzipSync, gunzipSync } from "node:zlib";
import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";

nextEnv.loadEnvConfig(process.cwd());
const destinationIndex = process.argv.indexOf("--destination");
const requested = process.argv[destinationIndex + 1];
if (destinationIndex < 0 || !requested || requested.startsWith("--")) throw new Error("Provide --destination with the approved backup folder");
const destination = path.resolve(requested);
const prune = process.argv.includes("--prune");
if (!process.env.DATABASE_URL) throw new Error("Missing DATABASE_URL");
const sql = neon(process.env.DATABASE_URL);
const checksum = bytes => createHash("sha256").update(bytes).digest("hex");
let archived = 0, removed = 0, files = 0;

async function saveVerified(bytes, metadata) {
  const sha256 = checksum(bytes);
  const docs = gunzipSync(bytes).toString("utf8").trim().split("\n").map(line => JSON.parse(line));
  if (docs.length !== metadata.records || docs.some(doc => doc._type !== "auditEvent")) throw new Error("Invalid activity-only archive");
  const filename = `activity-${sha256}.ndjson.gz`;
  const target = path.join(destination, filename);
  try { await writeFile(target, bytes, { flag: "wx" }); }
  catch (error) { if (error.code !== "EEXIST") throw error; }
  const saved = await readFile(target);
  if (checksum(saved) !== sha256 || gunzipSync(saved).compare(gunzipSync(bytes)) !== 0) throw new Error("Drive archive verification failed; cloud records retained");
  await writeFile(`${target}.manifest.json`, JSON.stringify({ format: "ndjson+gzip", sha256, bytes: bytes.length,
    verifiedAt: new Date().toISOString(), ...metadata }, null, 2));
  files++;
  return sha256;
}

await mkdir(destination, { recursive: true });
// The old archive holds only routine job records. Preserve complete rows first.
let after = null;
for (let batch = 0; batch < 200; batch++) {
  const rows = await sql.query(`SELECT project_id,dataset,event_id,revision,document FROM audit_event_archive
    WHERE ($1::text IS NULL OR (project_id || '/' || dataset || '/' || event_id || '/' || revision) > $1)
    ORDER BY (project_id || '/' || dataset || '/' || event_id || '/' || revision) LIMIT 500`, [after]);
  if (!rows.length) break;
  const bytes = gzipSync(rows.map(row => JSON.stringify(row.document)).join("\n") + "\n", { level: 9 });
  await saveVerified(bytes, { source: "legacy-activity-archive", records: rows.length,
    keys: rows.map(({ project_id, dataset, event_id, revision }) => ({ project_id, dataset, event_id, revision })) });
  archived += rows.length;
  if (prune) {
    const deleted = await sql.query(`DELETE FROM audit_event_archive a USING jsonb_array_elements($1::jsonb) saved
      WHERE a.project_id = saved->>'project_id' AND a.dataset = saved->>'dataset'
      AND a.event_id = saved->>'event_id' AND a.revision = saved->>'revision'
      AND a.document = saved->'document' RETURNING a.event_id`, [JSON.stringify(rows)]);
    removed += deleted.length;
  }
  const last = rows.at(-1);
  after = `${last.project_id}/${last.dataset}/${last.event_id}/${last.revision}`;
}
let lastId = "";
for (let batch = 0; batch < 200; batch++) {
  const rows = await sql.query(`SELECT id,sha256,record_count,first_at,last_at,encode(archive_gzip,'base64') AS archive
    FROM activity_archive_batches WHERE id > $1 ORDER BY id LIMIT 5`, [lastId]);
  if (!rows.length) break;
  for (const row of rows) {
    const bytes = Buffer.from(row.archive, "base64");
    if (checksum(bytes) !== row.sha256) throw new Error("Cloud archive checksum mismatch");
    await saveVerified(bytes, { source: "activity-archive-batch", id: row.id, records: row.record_count, firstAt: row.first_at, lastAt: row.last_at });
    archived += row.record_count;
    if (prune) {
      const deleted = await sql.query("DELETE FROM activity_archive_batches WHERE id = $1 AND sha256 = $2 RETURNING record_count", [row.id, row.sha256]);
      removed += deleted[0]?.record_count ?? 0;
    }
    lastId = row.id;
  }
}
console.log(JSON.stringify({ destination, files, archived, removed, verified: true, pruned: prune }));
