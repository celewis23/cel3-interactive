import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import { sql } from "@/lib/postgres";

export const ROUTINE_RETENTION_DAYS = 1;
export const ACTIVITY_RETENTION_DAYS = 30;
const BATCH_SIZE = 500;
const MAX_BATCHES = 10;
const RUN_BUDGET_MS = 40_000;

/** Compress completed history before revision-matched deletion in one transaction.
 * Batches remain online until the external-drive collector verifies its copy. */
export async function archiveRoutineActivity(now = new Date()) {
  const startedAt = Date.now();
  const cutoff = new Date(now.getTime() - ROUTINE_RETENTION_DAYS * 86_400_000).toISOString();
  const historyCutoff = new Date(now.getTime() - ACTIVITY_RETENTION_DAYS * 86_400_000).toISOString();
  const eligible = `document->>'_type' = 'auditEvent'
    AND document->>'status' IS DISTINCT FROM 'running'
    AND (document->>'timestamp' < $2 OR
      (document->>'timestamp' < $1 AND document->>'kind' = 'job'
       AND document->>'source' = 'automatic' AND document->>'routine' = 'true'
       AND document->>'status' = 'skipped'))`;
  let archived = 0, removed = 0;
  for (let batch = 0; batch < MAX_BATCHES && Date.now() - startedAt < RUN_BUDGET_MS; batch++) {
    const rows = await sql.query<{ document: { _id: string; _rev: string; timestamp: string } }>(
      `SELECT document FROM app_documents WHERE ${eligible} ORDER BY document->>'timestamp', id LIMIT ${BATCH_SIZE}`,
      [cutoff, historyCutoff],
    );
    if (!rows.length) break;
    const documents = rows.map(row => row.document);
    const archive = gzipSync(documents.map(doc => JSON.stringify(doc)).join("\n") + "\n", { level: 9 });
    const sha256 = createHash("sha256").update(archive).digest("hex");
    const result = await sql.query<{ removed: number }>(
      `WITH saved AS (
        INSERT INTO activity_archive_batches (id, sha256, record_count, first_at, last_at, archive_gzip)
        VALUES ($1, $1, $2, $3, $4, decode($5, 'base64'))
        ON CONFLICT (id) DO UPDATE SET id = EXCLUDED.id RETURNING id
      ), removed AS (
        DELETE FROM app_documents d USING jsonb_array_elements($6::jsonb) original, saved
        WHERE d.id = original->>'_id' AND d.document->>'_rev' = original->>'_rev'
        RETURNING d.id
      ) SELECT count(*)::integer AS removed FROM removed`,
      [sha256, documents.length, documents[0].timestamp, documents.at(-1)!.timestamp,
        archive.toString("base64"), JSON.stringify(documents.map(doc => ({ _id: doc._id, _rev: doc._rev })))],
    );
    archived += documents.length;
    removed += result[0].removed;
  }
  const [pending] = await sql.query<{ remaining: number }>(
    `SELECT count(*)::integer AS remaining FROM app_documents WHERE ${eligible}`, [cutoff, historyCutoff],
  );
  return { archived, removed, remaining: pending.remaining, cutoff, historyCutoff };
}
