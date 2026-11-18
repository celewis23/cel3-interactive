import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInThisContext } from 'node:vm';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import ts from 'typescript';
const require = createRequire(import.meta.url);
function load(file, deps = {}) {
  const { outputText } = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } });
  const module = { exports: {} };
  runInThisContext(`(function(require,module,exports){${outputText}\n})`, { filename: file })(name => Object.hasOwn(deps, name) ? deps[name] : require(name), module, module.exports);
  return module.exports;
}

test('console APK download requires login and returns an installable attachment', async () => {
  const { NextRequest } = require('next/server');
  let authenticated = false, reads = 0;
  const binary = Buffer.from('signed-apk-fixture');
  const route = load('app/api/admin/android-download/route.ts', {
    '@/lib/admin/permissions': { requireAuth: () => authenticated },
    'fs/promises': { readFile: async () => { reads++; return binary; } },
  });
  const request = new NextRequest('https://example.com/api/admin/android-download');
  assert.equal((await route.GET(request)).status, 401);
  assert.equal(reads, 0);
  authenticated = true;
  const response = await route.GET(request);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'application/vnd.android.package-archive');
  assert.equal(response.headers.get('content-disposition'), 'attachment; filename="cel3-backoffice.apk"');
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), binary);
});

test('console download handles a missing package without exposing server paths', async () => {
  const { NextRequest } = require('next/server');
  const route = load('app/api/admin/android-download/route.ts', {
    '@/lib/admin/permissions': { requireAuth: () => true },
    'fs/promises': { readFile: async () => { throw new Error('ENOENT private/server/path'); } },
  });
  const response = await route.GET(new NextRequest('https://example.com/api/admin/android-download'));
  assert.equal(response.status, 404);
  assert.doesNotMatch(await response.text(), /private\/server/);
});
process.env.ADMIN_SESSION_SECRET = 'test-device-secret';
process.env.ADMIN_USERNAME = 'owner';
process.env.ADMIN_PASSWORD = 'original-password';
process.env.ADMIN_PIN = '1234';
function fixture() {
  const docs = new Map();
  const state = { permission: true, reads: 0 };
  const store = { fetch: async (query, params) => {
    state.reads++;
    if (query.includes('staffRole')) return { permissions: { meterwise: { view: state.permission } } };
    return structuredClone(docs.get(params.id) ?? null);
  } };
  const auth = load('lib/meterwise/deviceAuth.ts', {
    '@/lib/sanityServer': { sanityServer: store },
    '@/lib/sanity.write': { sanityWriteClient: {
      create: async doc => { docs.set(doc._id, { ...doc, _rev: 'r0' }); return doc; },
      patch: id => {
        let revision, fields;
        const patch = { ifRevisionId: value => { revision = value; return patch; }, set: value => { fields = value; return patch; },
          commit: async () => {
            const doc = docs.get(id);
            if (revision && revision !== doc._rev) throw Object.assign(new Error('Conflict'), { statusCode: 409 });
            Object.assign(doc, fields, { _rev: `${doc._rev}-next` });
          } };
        return patch;
      },
    } },
    '@/lib/admin/ownerPassword': { OWNER_CREDENTIALS_ID: 'adminCredentials.owner' },
  });
  return { auth, docs, state, session: { step: 'full', iat: Date.now(), exp: Date.now() + 1000 } };
}
test('owner token is opaque, stored only as a hash, persists beyond web session expiry, and revokes', async () => {
  const { auth, docs, session } = fixture();
  const token = await auth.createDevice({ ...session, iat: 1, exp: 2 });
  assert.match(token, /^[a-f0-9]{64}$/);
  assert.equal(docs.size, 1);
  assert.ok(!JSON.stringify([...docs.values()]).includes(token));
  const device = await auth.verifyDevice(`Bearer ${token}`);
  assert.ok(device);
  await auth.revokeDevice(device._id);
  assert.equal(await auth.verifyDevice(`Bearer ${token}`), null);
});
test('owner stored password, fallback password, and PIN changes invalidate existing devices', async () => {
  for (const change of ['stored', 'fallback', 'pin']) {
    const { auth, docs, session } = fixture();
    const token = await auth.createDevice(session);
    const originalPassword = process.env.ADMIN_PASSWORD, originalPin = process.env.ADMIN_PIN;
    try {
      if (change === 'stored') docs.set('adminCredentials.owner', { passwordHash: 'new-hash', passwordSalt: 'salt' });
      if (change === 'fallback') process.env.ADMIN_PASSWORD = 'changed';
      if (change === 'pin') process.env.ADMIN_PIN = '5678';
      assert.equal(await auth.verifyDevice(`Bearer ${token}`), null);
    } finally { process.env.ADMIN_PASSWORD = originalPassword; process.env.ADMIN_PIN = originalPin; }
  }
});
test('partial sessions and browser sessions from before password change cannot issue a device token', async () => {
  const { auth, docs, session } = fixture();
  assert.equal(await auth.createDevice({ ...session, step: 'partial' }), null);
  docs.set('adminCredentials.owner', { passwordHash: 'hash', passwordChangedAt: new Date(session.iat + 1000).toISOString() });
  assert.equal(await auth.createDevice(session), null);
  assert.equal(docs.size, 1);
});
test('staff password changes, deactivation, deletion, and current role access revoke device access', async () => {
  for (const change of ['password', 'disabled', 'deleted', 'permission', 'role']) {
    const { auth, docs, state, session } = fixture();
    docs.set('staff-1', { status: 'active', roleSlug: 'reader', passwordHash: 'hash', passwordSalt: 'salt' });
    const token = await auth.createDevice({ ...session, staffId: 'staff-1' });
    assert.ok(await auth.verifyDevice(`Bearer ${token}`));
    if (change === 'password') docs.get('staff-1').passwordHash = 'changed';
    if (change === 'disabled') docs.get('staff-1').status = 'inactive';
    if (change === 'deleted') docs.delete('staff-1');
    if (change === 'permission') state.permission = false;
    if (change === 'role') docs.get('staff-1').roleSlug = null;
    assert.equal(await auth.verifyDevice(`Bearer ${token}`), null, change);
  }
});
test('invalid bearer tokens never read the database and missing device secret fails closed', async () => {
  const { auth, state, session } = fixture();
  for (const token of [null, '', 'Basic abc', 'Bearer unknown', `Bearer ${'z'.repeat(64)}`]) assert.equal(await auth.verifyDevice(token), null);
  assert.equal(state.reads, 0);
  const secret = process.env.ADMIN_SESSION_SECRET;
  delete process.env.ADMIN_SESSION_SECRET;
  try { await assert.rejects(auth.createDevice(session), /ADMIN_SESSION_SECRET/); }
  finally { process.env.ADMIN_SESSION_SECRET = secret; }
});
test('snapshot matches dashboard calculations and excludes credentials and raw sync errors', () => {
  const { widgetSnapshot } = load('lib/meterwise/widget.ts');
  const logs = Array.from({ length: 10 }, (_, i) => ({
    id: String(i), status: 'success', startedAt: new Date(2026, 10, i + 1).toISOString(), completedAt: null,
    recordsIngested: 10, errorCount: i >= 6 ? 1 : 0, errors: ['secret upstream detail'],
    provider: { name: 'Provider' }, account: { displayName: 'Account' },
  }));
  const snapshot = widgetSnapshot({ mtdCost: 78.37, projectedMonthlyCost: 138.3, daysElapsed: 17,
    providerBreakdown: [{ providerName: 'Small', mtdCost: 1 }, { providerName: 'Large', mtdCost: 5 }] },
    [{ mtdCost: 5 }, { mtdCost: 0 }, { mtdCost: -1 }], [{}, {}, {}], logs);
  assert.equal(snapshot.connectedProviders, 3);
  assert.equal(snapshot.activeProjects, 1);
  assert.equal(snapshot.averageDailySpend, 78.37 / 17);
  assert.equal(snapshot.recentSyncIssues, 4);
  assert.equal(snapshot.syncActivity.length, 8);
  assert.equal(snapshot.syncActivity[0].id, '9');
  assert.equal(snapshot.providers[0].name, 'Large');
  assert.doesNotMatch(JSON.stringify(snapshot), /secret upstream detail/);
  const zero = widgetSnapshot({ mtdCost: 10, daysElapsed: 0, providerBreakdown: [] }, [], [], []);
  assert.equal(zero.averageDailySpend, 10);
});
test('device issuance rejects missing/cross origin and incomplete authentication', async () => {
  let issued = 0, full = false;
  const route = load('app/api/admin/meterwise/device/route.ts', {
    '@/lib/admin/auth': { COOKIE_NAME: 'session', verifySessionToken: () => full ? { step: 'full' } : { step: 'partial' } },
    '@/lib/meterwise/deviceAuth': { createPairing: async () => { issued++; return 'opaque'; } },
  });
  const request = origin => ({ url: 'https://example.com/api/admin/meterwise/device', headers: new Headers(origin ? { origin } : {}), cookies: { get: () => ({ value: 'cookie' }) }, json: async () => ({ challenge: 'a'.repeat(64) }) });
  for (const origin of [null, 'https://other.example']) assert.equal((await route.POST(request(origin))).status, 403);
  assert.equal((await route.POST(request('https://example.com'))).status, 401);
  assert.equal(issued, 0);
  full = true;
  const response = await route.POST(request('https://example.com'));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(issued, 1);
});
test('browser pairing requires proof of possession and codes can be redeemed only once, including concurrent requests', async () => {
  const { auth, docs, session } = fixture();
  const verifier = 'b'.repeat(64), challenge = createHash('sha256').update(verifier).digest('hex');
  const code = await auth.createPairing(session, challenge);
  assert.match(code, /^[a-f0-9]{64}$/);
  assert.ok(!JSON.stringify([...docs.values()]).includes(code));
  assert.equal(await auth.redeemPairing(code, 'c'.repeat(64)), null);
  const results = await Promise.all([auth.redeemPairing(code, verifier), auth.redeemPairing(code, verifier)]);
  assert.equal(results.filter(Boolean).length, 1);
  assert.ok(await auth.verifyDevice(`Bearer ${results.find(Boolean)}`));
  assert.equal(await auth.redeemPairing(code, verifier), null);
});
test('expired pairing and credentials changed during handoff cannot create device sessions', async () => {
  for (const change of ['expired', 'password']) {
    const { auth, docs, session } = fixture();
    const verifier = 'd'.repeat(64), challenge = createHash('sha256').update(verifier).digest('hex');
    const code = await auth.createPairing(session, challenge);
    if (change === 'expired') [...docs.values()].find(doc => doc._type === 'meterwisePairing').expiresAt = Date.now() - 1;
    else docs.set('adminCredentials.owner', { passwordHash: 'changed', passwordSalt: 'new' });
    assert.equal(await auth.redeemPairing(code, verifier), null);
    assert.equal([...docs.values()].filter(doc => doc._type === 'meterwiseDevice').length, 0);
  }
});
test('sign-in return path preserves only a valid local Meterwise pairing request', () => {
  const { loginDestination } = load('lib/admin/loginDestination.ts');
  const destination = `/admin/meterwise/android/connect?challenge=${'e'.repeat(64)}`;
  assert.equal(loginDestination(`?next=${encodeURIComponent(destination)}`), destination);
  for (const next of ['https://evil.example' + destination, '//evil.example' + destination, '/admin/settings', '/admin/meterwise/android/connect?challenge=bad']) {
    assert.equal(loginDestination(`?next=${encodeURIComponent(next)}`), '/admin');
  }
});
test('proxy preserves pairing through missing, expired, and PIN-only browser sessions', () => {
  const { NextRequest } = require('next/server');
  const { proxy } = load('proxy.ts');
  const url = `https://example.com/admin/meterwise/android/connect?challenge=${'f'.repeat(64)}`;
  for (const [payload, destination] of [[null, '/admin/login'], [{ exp: 1, step: 'full' }, '/admin/login'], [{ exp: Date.now() + 60_000, step: 'partial' }, '/admin/pin']]) {
    const headers = payload ? { cookie: `cel3_admin_session=${Buffer.from(JSON.stringify(payload)).toString('base64')}.signature` } : {};
    const response = proxy(new NextRequest(url, { headers }));
    const location = new URL(response.headers.get('location'));
    assert.equal(location.pathname, destination);
    assert.equal(location.searchParams.get('next'), new URL(url).pathname + new URL(url).search);
  }
});
test('backoffice install manifest is public and scoped separately from the client portal', async () => {
  const { NextRequest } = require('next/server');
  const { proxy } = load('proxy.ts');
  const response = proxy(new NextRequest('https://example.com/admin/manifest.webmanifest'));
  assert.equal(response.headers.get('location'), null);
  const manifest = await load('app/admin/manifest.webmanifest/route.ts').GET().json();
  assert.equal(manifest.scope, '/admin');
  assert.ok(manifest.start_url.startsWith(manifest.scope));
  assert.equal(manifest.start_url, '/admin');
  assert.equal(manifest.display, 'standalone');
  assert.ok(manifest.shortcuts.some(shortcut => shortcut.url === '/admin/meterwise'));
  assert.equal(load('app/manifest.ts').default().scope, '/portal/');
});
test('software release feed is uncached and missing artifacts return a safe 404', async () => {
  const release = { versionCode: 3, versionName: '1.1.0', size: 100, sha256: 'a'.repeat(64) };
  for (const available of [true, false]) {
    const route = load('app/api/meterwise/android-release/route.ts', {
      'fs/promises': { readFile: async () => { if (!available) throw new Error('private server path'); return JSON.stringify(release); } },
    });
    const response = await route.GET();
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(response.status, available ? 200 : 404);
    if (available) assert.deepEqual(await response.json(), release);
    else assert.doesNotMatch(await response.text(), /private server path/);
  }
});
test('mobile routes require bearer authentication, sanitize upstream errors, and revoke on logout', async () => {
  let authenticated = false, failed = false, calls = 0;
  const revoked = [];
  class NotConfigured extends Error {}
  const route = load('app/api/meterwise/mobile/route.ts', {
    '@/lib/meterwise/deviceAuth': { verifyDevice: async header => authenticated && header === 'Bearer device' ? { _id: 'device-id' } : null,
      revokeDevice: async id => revoked.push(id) },
    '@/lib/meterwise/client': { MeterwiseNotConfiguredError: NotConfigured,
      getOverview: async () => { calls++; if (failed) throw new Error('upstream-secret'); return {}; },
      listProjects: async () => [], listProviderAccounts: async () => [], listSyncLogs: async () => [] },
    '@/lib/meterwise/widget': { widgetSnapshot: () => ({ mtdCost: 5 }) },
  });
  const req = { headers: new Headers({ authorization: 'Bearer device' }) };
  assert.equal((await route.GET(req)).status, 401); assert.equal(calls, 0);
  authenticated = true;
  const response = await route.GET(req);
  assert.equal(response.status, 200); assert.equal(response.headers.get('cache-control'), 'no-store');
  failed = true;
  const error = await route.GET(req);
  assert.equal(error.status, 503); assert.doesNotMatch(await error.text(), /upstream-secret/);
  assert.equal((await route.DELETE(req)).status, 200); assert.deepEqual(revoked, ['device-id']);
});
