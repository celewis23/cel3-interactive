# Meterwise for Android

Native Android app and resizable home-screen widget (Android 8.0+). The app opens the phone's browser to reuse the existing backoffice sign-in. Already authenticated users do not enter credentials again; otherwise the normal login and owner PIN flow returns to pairing. A five-minute, single-use code is bound to an app-generated verifier (SHA-256 proof of possession); only the originating app can redeem it for a random Meterwise-only device token. The code is consumed with an atomic document revision check. No password is stored or transferred. The device token and pending verifier are encrypted using Android Keystore; the server stores only their hashed identifiers / challenges and an HMAC credential fingerprint in the existing Postgres document store. No database migration is needed. The app and every widget share this one device sign-in.

Device sessions have no time-based expiry. Each data request checks password fingerprints, active staff status, and current Meterwise role access. Changing an owner password (including the configured fallback password), staff password, owner PIN, or server session secret invalidates affected devices. Logout in the Android app revokes that device on the server and clears its cache. Browser logout affects the browser session independently. Offline logout waits for connectivity to ensure server revocation succeeds.

The widget shows month-to-date cost, projection, connected provider accounts, active projects with positive month-to-date costs, daily average, and the number of issue-bearing syncs among the most recent eight. Expanded widgets show the top three provider costs and four recent syncs; the app shows all providers and eight syncs with account, record, and error counts. Calculations match the backoffice dashboard.

## Build and publish

1. Install JDK 17 and Android SDK platform 35 / build tools 35.0.0. Set `JAVA_HOME` and `ANDROID_HOME`, or configure `android/local.properties` for your SDK. Local tooling under `.android-tools/` is also recognized by the build script.
2. From the repository root run `node scripts/build-meterwise-android.mjs`. The script uses Gradle 8.9 (local distribution, wrapper, or installed `gradle`). It creates private release signing files on the first build, runs `assembleRelease` and Android lint, then copies the signed APK and checksum to `public/downloads/`.
3. Securely back up `android/meterwise-release.jks` and `android/signing.properties`. These ignored files must be retained for future updates; never commit them. Increment `versionCode` and `versionName` in `app/build.gradle` for updates.
4. Deploy the Next.js application with the generated APK. The backoffice Meterwise page links to `/admin/meterwise/android`; its download button appears only when the APK is present. `ADMIN_SESSION_SECRET` must be configured. Use the existing production database and Meterwise configuration.

The compiled backoffice origin defaults to `https://cel3interactive.com`. Set `METERWISE_BACKOFFICE_URL` to another HTTPS origin **before building** if needed. The login, token issuance, and mobile API must all be on that exact origin. The APK contains no API keys or passwords. APKs in `public/downloads` are intentionally public binaries; the app requires authenticated device access for data.

Background updates use WorkManager every 30 minutes, subject to Android power/network scheduling. Manual refresh queues immediate work. Network failures keep the last successful snapshot and display its age; authentication rejection clears it. The APK disables backups and cleartext networking. Authentication uses the phone browser; the callback contains only a one-time code, never a session token. Browser logout remains independent from device logout after pairing.

## Validation

Run `node --test scripts/meterwise-widget.test.mjs` for token/revocation, permission, route, and snapshot tests. Run `npx tsc --noEmit` for web types. The build script runs Android lint in addition to APK compilation.

On an Android phone, verify: install, owner sign-in plus PIN, staff access, widget pinning, compact/expanded resizing, manual refresh, airplane mode cached state, password-change invalidation on refresh, server-side logout, and subsequent sign-in. A browser-only session must never authenticate the mobile data API without a device bearer token.
