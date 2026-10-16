import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runInNewContext } from "node:vm";

const pages = ["a", "b", "c"].flatMap(concept => [
  `${concept}/site.dc.html`,
  `${concept}/Website ${concept.toUpperCase()} · Mobile-html/Mobile-${concept.toUpperCase()}.dc.html`,
]);

// Exercise the actual component code in every export, with browser audio policy
// represented by a context that can require a gesture or become interrupted.
function piano(page, navigator = { audioSession: { type: "auto" } }) {
  const html = readFileSync(new URL(`../public/mockups/ej-piano/${page}`, import.meta.url), "utf8");
  const source = html.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1];
  const contexts = [], events = [], timers = [], pendingResumes = [];
  let allowResume = true;
  const parameter = () => ({ value: 1, setValueAtTime() {}, exponentialRampToValueAtTime() {}, cancelScheduledValues() {} });
  const node = () => ({ gain: parameter(), frequency: parameter(), detune: parameter(), threshold: parameter(), ratio: parameter(), connect() {} });
  class AudioContext {
    constructor() {
      this.state = "suspended"; this.currentTime = 0; this.destination = {};
      this.resumes = 0; this.oscillators = [];
      contexts.push(this); events.push("context");
    }
    createDynamicsCompressor() { return node(); }
    createGain() { return node(); }
    createBiquadFilter() { return node(); }
    createOscillator() {
      const oscillator = { ...node(), start() { events.push("note"); }, stop() { events.push("stop"); } };
      this.oscillators.push(oscillator); return oscillator;
    }
    resume() {
      this.resumes++; events.push("resume");
      if (!allowResume) return Promise.reject(new Error("A user gesture is required"));
      if (allowResume === "pending") return new Promise(resolve => pendingResumes.push(() => { this.state = "running"; resolve(); }));
      this.state = "running"; return Promise.resolve();
    }
    close() { this.state = "closed"; return Promise.resolve(); }
  }
  const Component = runInNewContext(`${source}\nComponent;`, {
    navigator, window: { AudioContext, innerWidth: 1440 },
    DCLogic: class { setState(next) { Object.assign(this.state, next); } },
    document: { elementFromPoint: () => ({ getAttribute: () => "60" }) },
    setTimeout(callback, milliseconds) { events.push("timer"); timers.push({ callback, milliseconds }); return timers.length; },
    clearTimeout() {},
  });
  return { component: new Component({}), contexts, events, timers, allowResume(value) { allowResume = value; },
    finishResume() { pendingResumes.splice(0).forEach(finish => finish()); } };
}

for (const page of pages) {
  test(`${page}: first note selects media playback before creating audio`, () => {
    const session = { type: "auto" };
    const setup = piano(page, { audioSession: session });
    const { component, contexts, events } = setup;
    assert.equal(contexts.length, 0, "loading a page must not start audio");
    Object.defineProperty(session, "type", { get: () => "auto", set(value) {
      assert.equal(value, "playback"); events.push("playback");
    } });
    component.voice(60);
    assert.equal(events[0], "playback");
    assert.equal(contexts[0].state, "running");
    assert.equal(contexts[0].oscillators.length, 4);
  });

  test(`${page}: browsers without Audio Session support still play chords`, () => {
    const rejectedSession = {};
    Object.defineProperty(rejectedSession, "type", { set() { throw new Error("Unsupported session type"); } });
    for (const navigator of [{}, { audioSession: rejectedSession }]) {
      const { component, contexts } = piano(page, navigator);
      component.voice(60); component.voice(64);
      assert.equal(contexts.length, 1);
      assert.equal(contexts[0].state, "running");
      assert.equal(contexts[0].oscillators.length, 8);
    }
  });

  test(`${page}: next key resumes interrupted audio and replaces a closed context`, () => {
    const { component, contexts } = piano(page);
    component.voice(60);
    contexts[0].state = "interrupted";
    component.voice(64);
    assert.equal(contexts[0].state, "running");
    assert.equal(contexts.length, 1);
    contexts[0].state = "closed";
    component.voice(67);
    assert.equal(contexts.length, 2);
    assert.equal(contexts[1].state, "running");
  });

  test(`${page}: touch release cancels the blocked voice and plays an audible-length note`, async () => {
    const { component, contexts, events, allowResume } = piano(page);
    const pointer = { pointerId: 1, pointerType: "touch", clientX: 5, clientY: 5,
      preventDefault() {}, currentTarget: { setPointerCapture() {} } };
    allowResume(false);
    component.pDown(pointer);
    await new Promise(resolve => setImmediate(resolve)); // Surface unhandled resume rejections.
    assert.equal(contexts[0].state, "suspended");
    assert.equal(component.state.down[60], true);
    allowResume(true);
    events.length = 0;
    component.pUp({ ...pointer, type: "pointerup" });
    assert.equal(contexts[0].state, "running");
    assert.equal(contexts[0].resumes, 2);
    assert.equal(events.indexOf("stop") < events.indexOf("resume"), true);
    assert.equal(contexts[0].oscillators.length, 8);
    assert.equal(component.state.down[60], undefined);
  });

  test(`${page}: a running piano does not replay notes on release`, () => {
    const { component, contexts } = piano(page);
    const pointer = { pointerId: 1, clientX: 5, clientY: 5,
      preventDefault() {}, currentTarget: { setPointerCapture() {} } };
    component.pDown(pointer);
    component.pUp({ ...pointer, type: "pointerup" });
    assert.equal(contexts[0].oscillators.length, 4);
    assert.equal(contexts[0].resumes, 1);
    assert.equal(component.state.down[60], undefined);
  });

  test(`${page}: a slow audio startup cannot expire the first tap before it sounds`, async () => {
    const { component, contexts, timers, allowResume, finishResume } = piano(page);
    allowResume("pending");
    component.press(60);
    assert.equal(contexts[0].state, "suspended");
    assert.equal(timers.some(timer => timer.milliseconds === 380), false);
    finishResume();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(contexts[0].state, "running");
    assert.equal(timers.some(timer => timer.milliseconds === 380), true);
  });

  test(`${page}: cancelled gestures release keys without starting audio`, () => {
    for (const type of ["pointercancel", "lostpointercapture"]) {
      const { component, contexts } = piano(page);
      let released = false;
      component.audio(); contexts[0].state = "interrupted";
      component.ptrs = { 1: { m: 60, v: { release() { released = true; } } } };
      component.pUp({ type, pointerId: 1 });
      assert.equal(contexts[0].resumes, 1);
      assert.equal(released, true);
      assert.equal(component.ptrs[1], undefined);
    }
  });

  if (page.startsWith("c/")) test(`${page}: demo song unlocks audio in the button gesture before its timers`, () => {
    const { component, contexts, events } = piano(page);
    component.toggleSong();
    assert.equal(contexts.length, 1);
    assert.equal(events.indexOf("resume") < events.indexOf("timer"), true);
    assert.equal(contexts[0].state, "running");
    component.toggleSong();
    assert.equal(component.state.playing, false);
    assert.equal(contexts.length, 1);
  });
}
