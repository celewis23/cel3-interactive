/**
 * E&J playable piano — reference implementation extracted from the mockup.
 * Framework-agnostic. Port into a React client component (see usage at bottom).
 *
 * Behaviour that must be preserved:
 *  - Synthesized tone (no audio files): triangle fundamental + 3 sine partials,
 *    lowpass filter that closes over time, piano-like decay.
 *  - Notes SUSTAIN while held and RELEASE (~300ms fade) on lift.
 *  - Multi-touch: every pointer (finger / mouse) is its own voice → chords, two hands.
 *  - Glissando: dragging across keys retriggers on each new key under the pointer.
 *  - Master compressor so big chords don't clip.
 *  - AudioContext is created/resumed inside a user gesture (iOS requirement).
 */

export type Voice = { release: () => void };

export class PianoEngine {
  private ctx: AudioContext | null = null;
  private bus: DynamicsCompressorNode | null = null;

  private audio(): AudioContext | null {
    const AC: typeof AudioContext | undefined =
      typeof window !== 'undefined' ? (window.AudioContext || (window as any).webkitAudioContext) : undefined;
    if (!AC) return null;
    if (!this.ctx) {
      this.ctx = new AC();
      this.bus = this.ctx.createDynamicsCompressor();
      this.bus.threshold.value = -14;
      this.bus.ratio.value = 4;
      this.bus.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  /** Start a held note. Call .release() when the key is lifted. */
  noteOn(midi: number): Voice {
    const ctx = this.audio();
    if (!ctx || !this.bus) return { release: () => {} };
    const f0 = 440 * Math.pow(2, (midi - 69) / 12);
    const t = ctx.currentTime;

    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(0.24, t + 0.006); // attack
    out.gain.exponentialRampToValueAtTime(0.1, t + 0.45);   // initial decay
    out.gain.exponentialRampToValueAtTime(0.015, t + 6);    // long sustain decay

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(Math.min(f0 * 10, 12000), t);
    lp.frequency.exponentialRampToValueAtTime(Math.max(f0 * 2, 300), t + 1.2);
    lp.connect(out);
    out.connect(this.bus);

    const partials: [number, number, OscillatorType][] = [
      [1, 1, 'triangle'], [2, 0.35, 'sine'], [3, 0.12, 'sine'], [4, 0.05, 'sine'],
    ];
    const oscs = partials.map(([mult, gain, type]) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.value = f0 * mult;
      o.detune.value = (mult - 1) * 2;
      g.gain.value = gain;
      o.connect(g); g.connect(lp);
      o.start(t); o.stop(t + 8);
      return o;
    });

    let done = false;
    return {
      release: () => {
        if (done) return;
        done = true;
        const n = ctx.currentTime;
        out.gain.cancelScheduledValues(n);
        out.gain.setValueAtTime(Math.max(out.gain.value, 0.0001), n);
        out.gain.exponentialRampToValueAtTime(0.0001, n + 0.3);
        oscs.forEach((o) => { try { o.stop(n + 0.35); } catch { /* already stopped */ } });
      },
    };
  }

  /** Short tap (keyboard activation, demo songs). */
  tap(midi: number, ms = 380) {
    const v = this.noteOn(midi);
    setTimeout(() => v.release(), ms);
  }

  dispose() { void this.ctx?.close(); this.ctx = null; this.bus = null; }
}

/**
 * Pointer controller: attach to the keyboard CONTAINER (not each key).
 * Each key element must carry data-midi="<number>".
 * Container CSS: touch-action:none; user-select:none; -webkit-touch-callout:none.
 */
export class PianoPointers {
  private ptrs = new Map<number, { midi: number | null; voice: Voice | null }>();
  constructor(private engine: PianoEngine, private onDownChange: (down: Set<number>) => void) {}

  private keyAt(e: PointerEvent): number | null {
    let el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    while (el && !el.dataset?.midi) el = el.parentElement;
    return el?.dataset?.midi ? parseInt(el.dataset.midi, 10) : null;
  }
  private set(id: number, midi: number | null) {
    const p = this.ptrs.get(id);
    if (p && p.midi === midi) return;
    p?.voice?.release();
    this.ptrs.set(id, { midi, voice: midi == null ? null : this.engine.noteOn(midi) });
    this.emit();
  }
  private emit() {
    const down = new Set<number>();
    this.ptrs.forEach((p) => { if (p.midi != null) down.add(p.midi); });
    this.onDownChange(down);
  }
  down = (e: PointerEvent) => {
    if (e.button && e.button !== 0) return;
    e.preventDefault();
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    this.set(e.pointerId, this.keyAt(e));
  };
  move = (e: PointerEvent) => { if (this.ptrs.has(e.pointerId)) this.set(e.pointerId, this.keyAt(e)); };
  up = (e: PointerEvent) => {
    const p = this.ptrs.get(e.pointerId);
    if (!p) return;
    p.voice?.release();
    this.ptrs.delete(e.pointerId);
    this.emit();
  };
  releaseAll() { this.ptrs.forEach((p) => p.voice?.release()); this.ptrs.clear(); this.emit(); }
}

/** Build key geometry: whites in a flex row, blacks absolutely positioned. */
export function buildKeys(startMidi: number, octaves: number) {
  const whitePc = [0, 2, 4, 5, 7, 9, 11];
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const end = startMidi + octaves * 12;
  let W = 0;
  for (let m = startMidi; m <= end; m++) if (whitePc.includes(m % 12)) W++;
  const whites: { midi: number; name: string; letter: string }[] = [];
  const blacks: { midi: number; name: string; leftPct: number; widthPct: number }[] = [];
  let wi = 0;
  for (let m = startMidi; m <= end; m++) {
    const pc = m % 12;
    const name = names[pc] + (Math.floor(m / 12) - 1);
    if (whitePc.includes(pc)) { whites.push({ midi: m, name, letter: names[pc] }); wi++; }
    else { const bw = 58 / W; blacks.push({ midi: m, name, leftPct: (wi * 100) / W - bw / 2, widthPct: bw }); }
  }
  return { whites, blacks };
}

/* Usage sketch (React client component):
 *
 * const engine = useMemo(() => new PianoEngine(), []);
 * const [down, setDown] = useState<Set<number>>(new Set());
 * const ptr = useMemo(() => new PianoPointers(engine, setDown), [engine]);
 * useEffect(() => () => { ptr.releaseAll(); engine.dispose(); }, []);
 * <div onPointerDown={ptr.down} onPointerMove={ptr.move} onPointerUp={ptr.up}
 *      onPointerCancel={ptr.up} onLostPointerCapture={ptr.up}
 *      onContextMenu={(e) => e.preventDefault()}
 *      style={{ touchAction: 'none', userSelect: 'none', position: 'relative', display: 'flex' }}>
 *   {whites.map(k => <button data-midi={k.midi} aria-label={k.name} aria-pressed={down.has(k.midi)}
 *       onClick={(e) => e.detail === 0 && engine.tap(k.midi)} ... />)}
 *   {blacks.map(k => <button data-midi={k.midi} style={{ position:'absolute', left:`${k.leftPct}%`, width:`${k.widthPct}%` }} ... />)}
 * </div>
 *
 * Twinkle Twinkle demo (Site C): [[60,1],[60,1],[67,1],[67,1],[69,1],[69,1],[67,2],
 *   [65,1],[65,1],[64,1],[64,1],[62,1],[62,1],[60,2]] — each beat 430ms, light the key while playing.
 */
