import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const root = 'public/mockups/hoopsbasketballacademy/';
function demo() {
  const saved = new Map();
  const window = {};
  runInNewContext(readFileSync(root + 'app/demo-state.js', 'utf8'), {
    window, sessionStorage: { getItem: k => saved.get(k) ?? null, setItem: (k, v) => saved.set(k, v) },
  });
  class Logic {
    constructor(props) { this.props = props; }
    setState(patch) { Object.assign(this.state, patch); this.componentDidUpdate(); }
  }
  return {
    load(role) {
      const name = role[0].toUpperCase() + role.slice(1) + 'App';
      const html = readFileSync(root + `app/${name}.dc.html`, 'utf8');
      const logic = html.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1];
      const Component = new Function('DCLogic', 'window', logic + '\nreturn Component;')(Logic, window);
      return new Component({});
    },
    saved,
  };
}

test('coach enrollment, search, profile messages and homework share one persisted store', () => {
  const d = demo(), c = d.load('coach');
  const v = () => c.renderVals();
  v().reqs[0].open(); v().enroll();
  assert.equal(v().reqs[0].status, 'ENROLLED');
  assert.equal(v().reqCount, 1);
  v().back(); v().tabsL[1].go();
  v().searchAthletes({ target: { value: 'Zoe' } });
  assert.deepEqual(v().athletes.map(a => a.name), ['Zoe Grant']);
  v().athletes[0].open(); v().msgAthlete();
  assert.equal(v().thread.from, 'Zoe Grant');
  v().setDraft({ target: { value: 'Great practice, Zoe!' } }); v().sendMessage();
  assert.equal(v().msgs.at(-1).t, 'Great practice, Zoe!');
  v().back(); assert.equal(v().ath.name, 'Zoe Grant'); assert(v().vAthlete);
  v().hwAthlete();
  assert.deepEqual(c.state.tg, ['Zoe Grant']);
  v().sendHw(); assert(v().hwSent);
  assert.equal(v().assigned[0].who, 'Zoe Grant');
  const refreshed = d.load('coach');
  assert.equal(refreshed.renderVals().assigned[0].who, 'Zoe Grant');
  assert.equal(refreshed.renderVals().reqs[0].status, 'ENROLLED');
});

test('coach scans and roster belong to the selected session; empty homework cannot send', () => {
  const c = demo().load('coach'), v = () => c.renderVals();
  v().goCheck(); v().simScan(); assert.equal(v().inCount, 8);
  v().sessChips[0].pick(); assert.equal(v().inCount, 0);
  v().simScan(); assert.equal(v().inCount, 1);
  v().sessChips[1].pick(); assert.equal(v().inCount, 8);
  c.setState({ tg: [] }); v().sendHw(); assert(!v().hwSent); assert.match(v().notice, /Pick at least/);
});

test('parent child selection updates every tab and keeps conversations separate', () => {
  const d = demo(), p = d.load('parent'), v = () => p.renderVals();
  v().goCoach(); v().setDraft({ target: { value: 'Malik will be there.' } }); v().sendMessage();
  v().switchKid(); assert.equal(v().kid.first, 'Jada');
  assert(!v().msgs.some(m => m.t === 'Malik will be there.'));
  assert(v().msgs.some(m => m.t.includes('Jada')));
  v().goProgress(); assert.match(v().title, /Jada/);
  v().goBilling(); assert(v().pays.every(payment => payment.t.startsWith('Jada')));
  v().updateCard(); assert(v().billAction); v().saveCard(); assert.match(v().cardLabel, /Mastercard/);
  assert.equal(d.load('parent').renderVals().kid.first, 'Jada');
  assert.equal(d.load('coach').state.tab, 'today', 'role stores stay isolated');
});

test('athlete workout completion updates Today, Workouts, Progress and survives refresh', () => {
  const d = demo(), a = d.load('athlete'), v = () => a.renderVals();
  v().hw[2].open(); assert(!v().showTabs); v().toggleRun(); assert.equal(v().toggleLabel, 'Pause');
  for (let i = 0; i < 4; i++) v().drillDone();
  assert(v().finished); assert.equal(v().doneCount, 3); assert.equal(v().workoutsDone, 32);
  v().closeOverlay(); assert(v().vToday); assert(v().hw[2].isDone);
  v().tabsL[1].go(); v().filters[1].pick(); assert.equal(v().hwFiltered.length, 3);
  const restored = d.load('athlete'); assert.equal(restored.renderVals().doneCount, 3);
});

test('athlete scan returns to Today and updates totals once; back cancels to the previous tab', () => {
  const a = demo().load('athlete'), v = () => a.renderVals();
  v().tabsL[1].go(); v().hw[2].open(); v().closeOverlay(); assert(v().vWorkouts);
  v().openScan(); v().doScan(); v().closeOverlay();
  assert(v().vToday); assert(v().isIn); assert.equal(v().sessions, 45); assert.equal(v().streak, 13);
  v().openScan(); v().doScan(); v().closeOverlay(); assert.equal(v().sessions, 45);
});

test('legacy app URLs redirect to Parent and each role uses its matching new export', async () => {
  const { outputText } = ts.transpileModule(readFileSync('next.config.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  });
  const loaded = { exports: {} };
  runInNewContext(outputText, { exports: loaded.exports, module: loaded, process: { cwd: () => '.' } });
  const config = loaded.exports.default;
  const redirects = await config.redirects();
  assert.equal(redirects.length, 13);
  assert(redirects.every(r => r.destination.endsWith('/app/parent')));
  const routes = await config.rewrites();
  for (const role of ['coach', 'parent', 'athlete']) {
    const route = routes.find(r => r.source.endsWith('/app/' + role));
    assert(route); assert(existsSync('public' + route.destination));
  }
  for (const old of ['ParentHome', 'ParentMessages', 'AthleteToday', 'AthleteWorkout', 'AthleteCheckin', 'AthleteProgress']) {
    assert(!existsSync(root + `app/${old}.dc.html`));
  }
});
