import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';

const root = 'public/mockups/juliansjuicebox/';
function load(design, filename) {
  const window = {};
  runInNewContext(readFileSync(root + 'mailbox.js', 'utf8'), { window, Date });
  class Logic {
    state = {};
    setState(values) { Object.assign(this.state, values); }
  }
  const source = readFileSync(root + design + '/console/' + filename, 'utf8');
  const script = source.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1];
  const Component = new Function('DCLogic', 'window', script + '\nreturn Component;')(Logic, window);
  return new Component();
}
const input = value => ({ target: { value } });
for (const [design, file] of [['a', 'Admin.dc.html'], ['b', 'AdminB.dc.html'], ['c', 'AdminC.dc.html']]) {
  test(`concept ${design}: inbox starts as mail list; search, stars, selection, archive and restore work`, () => {
    const c = load(design, file), v = () => c.renderVals();
    assert(v().mailList); assert(!v().mailReading); assert.equal(v().mailRows.length, 4);
    v().mailSearch(input('pineapple')); assert.equal(v().mailRows.length, 1);
    v().mailRows[0].toggleStar();
    v().mailFolders.find(f => f.label === 'Starred').pick(); assert.equal(v().mailRows.length, 1);
    v().mailRows[0].pick(); assert.equal(v().mailSelected.from, 'Dana R.');
    assert.equal(v().mailUnread, 1);
    v().mailMarkUnread(); assert(v().mailList); assert.equal(v().mailUnread, 2);
    v().mailFolders.find(f => f.label === 'Inbox').pick(); v().mailRows[0].check(); v().mailArchive();
    assert.equal(v().mailRows.length, 3);
    v().mailFolders.find(f => f.label === 'Archive').pick(); assert.equal(v().mailRows.length, 1);
    v().mailRows[0].check(); v().mailRestore();
    v().mailFolders.find(f => f.label === 'Inbox').pick(); assert.equal(v().mailRows.length, 4);
    v().mailSelectAll(); assert(v().mailAllChecked); v().mailTrash(); assert.equal(v().mailRows.length, 0);
    v().mailFolders.find(f => f.label === 'Trash').pick(); assert.equal(v().mailRows.length, 4);
  });
  test(`concept ${design}: email drafts and sent messages stay local; reply preserves formatting and sample attachment`, () => {
    const c = load(design, file), v = () => c.renderVals();
    v().mailOpenCompose(); v().mailSetTo(input('test@example.com')); v().mailSetSubject(input('Juice order')); v().mailSetBody(input('Please confirm my order.'));
    v().mailCloseCompose(); assert(!v().mailCompose); assert(v().mailHasDraft);
    v().mailFolders.find(f => f.label === 'Drafts').pick(); v().mailOpenCompose();
    assert.equal(v().mailDraft.subject, 'Juice order'); v().mailSendCompose();
    assert(!v().mailCompose); assert(!v().mailHasDraft);
    v().mailFolders.find(f => f.label === 'Sent').pick(); assert.equal(v().mailRows.length, 1);
    assert.equal(v().mailRows[0].body, 'Please confirm my order.');
    v().mailFolders.find(f => f.label === 'Inbox').pick(); v().mailRows[0].pick(); v().mailStartReply();
    v().mailSavedAnswer(); assert.match(v().mailReply, /Dana R\./);
    v().mailSetReply(input('Absolutely, we can make that swap.')); v().mailToggleBold(); v().mailToggleItalic(); v().mailToggleAttach(); v().mailSendReply();
    assert.equal(v().mailThreadReplies.length, 1); assert(v().mailThreadReplies[0].attached);
    assert.match(v().mailThreadReplies[0].textStyle, /700/); assert.match(v().mailThreadReplies[0].textStyle, /italic/);
    assert.equal(v().mailThreadReplies[0].body, 'Absolutely, we can make that swap.');
    v().mailGoOrders(); assert(v().isOrders); assert.equal(v().orders.length, 6);
    v().goProducts(); assert(v().isProducts); v().goBulletins(); assert(v().isBulletins);
    v().navGroups.flatMap(g => g.items).find(i => i.label === 'Inbox').pick();
    assert.equal(v().mailThreadReplies.length, 1, 'mail state survives console navigation');
  });
}
