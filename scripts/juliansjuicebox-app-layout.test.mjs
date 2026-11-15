import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';

const root = 'public/mockups/juliansjuicebox/';
const shared = readdirSync(root + '_apps').filter(f => f.endsWith('.dc.html'));
function context(design, route = 'owner') {
  const store = new Map();
  const location = { pathname: `/mockups/juliansjuicebox/${design}/app/${route}`, search: '' };
  const window = { sessionStorage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) } };
  runInNewContext(readFileSync(root + '_apps/app-kit.js', 'utf8'), { window, location });
  class Logic { state = {}; setState(patch) { Object.assign(this.state, patch); } }
  return { window, location, load(file) {
    const html = readFileSync(root + file, 'utf8');
    const source = html.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1];
    const Component = new Function('DCLogic', 'window', 'location', 'URLSearchParams', source + '\nreturn Component;')(Logic, window, location, URLSearchParams);
    return new Component();
  } };
}
test('the three themes retain their reference fonts, card treatments and type scales', () => {
  const a = context('a').window.JJTheme.current(), b = context('b').window.JJTheme.current(), c = context('c').window.JJTheme.current();
  assert.match(a.displayFont, /Barlow Condensed/); assert.equal(a.radiusCard, '14px'); assert.equal(a.radiusBtn, '8px');
  assert.match(b.displayFont, /Bricolage/); assert.equal(b.border, 'none'); assert.equal(b.radiusCard, '22px');
  assert.match(c.displayFont, /Unbounded/); assert.equal(c.accent, '#8c1c4a'); assert.equal(c.surface, '#ffffff');
  assert(Number.parseFloat(c.headerSize) < Number.parseFloat(a.headerSize) * .7);
});
for (const design of ['a', 'b', 'c']) {
  test(`design ${design}: every shared screen renders using AppScreen and the current theme`, () => {
    for (const file of shared) {
      const owner = file.startsWith('Owner');
      const env = context(design, owner ? 'owner/more' : 'account');
      const values = env.load('_apps/' + file).renderVals();
      assert.equal(values.theme.design, design, file);
      assert.equal(values.screenTabs.length, owner ? 5 : 4, file);
      assert.equal(values.screenTabs.filter(t => t.on).length, 1, file);
      const html = readFileSync(root + '_apps/' + file, 'utf8');
      for (const cls of ['jj-app-screen', 'jj-app-header', 'jj-app-content', 'jj-app-tabs']) assert(html.includes(`class="${cls}"`), `${file} missing ${cls}`);
      assert(!/#[\da-f]{6}\b|border-radius:\s*\d/i.test(html), `${file} hardcodes a theme value`);
      assert(!/\{\{theme\.(?:card|btnGhost|btnPrimary|btnCta|head)\}\}/.test(html), `${file} contains an unsupported style fragment`);
    }
  });
  test(`design ${design}: packing an order still updates the owner and customer screens`, () => {
    const env = context(design), name = design === 'a' ? 'OwnerApp' : 'OwnerApp' + design.toUpperCase();
    const today = env.load(`${design}/app/${name}.dc.html`);
    const initial = today.renderVals().toFillCount; today.renderVals().toFill[0].pack();
    assert.equal(today.renderVals().toFillCount, initial - 1);
    env.location.pathname = `/mockups/juliansjuicebox/${design}/app/owner/orders`;
    const orders = env.load('_apps/OwnerOrders.dc.html').renderVals();
    assert.equal(orders.orders[0].status, 'Packed');
    assert.equal(orders.orders[0].total, '$149.99');
    assert.equal(orders.orders[2].total, '$54.00');
    assert.equal(orders.orders[3].total, '$27.00');
    assert.equal(orders.orders[4].total, '$108.00');
  });
}
test('phone Inbox and Site have phone controls, not desktop mail or design labels', () => {
  const inbox = readFileSync(root + '_apps/OwnerInbox.dc.html', 'utf8').split('</x-dc>')[0];
  assert(!/type="checkbox"|toggleStar|starGlyph/.test(inbox));
  assert.match(inbox, /jj-app-inbox/);
  const site = readFileSync(root + '_apps/OwnerSite.dc.html', 'utf8');
  assert(!site.includes('Design {{theme.design}}'));
  assert(site.includes('site-{{theme.design}}-preview.png'));
  assert(site.includes('Open full editor on desktop'));
});
