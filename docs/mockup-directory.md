# Mockup directory access

Only the top-level directory at `/mockups`, `/mockups/` and `/mockups/index.html` requires the shared four-digit code. Individual files and client pages under `public/mockups/<client>/` stay public.

The directory list lives in `app/mockups/directory.html`; add new entries there. Do not recreate `public/mockups/index.html`, which would bypass the server route. `app/mockups/access.html` contains the code form and no client list or access code.

Set `MOCKUPS_DIRECTORY_CODE` to the four-digit code and `MOCKUPS_DIRECTORY_SECRET` to an independently generated cryptographic secret of at least 32 characters. Both are server environment variables and must stay out of source control and browser bundles. Missing configuration fails closed. Apply `db/migrations/014_mockup_directory_access.sql` to the app database before deployment.

Successful entry issues a signed, HttpOnly, SameSite=Lax cookie scoped to `/mockups`, valid for eight hours and Secure in production. Changing the code or signing secret invalidates previous cookies after redeployment. A fresh browser session without this cookie sees the access prompt. Both locked and unlocked HTML responses disable caching and indexing.

Code attempts are limited to ten per forwarding IP address per 15 minutes in Postgres. Only a hash of the address is stored, and expired records are removed in bounded batches. The forwarding-header assumption is Vercel; adapt this if changing proxies. Access codes and cookie tokens are excluded from activity logging.

Run `npm run test:mockups` for token, access-control, rate-limit and existing mockup-choice tests. Before releasing, check both directory addresses without cookies, a wrong code, a correct code, and direct client URLs. Individual mockups and their source remain intentionally public; this gate controls browsing the directory.
