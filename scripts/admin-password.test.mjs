import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInThisContext } from 'node:vm';
import { test } from 'node:test';
import ts from 'typescript';
const require = createRequire(import.meta.url);
function load(path, deps = {}) {
  const { outputText } = ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  const module = { exports: {} };
  runInThisContext(`(function(require,module,exports){${outputText}\n})`, { filename: path })(name => Object.hasOwn(deps, name) ? deps[name] : require(name), module, module.exports);
  return module.exports;
}
const passwords = load('lib/admin/staffPassword.ts');
function fixture({ staffId, step = 'full', status = 'active', authenticated = true, storedOwner = null } = {}) {
  const writes = [], audits = [];
  const existing = passwords.hashPassword('current-password');
  const store = { fetch: async (_query, params) => params.id === 'adminCredentials.owner' ? storedOwner : { status, passwordHash: existing.hash, passwordSalt: existing.salt } };
  const owner = load('lib/admin/ownerPassword.ts', {
    './auth': { validateCredentials: (u, p) => u === process.env.ADMIN_USERNAME && p === 'current-password' },
    './staffPassword': passwords, '@/lib/sanityServer': { sanityServer: store },
  });
  const route = load('app/api/admin/auth/password/route.ts', {
    '@/lib/admin/auth': { COOKIE_NAME: 'session', verifySessionToken: () => authenticated ? { step, staffId } : null },
    '@/lib/admin/ownerPassword': owner, '@/lib/admin/staffPassword': passwords,
    '@/lib/sanityServer': { sanityServer: store },
    '@/lib/sanity.write': { sanityWriteClient: {
      patch: id => ({ set: fields => ({ commit: async () => writes.push({ id, ...fields }) }) }),
      createOrReplace: async doc => writes.push(doc),
    } },
    '@/lib/audit/withActivity': { withActivity: (_route, _method, handler) => handler },
    '@/lib/audit/log': { logAudit: (_req, event) => audits.push(event) },
  });
  return { writes, audits, owner, run: (body = { currentPassword: 'current-password', newPassword: 'replacement-password' }, origin = 'https://example.com') => route.POST({
    url: 'https://example.com/api/admin/auth/password', cookies: { get: () => ({ value: 'token' }) },
    headers: new Headers({ origin }), json: async () => body,
  }) };
}
process.env.ADMIN_USERNAME = 'owner@example.com';
process.env.ADMIN_PASSWORD = 'current-password';
test('owner password change stores only a salted hash and disables the configured password', async () => {
  const f = fixture();
  assert.equal((await f.run()).status, 200);
  assert.equal(f.writes[0]._id, 'adminCredentials.owner');
  assert.ok(passwords.verifyPassword('replacement-password', f.writes[0].passwordHash, f.writes[0].passwordSalt));
  assert.doesNotMatch(JSON.stringify([...f.writes, ...f.audits]), /current-password|replacement-password/);
  const next = fixture({ storedOwner: f.writes[0] });
  assert.equal(await next.owner.verifyOwnerPassword(process.env.ADMIN_USERNAME, 'current-password'), false);
  assert.equal(await next.owner.verifyOwnerPassword(process.env.ADMIN_USERNAME, 'replacement-password'), true);
});
test('staff can change only their own password', async () => {
  const f = fixture({ staffId: 'staff-1' });
  assert.equal((await f.run({ currentPassword: 'current-password', newPassword: 'replacement-password', staffId: 'staff-2' })).status, 200);
  assert.equal(f.writes[0].id, 'staff-1');
});
test('missing, partial, and inactive sessions cannot change passwords', async () => {
  for (const options of [{ authenticated: false }, { step: 'partial' }, { staffId: 'staff-1', status: 'disabled' }]) {
    const f = fixture(options);
    assert.equal((await f.run()).status, 401);
    assert.equal(f.writes.length, 0);
  }
});
test('wrong current password, invalid input, and cross-origin requests never write credentials', async () => {
  const f = fixture();
  for (const body of [null, {}, { currentPassword: 2, newPassword: 'replacement-password' }, { currentPassword: 'wrong', newPassword: 'replacement-password' }, { currentPassword: 'current-password', newPassword: 'short' }, { currentPassword: 'current-password', newPassword: 'current-password' }]) {
    assert.equal((await f.run(body)).status, 400);
  }
  assert.equal((await f.run(undefined, 'https://other.example')).status, 403);
  assert.equal(f.writes.length, 0);
});

test('owner login accepts the changed password, retains the PIN step, and rejects the old password', async () => {
  const changed = passwords.hashPassword('replacement-password');
  const f = fixture({ storedOwner: { passwordHash: changed.hash, passwordSalt: changed.salt } });
  const issued = [];
  const login = load('app/api/admin/auth/login/route.ts', {
    '@/lib/audit/withActivity': { withActivity: (_route, _method, handler) => handler },
    '@/lib/admin/auth': {
      COOKIE_NAME: 'session', createSessionToken: step => { issued.push(step); return 'partial-token'; },
      createStaffSessionToken: () => { throw new Error('Owner must not enter staff login'); },
    },
    '@/lib/admin/ownerPassword': f.owner,
    '@/lib/admin/staffPassword': passwords,
    '@/lib/sanityServer': { sanityServer: { fetch: () => { throw new Error('Owner must not enter staff lookup'); } } },
    '@/lib/audit/log': { logAudit: () => {}, AuditAction: { AUTH_LOGIN_FAILED: 'failed' } },
  });
  const run = password => login.POST({ json: async () => ({ username: process.env.ADMIN_USERNAME, password }) });
  const success = await run('replacement-password');
  assert.equal(success.status, 200);
  assert.match(success.headers.get('set-cookie'), /session=partial-token/);
  assert.deepEqual(issued, ['partial']);
  assert.equal((await run('current-password')).status, 401);
  assert.equal((await run(null)).status, 401);
});
