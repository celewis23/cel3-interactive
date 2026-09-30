# Private client website packages

The public repository contains only the delivery page and code-validation service. Client source files, ZIP archives and cleartext access codes belong in ignored `client-packages/` or `repair-backups/`, never in `public/` or committed files.

Apply `db/migrations/013_client_downloads.sql` to the same Postgres database used by the application. Each package row stores a ZIP (base64), exact byte length, SHA-256 checksum, and SHA-256 hash of a randomly generated 20-character uppercase alphanumeric code. Use cryptographic randomness, not customer names or short passwords. Maximum archive size is 4,000,000 bytes, below the serverless response limit.

The download page posts the code in the request body. The server normalizes spaces, hyphens and letter case, checks the hash in constant time, then reads the private file. Neither the cleartext code nor the file is stored in activity logs. Responses are not cacheable. There is no GET download or public archive URL. Anyone given the code can download and retain a copy; this is a shared delivery code, not an individual user login.

Attempts are limited to ten per package and forwarding IP address per 15 minutes in Postgres. Expired buckets are removed in bounded batches. This deployment relies on Vercel's trusted forwarding headers; adapt the IP extraction when moving behind another proxy. The application stores a hash, not the raw IP. Malformed codes are rejected before database access.

To revoke future downloads, set `enabled = false` for the package's slug. To rotate access, generate a fresh random code and replace `code_hash`; share the new code separately. Revocation cannot remove copies already downloaded. For a replacement ZIP, update `archive_base64`, `byte_size` and `sha256` together and verify the downloaded checksum before delivery.

Run `node --test scripts/client-downloads.test.mjs`, TypeScript and lint checks after changes. Before handoff, verify a wrong code is rejected, an authorized POST downloads the expected ZIP, the SHA-256 matches the local file, and a direct GET cannot download it. Do not print credentials or embed codes in deployment logs, source files, links or URL query parameters.
