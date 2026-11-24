// The testing ground's input method: every physical key and on-screen touch goes to
// the shared Swift core (the iOS MobileInputSession, compiled to WebAssembly), which
// returns the edits to make. Nothing here decides how anything is typed.
import type { KeyInput, TextComposition, TextInputMethod } from '@legitminh/keyflow';
import { TouchAction, KeyFlags, type DocumentOperation, type DocumentSnapshot } from './core/bridge';
import { core } from './core/core.svelte';

const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
const context = 4096;

/** The US-layout position of a physical key, as the core's layout tables name it. */
export function keyPosition(code: string | undefined, key: string): string {
  if (!code) return key.length === 1 ? key.toLowerCase() : key;
  if (code.startsWith('Key')) return code.slice(3).toLowerCase();
  if (code.startsWith('Digit')) return code.slice(5);
  const named: Record<string, string> = { Semicolon: ';', Comma: ',', Period: '.', Slash: '/', Quote: "'", BracketLeft: '[',
    BracketRight: ']', Backslash: '\\', Minus: '-', Equal: '=', Backquote: '`', Space: 'Space', NumpadEnter: 'Enter' };
  return named[code] ?? code;
}

function cut(value: string, start: number, end: number) {
  // Never split a surrogate pair at the edge of the context window.
  if (start > 0 && /[\uDC00-\uDFFF]/.test(value[start] ?? '')) start++;
  if (end < value.length && /[\uD800-\uDBFF]/.test(value[end - 1] ?? '')) end--;
  return value.slice(start, end);
}
function snapshot(composition: TextComposition): DocumentSnapshot {
  const { value, selectionStart: start, selectionEnd: end, marked } = composition;
  return {
    identifier: 'try',
    before: cut(value, Math.max(0, start - context), start),
    after: cut(value, end, Math.min(value.length, end + context)),
    selected: value.slice(start, end),
    marked: marked ? [...graphemes.segment(value.slice(marked.start, marked.end))].length : 0
  };
}
function apply(composition: TextComposition, operations: DocumentOperation[]) {
  for (const operation of operations) {
    switch (operation.kind) {
      case 'mark': composition.setMarked(operation.text); break;
      case 'unmark': composition.finish(); break;
      case 'insert': composition.insert(operation.text); break;
      case 'deleteBackward': composition.deleteBackward(); break;
      case 'moveCaret': composition.moveCaret(operation.steps); break;
    }
  }
}

export class CoreInputMethod implements TextInputMethod {
  private consumed = new Set<string>();

  /** `onkeyboard` follows a Shift tap: the core moved to another keyboard in the list. */
  constructor(private onkeyboard: (id: string) => void) {}

  private after() {
    core.refresh();
    const state = core.state;
    if (state) this.onkeyboard(state.keyboard);
    core.pump();
  }

  key(type: 'keydown' | 'keyup', input: KeyInput, composition: TextComposition): boolean {
    const instance = core.instance;
    if (!instance) return false;
    const id = input.code || input.key;
    const position = keyPosition(input.code, input.key);
    const command = !!(input.ctrlKey || input.metaKey || input.altKey);
    const seconds = performance.now() / 1000;
    if (input.key === 'Shift' || input.key === 'Control' || input.key === 'Meta' || input.key === 'Alt') {
      if (input.repeat) return false;
      // A left Shift tap finishes the syllable and moves to the next keyboard, as on every platform.
      instance.document(snapshot(composition));
      const { switched, operations } = instance.modifier(input.key === 'Shift', input.code !== 'ShiftRight', type === 'keydown', command, seconds);
      apply(composition, operations);
      if (switched) this.after();
      return false;
    }
    if (type === 'keyup') {
      instance.keyUp(position);
      return this.consumed.delete(id);
    }
    if (input.source === 'virtual') return false;
    const event = input as KeyInput & { getModifierState?: (key: string) => boolean };
    const flags = (input.shiftKey ? KeyFlags.shift : 0) | (event.getModifierState?.('CapsLock') ? KeyFlags.capsLock : 0) |
      (command ? KeyFlags.command : 0) | (input.repeat ? KeyFlags.repeat : 0);
    instance.document(snapshot(composition));
    const { handled, operations } = instance.key(position, input.key.length === 1 || [...input.key].length === 1 ? input.key : '', flags);
    apply(composition, operations);
    this.after();
    if (handled) this.consumed.add(id);
    return handled;
  }

  /** An on-screen keyboard action (see TouchAction), applied to the textbox. */
  touch(composition: TextComposition, action: TouchAction, argument = 0, text = '') {
    const instance = core.instance;
    if (!instance) return;
    instance.document(snapshot(composition));
    apply(composition, instance.touch(action, argument, text));
    this.after();
  }

  /** The textbox ended the composition itself (caret moved, exit, blur): keep the text as shown. */
  reset() {
    const instance = core.instance;
    if (!instance) return;
    // The textbox already kept the marked text; the session only needs to forget it.
    instance.touch(TouchAction.finish);
    instance.touch(TouchAction.cancelHolds);
    this.after();
  }
}
