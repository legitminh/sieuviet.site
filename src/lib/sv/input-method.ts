// The testing ground's input method. It mirrors MobileInputSession and the Mac
// InputController: four modal rounds, per-atom letter case, one-round Backspace,
// Space finishing a partial syllable, and a left Shift tap moving to the next keyboard.
import type { KeyInput, TextComposition, TextInputMethod } from '@legitminh/keyflow';
import { Engine, gridClearIndex, gridKeys, standardParts, renderSieuviet, type Effect } from './engine';
import type { KeyboardProfile } from './keyboards.svelte';

type LetterCase = 'lower' | 'shifted' | 'caps';
const applyCase = (text: string, letterCase: LetterCase) =>
  letterCase === 'caps' ? text.toLocaleUpperCase('vi') : letterCase === 'shifted' ? text.charAt(0).toLocaleUpperCase('vi') + text.slice(1) : text;
const graphemes = new Intl.Segmenter('vi', { granularity: 'grapheme' });

/** A virtual Shift tap from the on-screen keyboard; physical taps are detected here. */
export const modeTapCode = 'Virtual:modetap';

export class SieuvietInputMethod implements TextInputMethod {
  engine = new Engine();
  private signature = '';
  private cases: LetterCase[] = [];
  private recentCommit: string | null = null;
  private consumed = new Set<string>();
  private shiftTap: { start: number; eligible: boolean } | null = null;
  /** Bumped on every state change so the on-screen labels can follow the engine. */
  revision = 0;
  onchange: (() => void) | undefined;
  /** Tab accepts the first suggestion when this returns true. Space never accepts one. */
  onaccept: ((composition: TextComposition) => boolean) | undefined;

  constructor(
    private profile: () => KeyboardProfile,
    private nextKeyboard: () => void,
    private shiftTapSeconds: () => number,
    private capsLock: () => boolean = () => false
  ) {}

  reset() {
    this.engine.cancel();
    this.cases = [];
    this.recentCommit = null;
    this.changed();
  }
  private changed() { this.revision++; this.onchange?.(); }
  private sync(composition: TextComposition) {
    const profile = this.profile();
    const signature = `${profile.id}|${profile.language}|${profile.inputType}|${profile.outputType}`;
    if (signature === this.signature) return;
    if (this.engine.pending) this.apply(this.engine.finishPartial(), composition);
    this.signature = signature;
    this.engine = new Engine(profile.outputType === 'quốc ngữ' ? 'quốc ngữ' : 'sieuviet');
    this.recentCommit = null;
  }
  private cased(parts: string[]) {
    return parts.map((part, index) => index < this.cases.length ? applyCase(part, this.cases[index]) : part).join('').normalize('NFC');
  }
  private apply(effect: Effect, composition: TextComposition) {
    switch (effect.kind) {
      case 'marked': composition.setMarked(this.cased(this.engine.previewParts)); break;
      case 'commit': {
        const basis = this.engine.lastCommitted;
        let parts: string[];
        if (basis) {
          if (this.engine.output === 'quốc ngữ') parts = standardParts(basis);
          else {
            const rendered = renderSieuviet(basis);
            parts = [basis.initial, rendered.slice(basis.initial.length, rendered.length - basis.final.length), basis.final];
          }
        } else parts = this.engine.finishedParts;
        const text = this.cased(parts) + effect.text.slice(parts.join('').normalize('NFC').length);
        composition.commit(text);
        this.cases = [];
        this.recentCommit = text;
        break;
      }
      case 'cancel': composition.cancel(); this.cases = []; break;
      case 'deleteCycle': {
        const text = this.recentCommit;
        this.recentCommit = null;
        const before = composition.value.slice(0, composition.selectionStart);
        if (!text || composition.selectionStart !== composition.selectionEnd || !before.endsWith(text)) break;
        for (const _ of graphemes.segment(text)) composition.deleteBackward();
        break;
      }
      case 'none': break;
    }
    this.changed();
  }

  /** Finish any partial syllable as typed, before a client edit such as accepting a suggestion. */
  finish(composition: TextComposition) {
    this.sync(composition);
    if (this.engine.pending) this.apply(this.engine.finishPartial(), composition);
    this.recentCommit = null;
  }
  /** Finish a partial syllable as typed, then let the key behave normally. */
  private passthrough(composition: TextComposition) {
    if (this.engine.pending) {
      this.apply(this.engine.finishPartial(), composition);
    }
    this.recentCommit = null;
    return false;
  }
  private letterCase(input: KeyInput): LetterCase {
    return this.capsLock() ? 'caps' : input.shiftKey ? 'shifted' : 'lower';
  }

  key(type: 'keydown' | 'keyup', input: KeyInput, composition: TextComposition): boolean {
    const id = input.code || input.key;
    const physical = input.source !== 'virtual';
    if (type === 'keyup') {
      if (physical && input.key === 'Shift' && (input.code ?? 'ShiftLeft') !== 'ShiftRight' && this.shiftTap) {
        const { start, eligible } = this.shiftTap;
        this.shiftTap = null;
        if (eligible && performance.now() - start < this.shiftTapSeconds() * 1000) this.modeTap(composition);
      }
      if (this.consumed.delete(id)) return true;
      return false;
    }
    if (physical) {
      if (input.key === 'Shift') {
        const left = (input.code ?? 'ShiftLeft') !== 'ShiftRight';
        if (left && !input.repeat && !this.shiftTap) this.shiftTap = { start: performance.now(), eligible: !input.ctrlKey && !input.metaKey && !input.altKey };
        else if (this.shiftTap) this.shiftTap.eligible = false;
        return false;
      }
      if (this.shiftTap) this.shiftTap.eligible = false;
    }
    if (input.key === 'Tab' && !input.shiftKey && !input.ctrlKey && !input.metaKey && !input.altKey &&
        this.onaccept?.(composition)) { this.consumed.add(id); return true; }
    if (input.code === modeTapCode) { this.modeTap(composition); this.consumed.add(id); return true; }
    this.sync(composition);
    if (input.ctrlKey || input.metaKey || input.altKey) return this.passthrough(composition);
    const profile = this.profile();
    if (profile.language !== 'vi') { this.recentCommit = null; return false; }
    const consume = () => { this.consumed.add(id); return true; };
    const key = input.key.toLowerCase();

    if (key === 'backspace') {
      if (!this.engine.pending) { this.recentCommit = null; return false; }
      this.cases.pop();
      this.apply(this.engine.backspace(), composition);
      return consume();
    }
    if (key === ' ') {
      if (!this.engine.preview) { this.recentCommit = null; return false; }
      this.apply(this.engine.finishPartial(' '), composition);
      return consume();
    }
    if (input.key.length !== 1) return this.passthrough(composition);

    const input_ = profile.inputType === 'grid4x8' ? 'grid4x8' : 'ascii+';
    if (input_ === 'grid4x8') {
      const position = gridKeys.indexOf(key);
      if (position < 0) return this.passthrough(composition);
      if (position === gridClearIndex) { this.apply(this.engine.clearCycle(), composition); return consume(); }
    } else if (!/^[a-z]$/.test(key) && this.engine.indexFor('ascii+', key) === undefined) {
      return this.passthrough(composition);
    }
    const index = this.engine.indexFor(input_, key);
    // Letters stay modal even when unavailable in this round, as on every platform.
    if (index === undefined || this.engine.componentLabel(index) === null) return consume();
    if (this.engine.phase !== 3) this.cases.push(this.letterCase(input));
    this.recentCommit = null;
    this.apply(this.engine.select(index), composition);
    return consume();
  }

  private modeTap(composition: TextComposition) {
    if (this.engine.pending) {
      this.apply(this.engine.finishPartial(), composition);
    }
    this.nextKeyboard();
    this.sync(composition);
    this.changed();
  }
}
