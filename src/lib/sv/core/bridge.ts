// The shared Swift core (vietmoi Sources/Core and the iOS MobileInputSession),
// compiled to WebAssembly by vietmoi scripts/build-wasm.py. This module only moves
// bytes: every typing decision is made inside the Wasm module.

export type DocumentOperation =
  | { kind: 'mark'; text: string }
  | { kind: 'unmark' }
  | { kind: 'insert'; text: string }
  | { kind: 'deleteBackward' }
  | { kind: 'moveCaret'; steps: number };

export interface CoreKey { position: string; code: number; title: string | null }
export interface CoreState {
  /** The keyboard the session types with (a Shift tap moves it). */
  keyboard: string;
  language: 'vi' | 'en' | 'zh';
  input: string;
  ascii: boolean;
  pending: boolean;
  preview: string;
  phase: number;
  suggestionsEnabled: boolean;
  suggestions: string[];
  uppercase: boolean;
  capsLock: boolean;
  /** 0 letters, 1 numbers, 2 symbols. */
  page: number;
  symbols: string[][];
  rows: CoreKey[][];
  chineseDictionary: boolean;
  englishWords: boolean;
}
export interface DocumentSnapshot { before: string; after: string; selected: string; marked: number; identifier: string }
export interface CoreProfile {
  id: string; name: string; language: string; inputType: string; outputType: string; suggestionsEnabled: boolean; inputMode?: string;
}

export const TouchAction = {
  key: 0, backspace: 1, space: 2, newline: 3, literal: 4, suggestion: 5, shiftDown: 6, shiftUp: 7, shiftCancel: 8,
  pageDown: 9, pageUp: 10, cursorStart: 11, cursorMove: 12, cursorLines: 13, cursorEnd: 14, finish: 15, cancel: 16,
  documentChanged: 17, cancelHolds: 18
} as const;
export type TouchAction = typeof TouchAction[keyof typeof TouchAction];
export const KeyFlags = { shift: 1, capsLock: 2, command: 4, repeat: 8 } as const;

interface Exports {
  memory: WebAssembly.Memory;
  _initialize(): void;
  sv_input(capacity: number): number;
  sv_output(): number;
  sv_configure(length: number): void;
  sv_document(length: number): void;
  sv_key(length: number, flags: number): number;
  sv_key_up(length: number): void;
  sv_modifier(isShift: number, left: number, down: number, otherModifiers: number, seconds: number): number;
  sv_touch(action: number, argument: number, seconds: number, length: number): number;
  sv_state(): number;
  sv_changed(): number;
  sv_idle(): number;
  sv_load(kind: number, length: number): void;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/** The five WASI calls the Embedded Swift runtime imports: output for traps, and randomness. */
function wasi(memory: () => WebAssembly.Memory) {
  const EBADF = 8;
  let line = '';
  return {
    fd_write(fd: number, iovs: number, count: number, written: number) {
      const view = new DataView(memory().buffer);
      let total = 0;
      for (let i = 0; i < count; i++) {
        const pointer = view.getUint32(iovs + i * 8, true), length = view.getUint32(iovs + i * 8 + 4, true);
        line += decoder.decode(new Uint8Array(memory().buffer, pointer, length));
        total += length;
      }
      const lines = line.split('\n');
      line = lines.pop() ?? '';
      for (const text of lines) (fd === 2 ? console.error : console.log)('[sieuviet core]', text);
      view.setUint32(written, total, true);
      return 0;
    },
    random_get(pointer: number, length: number) {
      crypto.getRandomValues(new Uint8Array(memory().buffer, pointer, length));
      return 0;
    },
    fd_close: () => EBADF,
    fd_fdstat_get: () => EBADF,
    fd_seek: () => EBADF
  };
}

export class SieuvietCore {
  private readonly wasm: Exports;
  private constructor(wasm: Exports) { this.wasm = wasm; }

  static async instantiate(source: Response | Promise<Response> | BufferSource): Promise<SieuvietCore> {
    let exports: Exports | undefined;
    const imports = { wasi_snapshot_preview1: wasi(() => exports!.memory) };
    const resolved = source instanceof Promise ? await source : source;
    const { instance } = resolved instanceof Response
      ? await (typeof WebAssembly.instantiateStreaming === 'function' && resolved.headers.get('content-type')?.includes('wasm')
        ? WebAssembly.instantiateStreaming(resolved, imports)
        : WebAssembly.instantiate(await resolved.arrayBuffer(), imports))
      : await WebAssembly.instantiate(resolved as BufferSource, imports);
    exports = instance.exports as unknown as Exports;
    exports._initialize();
    return new SieuvietCore(exports);
  }

  private write(text: string): number {
    // UTF-8 is at most 3 bytes per UTF-16 unit.
    const pointer = this.wasm.sv_input(text.length * 3 + 1);
    return encoder.encodeInto(text, new Uint8Array(this.wasm.memory.buffer, pointer, text.length * 3 + 1)).written;
  }
  private read(length: number): string {
    return decoder.decode(new Uint8Array(this.wasm.memory.buffer, this.wasm.sv_output(), length));
  }
  private operations(length: number): DocumentOperation[] {
    if (!length) return [];
    const result: DocumentOperation[] = [];
    for (const record of this.read(length).split('\0')) {
      if (!record) continue;
      const body = record.slice(1);
      switch (record[0]) {
        case 'M': result.push({ kind: 'mark', text: body }); break;
        case 'U': result.push({ kind: 'unmark' }); break;
        case 'I': result.push({ kind: 'insert', text: body }); break;
        case 'D': result.push({ kind: 'deleteBackward' }); break;
        case 'C': result.push({ kind: 'moveCaret', steps: Number(body) }); break;
      }
    }
    return result;
  }

  /** The keyboard list, the selected keyboard and the Shift tap time. */
  configure(profiles: CoreProfile[], activeID: string, interfaceLanguage: string, shiftTapSeconds: number) {
    const clean = (value: string) => value.replace(/[\t\n\0]/g, ' ');
    const lines = [[activeID, interfaceLanguage, String(shiftTapSeconds)].join('\t'),
      ...profiles.map((profile) => [profile.id, profile.language, profile.inputType, profile.outputType, profile.inputMode ?? 'sieuviet',
        profile.suggestionsEnabled ? '1' : '0', clean(profile.name)].join('\t'))];
    this.wasm.sv_configure(this.write(lines.join('\n')));
  }
  /** The textbox around the caret, before each event. */
  document(snapshot: DocumentSnapshot) {
    const clean = (value: string) => value.replaceAll('\0', '');
    this.wasm.sv_document(this.write([snapshot.identifier, clean(snapshot.before), clean(snapshot.after), clean(snapshot.selected),
      String(snapshot.marked)].join('\0')));
  }
  /** A physical key down. Returns whether the core handled it, and the document edits to apply. */
  key(position: string, text: string, flags: number): { handled: boolean; operations: DocumentOperation[] } {
    const result = this.wasm.sv_key(this.write(`${position}\0${text}`), flags);
    return { handled: (result & 1) === 1, operations: this.operations(result >> 1) };
  }
  keyUp(position: string) { this.wasm.sv_key_up(this.write(position)); }
  /** A physical modifier change. `switched` when a left Shift tap moved to the next keyboard. */
  modifier(isShift: boolean, left: boolean, down: boolean, otherModifiers: boolean, seconds: number) {
    const result = this.wasm.sv_modifier(+isShift, +left, +down, +otherModifiers, seconds);
    return { switched: (result & 1) === 1, operations: this.operations(result >> 1) };
  }
  touch(action: TouchAction, argument = 0, text = '', seconds = performance.now() / 1000): DocumentOperation[] {
    return this.operations(this.wasm.sv_touch(action, argument, seconds, text ? this.write(text) : 0));
  }
  state(): CoreState { return JSON.parse(this.read(this.wasm.sv_state())); }
  get changed() { return this.wasm.sv_changed() === 1; }
  /** Runs one queued completion job; returns whether more remain. */
  idle() { return this.wasm.sv_idle() === 1; }
  /** Hand a downloaded dictionary to the core: Chinese pinyin table or English word list. */
  load(kind: 'zh' | 'en', text: string) { this.wasm.sv_load(kind === 'zh' ? 0 : 1, this.write(text)); }
}
