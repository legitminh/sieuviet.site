export type InputMode = 'sieuviet' | 'quocNgu';
export type OutputMode = 'sieuviet' | 'quocNgu';
export type Phase = 'initial' | 'vowel' | 'final' | 'tone';

export interface Composition {
  initial?: string;
  vowel?: string;
  final?: string;
}

interface Basis {
  initial: string;
  glide: string;
  core: string;
  final: string;
  tone: number;
  vowelSpelling?: string;
}

const initialBase: Record<string, string> = {
  b: 'b', c: 'c', j: 'ch', y: 'd', d: 'đ', g: 'g', z: 'z', h: 'h', k: 'k', i: 'kh',
  l: 'l', m: 'm', n: 'n', a: 'ng', w: 'nh', p: 'p', f: 'f', r: 'r', s: 's', t: 't',
  u: 'th', e: 'tr', v: 'v', x: 'x', q: 'q', o: ''
};

const vowelSieuviet: Record<string, string> = {
  a: 'oo', w: 'ă', s: 'a', z: 'â', e: 'iê', d: 'e', x: 'ê', r: 'ơ', f: 'o', c: 'ô',
  t: 'ư', g: 'u', v: 'i', y: 'wă', h: 'wa', b: 'wâ', u: 'wiê', j: 'we', n: 'wê',
  i: 'wơ', k: 'wo', m: 'wi', o: 'ươ', l: 'uô'
};

const vowelQuocNgu: Record<string, string> = {
  a: 'oo', q: 'yê', w: 'ă', s: 'a', z: 'â', e: 'ia', d: 'e', x: 'ê', r: 'ơ', f: 'o',
  c: 'ô', t: 'ư', g: 'u', v: 'i', y: 'oă', h: 'oa', b: 'uâ', u: 'uya', j: 'oe',
  n: 'uê', i: 'uơ', m: 'ui', o: 'ươ', l: 'uô', p: 'ưa'
};

const finalBase: Record<string, string> = {
  e: '', c: 'c', j: 'ch', m: 'm', n: 'n', a: 'ng', w: 'nh', p: 'p', t: 't', o: 'o', i: 'i'
};
const toneMap: Record<string, number> = { s: 0, d: 1, f: 2, j: 3, k: 4, l: 5 };
const toneNames = ['ngang', 'sắc', 'huyền', 'hỏi', 'ngã', 'nặng'];
const toneForms: Record<string, string[]> = {
  a: [...'aáàảãạ'], ă: [...'ăắằẳẵặ'], â: [...'âấầẩẫậ'], e: [...'eéèẻẽẹ'],
  ê: [...'êếềểễệ'], i: [...'iíìỉĩị'], o: [...'oóòỏõọ'], ô: [...'ôốồổỗộ'],
  ơ: [...'ơớờởỡợ'], u: [...'uúùủũụ'], ư: [...'ưứừửữự'], y: [...'yýỳỷỹỵ']
};

export const phaseOrder: Phase[] = ['initial', 'vowel', 'final', 'tone'];

export function phaseOf(composition: Composition): Phase {
  if (composition.initial === undefined) return 'initial';
  if (composition.vowel === undefined) return 'vowel';
  if (composition.final === undefined) return 'final';
  return 'tone';
}

export function labelsFor(mode: InputMode, phase: Phase): Record<string, string> {
  if (phase === 'initial') {
    return mode === 'quocNgu' ? { ...initialBase, z: 'gi', f: 'ph' } : initialBase;
  }
  if (phase === 'vowel') return mode === 'quocNgu' ? vowelQuocNgu : vowelSieuviet;
  if (phase === 'final') return mode === 'quocNgu' ? { ...finalBase, u: 'u', i: 'i / y' } : finalBase;
  return Object.fromEntries(Object.entries(toneMap).map(([key, value]) => [key, toneNames[value]]));
}

export function choose(composition: Composition, mode: InputMode, key: string): Composition | null {
  const phase = phaseOf(composition);
  const value = labelsFor(mode, phase)[key];
  if (value === undefined) return null;
  if (phase === 'initial') return { initial: value };
  if (phase === 'vowel') return { ...composition, vowel: value };
  if (phase === 'final') {
    const final = mode === 'quocNgu' && key === 'i' ? 'i' : value;
    return { ...composition, final };
  }
  return composition;
}

function applyTone(value: string, tone: number, anchor: number): string {
  const letters = [...value];
  if (letters[anchor] && toneForms[letters[anchor]]) letters[anchor] = toneForms[letters[anchor]][tone];
  return letters.join('');
}

function basisFrom(composition: Composition, mode: InputMode, tone: number): Basis | null {
  if (composition.initial === undefined || composition.vowel === undefined || composition.final === undefined) return null;
  let initial = composition.initial;
  let glide = '';
  let core = composition.vowel;
  let final = composition.final;
  let vowelSpelling: string | undefined;

  if (mode === 'sieuviet') {
    if (core.startsWith('w')) { glide = 'w'; core = core.slice(1); }
  } else {
    const translated: Record<string, string> = {
      'yê': 'iê', ia: 'iê', 'oă': 'wă', oa: 'wa', 'uâ': 'wâ', uya: 'wiê', oe: 'we',
      'uê': 'wê', 'uơ': 'wơ', ui: 'wi', 'ưa': 'ươ'
    };
    const translatedVowel = translated[core] ?? core;
    if (translatedVowel.startsWith('w')) { glide = 'w'; core = translatedVowel.slice(1); }
    else core = translatedVowel;
    if (core === 'a' && ['u', 'y'].includes(final)) core = 'ă';
    initial = ({ ph: 'f', gi: 'z', k: 'c', q: 'k' } as Record<string, string>)[initial] ?? initial;
    if (composition.initial === 'q' && core !== 'uô') glide = 'w';
    final = final === 'u' ? 'o' : final === 'y' ? 'i' : final;
    if (composition.vowel === 'ui') vowelSpelling = 'i';
  }
  return { initial, glide, core, final, tone, vowelSpelling };
}

function renderSieuviet(basis: Basis): string {
  const anchor = ['iê', 'ươ', 'uô', 'oo'].includes(basis.core) ? 1 : 0;
  return (basis.initial + basis.glide + applyTone(basis.core, basis.tone, anchor) + basis.final).normalize('NFC');
}

function renderStandard(basis: Basis): string {
  let onset = basis.initial === 'f' ? 'ph' : basis.initial === 'z' ? 'gi' : basis.initial;
  const rounded = basis.glide === 'w';
  const qu = rounded && ['c', 'k'].includes(onset);
  const quCore = onset === 'k' && basis.core === 'uô' && !rounded;
  const core = basis.core;
  let vowel = core;
  let coda = basis.final;

  if (coda === 'o') {
    coda = ['a', 'e'].includes(core) ? 'o' : 'u';
    if (core === 'ă') vowel = 'a';
  } else if (coda === 'i') {
    if (['ă', 'â'].includes(core)) coda = 'y';
    if (core === 'ă') vowel = 'a';
  }
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
  if (basis.vowelSpelling) vowel = basis.vowelSpelling;

  const glide = rounded ? (qu || !['a', 'ă', 'e'].includes(core) ? 'u' : 'o') : basis.glide;
  if (qu || quCore) onset = 'q';
  else {
    const front = 'eêiy'.includes((glide + vowel)[0] ?? '');
    if (onset === 'ng' && front) onset = 'ngh';
    if (onset === 'g' && front) onset = 'gh';
    if (['c', 'k'].includes(onset)) onset = front ? 'k' : 'c';
  }
  if (onset === 'gi' && !glide && vowel.startsWith('i')) onset = 'g';
  const anchor = ['iê', 'yê', 'uô', 'ươ', 'oo'].includes(vowel) ? 1 : 0;
  return (onset + glide + applyTone(vowel, basis.tone, anchor) + coda).normalize('NFC');
}

export function preview(composition: Composition, mode: InputMode): string {
  if (composition.initial === undefined) return '';
  if (composition.vowel === undefined) return composition.initial;
  if (composition.final === undefined) return mode === 'quocNgu' ? composition.initial + composition.vowel : renderSieuviet({
    initial: composition.initial, glide: composition.vowel.startsWith('w') ? 'w' : '',
    core: composition.vowel.startsWith('w') ? composition.vowel.slice(1) : composition.vowel,
    final: '', tone: 0
  });
  const basis = basisFrom(composition, mode, 0);
  return mode === 'quocNgu' ? composition.initial + composition.vowel + composition.final : basis ? renderSieuviet(basis) : '';
}

export function complete(composition: Composition, mode: InputMode, output: OutputMode, toneKey: string): string | null {
  const tone = toneMap[toneKey];
  if (tone === undefined) return null;
  const basis = basisFrom(composition, mode, tone);
  if (!basis) return null;
  return output === 'quocNgu' ? renderStandard(basis) : renderSieuviet(basis);
}

export function phaseLabel(phase: Phase, language: 'vi' | 'en'): string {
  const values = language === 'vi'
    ? { initial: 'âm đầu', vowel: 'âm lướt + nguyên âm', final: 'âm cuối', tone: 'thanh' }
    : { initial: 'initial', vowel: 'onglide + vowel', final: 'final', tone: 'tone' };
  return values[phase];
}
