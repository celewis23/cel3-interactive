# Backoffice data and file storage

Application records live in the existing Neon Postgres database in `app_documents`.
IDs, references, timestamps, and all business fields are preserved. The legacy
`sanityServer` and `sanityWriteClient` import names are compatibility aliases;
they do not connect to Sanity. `groq-js` evaluates the existing queries locally,
with safe indexed restrictions pushed into SQL. No Sanity account is required.

Apply migrations 015, 016, and 018 before deploying. Migration 018 keeps archive checksum parameters compatible with PostgreSQL. Migration 017 is a temporary
cutover gate for the legacy deployment. The new application does not consult it.
Every document transaction runs in Postgres. Advisory locks also cover absent
IDs, so concurrent creation, first-writer-wins updates, numeric increments, and
multi-record changes remain atomic. Revision guards reject stale writes.

The database URL stays server-side. No unrestricted query or document API is
exposed to the browser; existing route permissions continue to control access.

## Files

Previously hosted public images are copied to `public/media/migrated/`, with
checksums verified during migration. New uploads go into the connected Google
Workspace account's private `CEL3 Backoffice Files` Drive folder. Metadata and
the private Drive file ID live in Postgres. Files are served through `/api/media/`
using unguessable 192-bit capability URLs, preserving the previous shareable
asset-URL behavior without making the Drive folder public. Keep these links
private unless intentionally sharing a file. Files use the account's Drive quota.

Google must remain connected for new uploads and retrieval of Drive-backed
files. The existing public images remain available independently of Google.
Gmail, Calendar, Drive and the other Google integrations read their connection
credentials from Postgres.

## Activity history and external-drive archive

Recent completed activity stays searchable for 30 days. Routine skipped job
checks stay searchable for one day. Unfinished runs remain online. The hourly
archive job compresses eligible records into `activity_archive_batches` and
removes the matching revisions in the same transaction. Failures leave the
records intact. Compressed history remains online until collected locally.

On the owner's machine, run from this repository:

```powershell
node scripts/archive-activity-to-drive.mjs --destination D:\CEL3-Backups\activity --prune
```

The collector reads only activity logs, including the previous
`audit_event_archive` table. Each gzip file is read back, checksum-verified, and
decompressed before matching cloud records are pruned. Each file has a JSON
manifest with its checksum, count, and source. If the drive is unavailable or
verification fails, the cloud copy remains. Without `--prune`, it only copies.
The collector requires `DATABASE_URL` in the local environment or `.env.local`.

The Windows task **CEL3 Activity Archive** runs daily at 2:15 AM, or when this computer next becomes available while the owner is signed in. Its PowerShell wrapper runs hidden and records the latest result in `D:\CEL3-Backups\activity\collector-last-run.log`. Reinstall or update it with `scripts/install-activity-archive-task.ps1`; its execution-policy override applies only to this reviewed task invocation, not to the machine policy.

Keep another copy of the external-drive folder for protection against drive
failure. The live website cannot access a locally attached drive; the local
collector must run while this machine and drive are available.

## Verification

```text
npm run test:documents
npm run test:activity
npm run test:billing
npm run test:calendar
npm run check:activity
```

`scripts/document-store.integration.mjs` exercises atomic creation, concurrent
increments, keyed arrays, rollback, revision conflicts and reference queries
using isolated `migrationTest.*` records. Set `RUN_DOCUMENT_STORE_INTEGRATION=1`
and the intended `DATABASE_URL` explicitly before running it; it cleans up its
own records. Test failures never trigger live emails or invoices.

## Production migration record

The production switch completed on October 5, 2026. All 7,032 source records
were accounted for: 7,027 matched the final source copy, while five invoices
retained newer Postgres updates from the existing Stripe synchronization. Five
public images were migrated and checksum-verified. Older activity retained
from earlier copies went through the verified archive process.

Production checks passed for admin pages, clients, billing, activity history,
Gmail connection and thread retrieval. A temporary image upload, download,
checksum comparison, and partial-content request passed; the test file was
removed. The archive endpoint passed against the live database after migration
018, and the Windows scheduled collector completed with exit code 0.

The original Sanity dataset is retained for recovery. The application no longer
reads or writes it. Its paid subscription has not been canceled; cancellation
is a separate account-billing action. Do not restore an old Sanity deployment
without reconciling records created in Postgres after this switch.
