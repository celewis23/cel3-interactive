import { sanityWriteClient } from "@/lib/sanity.write";
import { sql } from "@/lib/postgres";

export const ROUTINE_RETENTION_DAYS = 2;
const BATCH_SIZE = 250;
const MAX_BATCHES = 10;

// Never expire business actions, errors, partial results, or unfinished runs.
export const ROUTINE_ACTIVITY_FILTER = `_type == "auditEvent" && kind == "job"
  && source == "automatic" && routine == true && status == "skipped"
  && timestamp < $cutoff`;

type ArchivedEvent = { _id: string; _rev: string; [key: string]: unknown };

/** Archive first; a failed archive must leave the Sanity records untouched.
 * Revision matching protects records changed while the archive was being saved.
 * Bounded batches and idempotent upserts make interrupted/concurrent runs safe. */
export async function archiveRoutineActivity(now = new Date()) {
  const cutoff = new Date(now.getTime() - ROUTINE_RETENTION_DAYS * 86_400_000).toISOString();
  const { projectId, dataset } = sanityWriteClient.config();
  if (!projectId || !dataset) throw new Error("Missing audit archive source configuration");
  let archived = 0;
  let removed = 0;

  for (let batch = 0; batch < MAX_BATCHES; batch++) {
    const documents = await sanityWriteClient.fetch<ArchivedEvent[]>(
      `*[${ROUTINE_ACTIVITY_FILTER}] | order(timestamp asc, _id asc)[0...${BATCH_SIZE}]`,
      { cutoff },
    );
    if (!documents.length) break;

    const saved = await sql.query<{ event_id: string; revision: string }>(
      `INSERT INTO audit_event_archive (project_id, dataset, event_id, revision, document)
       SELECT $1, $2, doc->>'_id', doc->>'_rev', doc
       FROM jsonb_array_elements($3::jsonb) AS doc
       ON CONFLICT (project_id, dataset, event_id, revision)
       DO UPDATE SET document = EXCLUDED.document
       RETURNING event_id, revision`,
      [projectId, dataset, JSON.stringify(documents)],
    );
    const savedRevisions = new Set(saved.map(row => `${row.event_id}:${row.revision}`));
    if (documents.some(doc => !savedRevisions.has(`${doc._id}:${doc._rev}`))) {
      throw new Error("Incomplete audit archive; no records removed from this batch");
    }
    archived += documents.length;

    const ids = documents.map(doc => doc._id);
    await sanityWriteClient.delete({
      query: `*[${ROUTINE_ACTIVITY_FILTER} && _id in $ids && _rev in $revisions]`,
      params: { cutoff, ids, revisions: documents.map(doc => doc._rev) },
    });
    const retained = await sanityWriteClient.fetch<number>(
      "count(*[_id in $ids])", { ids },
    );
    removed += documents.length - retained;
  }

  const remaining = await sanityWriteClient.fetch<number>(
    `count(*[${ROUTINE_ACTIVITY_FILTER}])`, { cutoff },
  );
  return { archived, removed, remaining, cutoff };
}
