import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext, Script } from 'node:vm';

const root = new URL('../public/projectbounce/', import.meta.url);
const html = readFileSync(new URL('index.html', root), 'utf8');
const worker = readFileSync(new URL('sw.js', root), 'utf8');

function workerContext(overrides = {}) {
  const handlers = {};
  const self = { location: { origin: 'https://example.test' }, clients: { claim: async () => {} }, addEventListener: (name, fn) => { handlers[name] = fn; } };
  runInNewContext(worker, { self, URL, Response, ...overrides });
  return handlers;
}

test('app renders all four screens and exports 168 reminders', () => {
  const nodes = new Map();
  const node = id => { if (!nodes.has(id)) nodes.set(id, { innerHTML: '', value: '', setAttribute() {}, removeAttribute() {} }); return nodes.get(id); };
  let download;
  const document = { getElementById: node, querySelectorAll: () => [], body: { appendChild() {} }, createElement: () => ({ click() {}, remove() {} }) };
  const browserURL = class extends URL { static createObjectURL(blob) { download = blob; return 'blob:test'; } static revokeObjectURL() {} };
  const context = { document, localStorage: { getItem: () => null, setItem() {} }, navigator: {}, window: {}, URL: browserURL, URLSearchParams, Blob, TextEncoder, setTimeout: () => {}, alert: msg => { throw new Error(msg); } };
  const source = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  new Script(source).runInNewContext(context);
  for (const screen of ['today', 'plan', 'log', 'settings']) assert.ok(node(screen).innerHTML.length > 100);
  node('work').value = '18:00'; node('check').value = '08:00';
  context.calendar();
  return download.text().then(ics => assert.equal((ics.match(/BEGIN:VEVENT/g) || []).length, 168));
});

test('worker activation preserves caches owned by other apps', async () => {
  const deleted = [];
  const handlers = workerContext({ caches: { keys: async () => ['admin-v1', 'bounce-v1', 'project-bounce-v0', 'project-bounce-v1'], delete: async key => { deleted.push(key); } } });
  let work;
  handlers.activate({ waitUntil: promise => { work = promise; } });
  await work;
  assert.deepEqual(deleted, ['project-bounce-v0']);
});

test('offline navigation uses the app shell; unrelated requests are ignored', async () => {
  const shell = new Response('Project Bounce offline');
  const handlers = workerContext({ fetch: async () => { throw new Error('offline'); }, caches: { open: async () => ({ match: async key => key === '/projectbounce/index.html' ? shell : undefined }) } });
  let response;
  handlers.fetch({ request: { url: 'https://example.test/projectbounce/index.html', method: 'GET', mode: 'navigate' }, respondWith: p => { response = p; } });
  assert.equal(await (await response).text(), 'Project Bounce offline');
  handlers.fetch({ request: { url: 'https://example.test/admin', method: 'GET' }, respondWith: () => assert.fail('must not intercept other apps') });
});
