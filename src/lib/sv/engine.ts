// A direct port of the shared Swift engine (vietmoi Sources/Core). Keep the
// inventory, key bindings and spelling rules identical to the native apps.

export type Phase = 0 | 1 | 2 | 3; // initial, onglide + core vowel, final, tone
export type OutputType = 'sieuviet' | 'quốc ngữ';

export interface VowelAtom { onglide: string; core: string }
export interface Basis { initial: string; onglide: string; core: string; tone: number; final: string }

export const initials = ['b', 'c', 'ch', 'd', 'đ', 'g', 'z', 'h', 'k', 'kh', 'l', 'm',
  'n', 'ng', 'nh', 'p', 'f', 'r', 's', 't', 'th', 'tr', 'v', 'x', ''];
export const vowelAtoms: VowelAtom[] = ['oo', 'ă', 'a', 'â', 'iê', 'e', 'ê', 'ơ', 'o', 'ô', 'ư', 'u', 'i',
  'wă', 'wa', 'wâ', 'wiê', 'we', 'wê', 'wơ', 'wo', 'wi', 'ươ', 'uô']
  .map((label) => label.startsWith('w') ? { onglide: 'w', core: label.slice(1) } : { onglide: '', core: label });
export const finals = ['', 'c', 'ch', 'm', 'n', 'ng', 'nh', 'p', 't', 'o', 'i'];
export const toneNames = ['ngang', 'sắc', 'huyền', 'hỏi', 'ngã', 'nặng'];
const toneAnchors: Record<string, number> = { 'iê': 1, 'ươ': 1, 'uô': 1, oo: 1 };
const toneForms: Record<string, string[]> = {
  a: [...'aáàảãạ'], ă: [...'ăắằẳẵặ'], â: [...'âấầẩẫậ'], e: [...'eéèẻẽẹ'], ê: [...'êếềểễệ'],
  i: [...'iíìỉĩị'], o: [...'oóòỏõọ'], ô: [...'ôốồổỗộ'], ơ: [...'ơớờởỡợ'], u: [...'uúùủũụ'],
  ư: [...'ưứừửữự'], y: [...'yýỳỷỹỵ']
};
const label = (atom: VowelAtom) => atom.onglide + atom.core;
const display = (value: string) => value === '' ? '∅' : value;

// ASCII+: each round binds US physical letter positions to atoms.
const vowelKeys: [string, string][] = [['a', 'oo'], ['w', 'ă'], ['s', 'a'], ['z', 'â'], ['e', 'iê'], ['d', 'e'], ['x', 'ê'],
  ['r', 'ơ'], ['f', 'o'], ['c', 'ô'], ['t', 'ư'], ['g', 'u'], ['v', 'i'], ['o', 'ươ'], ['l', 'uô'],
  ['y', 'wă'], ['h', 'wa'], ['b', 'wâ'], ['u', 'wiê'], ['j', 'we'], ['n', 'wê'], ['i', 'wơ'], ['k', 'wo'], ['m', 'wi']];
export const asciiPlusKeymap: Record<Phase, Record<string, number>> = {
  0: indexMap({ b: 'b', c: 'c', j: 'ch', y: 'd', d: 'đ', g: 'g', z: 'z', h: 'h', k: 'k', i: 'kh', l: 'l', m: 'm', n: 'n',
    q: 'ng', w: 'nh', p: 'p', f: 'f', r: 'r', s: 's', t: 't', u: 'th', o: 'tr', v: 'v', x: 'x', e: '' }, initials),
  1: Object.fromEntries(vowelKeys.map(([key, value]) => [key, vowelAtoms.findIndex((atom) => label(atom) === value)])),
  2: indexMap({ e: '', c: 'c', j: 'ch', m: 'm', n: 'n', q: 'ng', w: 'nh', p: 'p', t: 't', o: 'o', i: 'i' }, finals),
  3: { s: 0, d: 1, f: 2, j: 3, k: 4, l: 5 }
};
function indexMap(map: Record<string, string>, list: string[]) {
  return Object.fromEntries(Object.entries(map).map(([key, value]) => [key, list.indexOf(value)]));
}

// grid4x8: 32 positions; 24 is Shift (mode), 31 clears the cycle.
export const gridKeys = ['1', '2', '3', '4', '5', '6', '7', '8', 'q', 'w', 'e', 'r', 't', 'y', 'u', 'i',
  'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'shift', 'z', 'x', 'c', 'v', 'b', 'n', 'm'];
export const gridActionSlots = [...Array(24).keys(), 25, 26, 27, 28, 29, 30];
export const gridClearIndex = 31;

function applyTone(value: string, tone: number, anchor: number) {
  const letters = [...value];
  if (letters[anchor] && toneForms[letters[anchor]]) letters[anchor] = toneForms[letters[anchor]][tone];
  return letters.join('');
}
export function renderSieuviet(basis: Basis) {
  return (basis.initial + basis.onglide + applyTone(basis.core, basis.tone, toneAnchors[basis.core] ?? 0) + basis.final).normalize('NFC');
}
/** Standard quốc ngữ, as [onset, glide + vowel, coda]; mirrors StandardVietnamese.parts. */
export function standardParts(basis: Basis): string[] {
  let onset = basis.initial === 'f' ? 'ph' : basis.initial === 'z' ? 'gi' : basis.initial;
  const rounded = basis.onglide === 'w';
  const qu = rounded && ['c', 'k'].includes(onset);
  const core = basis.core;
  let vowel = core;
  let coda = basis.final;
  if (coda === 'o') { coda = ['a', 'e'].includes(core) ? 'o' : 'u'; if (core === 'ă') vowel = 'a'; }
  else if (coda === 'i') { if (['ă', 'â'].includes(core)) coda = 'y'; if (core === 'ă') vowel = 'a'; }
  if (['e', 'ê', 'i'].includes(core)) {
    if (coda === 'c') coda = 'ch';
    if (coda === 'ng') coda = 'nh';
    if (core === 'e' && ['ch', 'nh'].includes(coda)) vowel = 'a';
  }
  const closed = basis.final !== '';
  if (core === 'iê') vowel = closed ? (rounded || onset === '' ? 'yê' : 'iê') : (rounded ? 'ya' : 'ia');
  else if (core === 'uô') vowel = closed ? 'uô' : 'ua';
  else if (core === 'ươ') vowel = closed ? 'ươ' : 'ưa';
  else if (core === 'i' && (rounded || (onset === '' && !closed))) vowel = 'y';
  const glide = rounded ? (qu || !['a', 'ă', 'e'].includes(core) ? 'u' : 'o') : basis.onglide;
  if (qu) onset = 'q';
  else {
    const front = 'eêiy'.includes((glide + vowel)[0] ?? '');
    if (onset === 'ng' && front) onset = 'ngh';
    if (onset === 'g' && front) onset = 'gh';
    if (['c', 'k'].includes(onset)) onset = front ? 'k' : 'c';
  }
  if (onset === 'gi' && !glide && vowel.startsWith('i')) onset = 'g';
  const anchor = ['iê', 'yê', 'uô', 'ươ', 'oo'].includes(vowel) ? 1 : 0;
  return [onset, glide + applyTone(vowel, basis.tone, anchor), coda];
}

export type Effect = { kind: 'marked' | 'commit'; text: string } | { kind: 'cancel' | 'deleteCycle' | 'none' };

/** The four-round construction engine; mirrors KeyboardEngine without the old ASCII toggle. */
export class Engine {
  components: number[] = [];
  lastCommitted: Basis | null = null;
  /** Atom parts of the last partial syllable finished as typed. */
  finishedParts: string[] = [];
  constructor(readonly output: OutputType = 'sieuviet') {}
  get phase(): Phase { return this.components.length as Phase; }
  get pending() { return this.components.length > 0; }
  private basis(tone = 0): Basis {
    const vowel = vowelAtoms[this.components[1]];
    return { initial: initials[this.components[0]], onglide: vowel.onglide, core: vowel.core, tone,
      final: this.components.length > 2 ? finals[this.components[2]] : '' };
  }
  get preview() {
    if (!this.pending) return '';
    return this.components.length >= 2 ? renderSieuviet(this.basis()) : initials[this.components[0]];
  }
  /** Parts of the preview by chosen atom, for applying letter case per atom. */
  get previewParts(): string[] {
    return this.components.map((choice, index) => index === 0 ? initials[choice]
      : index === 1 ? label(vowelAtoms[choice]) : finals[choice]);
  }
  componentLabel(index: number): string | null {
    if (index < 0) return null;
    switch (this.phase) {
      case 0: return index < initials.length ? display(initials[index]) : null;
      case 1: return index < vowelAtoms.length ? label(vowelAtoms[index]) : null;
      case 2: return index < finals.length ? display(finals[index]) : null;
      default: return index < toneNames.length ? toneNames[index] : null;
    }
  }
  select(index: number): Effect {
    if (this.componentLabel(index) === null) return { kind: 'none' };
    if (this.phase === 3) {
      const completed = this.basis(index);
      const text = (this.output === 'quốc ngữ' ? standardParts(completed).join('').normalize('NFC') : renderSieuviet(completed)) + ' ';
      this.components = [];
      this.lastCommitted = completed;
      return { kind: 'commit', text };
    }
    this.components.push(index);
    return { kind: 'marked', text: this.preview };
  }
  finishPartial(suffix = ''): Effect {
    if (!this.pending) return { kind: 'none' };
    const text = this.preview;
    this.finishedParts = this.previewParts;
    this.components = [];
    this.lastCommitted = null;
    return text ? { kind: 'commit', text: (text + suffix).normalize('NFC') } : { kind: 'cancel' };
  }
  clearCycle(): Effect {
    if (this.pending) { this.components = []; return { kind: 'cancel' }; }
    return { kind: 'deleteCycle' };
  }
  backspace(): Effect {
    if (!this.pending) return { kind: 'none' };
    this.components.pop();
    return this.pending ? { kind: 'marked', text: this.preview } : { kind: 'cancel' };
  }
  cancel(): Effect {
    if (!this.pending) return { kind: 'none' };
    this.components = [];
    return { kind: 'cancel' };
  }
  /** The atom index a key selects in the current round, or undefined. */
  indexFor(input: 'ascii+' | 'grid4x8', key: string): number | undefined {
    if (input === 'ascii+') return asciiPlusKeymap[this.phase][key];
    const position = gridKeys.indexOf(key);
    const slot = gridActionSlots.indexOf(position);
    return slot < 0 ? undefined : slot;
  }
  /** On-screen label for a key in the current round. */
  keyLabel(input: 'ascii+' | 'grid4x8', key: string): string | null {
    if (input === 'grid4x8' && gridKeys.indexOf(key) === gridClearIndex) return 'Clear';
    const index = this.indexFor(input, key);
    if (index === undefined) return null;
    if (input === 'ascii+' && this.phase === 3) return ['∅', '´', '`', '̉', '~', '.'][index] ?? null;
    return this.componentLabel(index);
  }
}
