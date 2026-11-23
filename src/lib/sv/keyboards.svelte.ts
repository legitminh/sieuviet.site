// The managed keyboard list. The schema matches the native KeyboardProfiles store,
// so a native shell can hand its state to this UI and receive every change back.
import { t, ui, type Language } from './copy.svelte';

export type KeyboardLanguage = 'vi' | 'en';
export type InputType = 'ascii+' | 'grid4x8' | 'qwerty';
export type OutputType = 'sieuviet' | 'quốc ngữ' | 'literal';

export interface KeyboardProfile {
  id: string;
  name: string;
  language: KeyboardLanguage;
  inputType: InputType;
  outputType: OutputType;
  showVirtualKeyboard: boolean;
}
export interface KeyboardState {
  profiles: KeyboardProfile[];
  activeID: string;
  interfaceLanguage: Language;
  shiftTapSeconds: number;
}

/** Each keyboard language allows its own input layouts and outputs; the first is the default. */
export const paradigms: Record<KeyboardLanguage, { inputs: InputType[]; outputs: OutputType[] }> = {
  vi: { inputs: ['ascii+', 'grid4x8'], outputs: ['sieuviet', 'quốc ngữ'] },
  en: { inputs: ['qwerty'], outputs: ['literal'] }
};
export const defaultShiftTapSeconds = 0.2;
export const shiftTapRange = [0.01, 5] as const;

interface NativeBridge { postMessage(message: unknown): void }
declare global {
  interface Window {
    /** Injected by the native app before the page loads. */
    __SIEUVIET_NATIVE__?: { platform: 'macos' | 'ios' | 'android' | 'windows' | 'linux'; state?: Partial<KeyboardState> };
    webkit?: { messageHandlers?: { sieuviet?: NativeBridge } };
    sieuvietAndroid?: { postMessage(json: string): void };
    /** Called by the native app when its settings change elsewhere (for example a Shift tap). */
    sieuvietReceive?: (state: Partial<KeyboardState>) => void;
  }
}

const storageKey = 'sieuviet:keyboards.v1';
const uuid = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export function makeProfile(language: KeyboardLanguage, name: string): KeyboardProfile {
  return { id: uuid(), name, language, inputType: paradigms[language].inputs[0],
    outputType: paradigms[language].outputs[0], showVirtualKeyboard: true };
}
function defaults(): KeyboardState {
  const vietnamese = makeProfile('vi', 'Default keyboard');
  return { profiles: [vietnamese, makeProfile('en', 'English')], activeID: vietnamese.id,
    interfaceLanguage: 'vi', shiftTapSeconds: defaultShiftTapSeconds };
}
/** Repair any saved or native state into an allowed combination. */
function normalize(value: Partial<KeyboardState> | null | undefined, base = defaults()): KeyboardState {
  const profiles = (value?.profiles ?? base.profiles).filter((profile) => profile && profile.id).map((profile) => {
    const language: KeyboardLanguage = profile.language === 'en' ? 'en' : 'vi';
    const allowed = paradigms[language];
    return {
      id: String(profile.id), name: String(profile.name ?? ''), language,
      inputType: allowed.inputs.includes(profile.inputType) ? profile.inputType : allowed.inputs[0],
      outputType: allowed.outputs.includes(profile.outputType) ? profile.outputType : allowed.outputs[0],
      showVirtualKeyboard: profile.showVirtualKeyboard !== false
    };
  });
  if (!profiles.length) profiles.push(...base.profiles);
  const seconds = Number(value?.shiftTapSeconds);
  return {
    profiles,
    activeID: profiles.some((profile) => profile.id === value?.activeID) ? String(value?.activeID) : profiles[0].id,
    interfaceLanguage: value?.interfaceLanguage === 'en' ? 'en' : value?.interfaceLanguage === 'vi' ? 'vi' : base.interfaceLanguage,
    shiftTapSeconds: Number.isFinite(seconds) && seconds >= shiftTapRange[0] && seconds <= shiftTapRange[1] ? seconds : defaultShiftTapSeconds
  };
}

class KeyboardStore {
  state = $state<KeyboardState>(defaults());
  platform = $state<'web' | 'macos' | 'ios' | 'android' | 'windows' | 'linux'>('web');
  active = $derived(this.state.profiles.find((profile) => profile.id === this.state.activeID) ?? this.state.profiles[0]);

  load() {
    const native = typeof window !== 'undefined' ? window.__SIEUVIET_NATIVE__ : undefined;
    if (native) {
      this.platform = native.platform;
      this.state = normalize(native.state);
      window.sieuvietReceive = (state) => { this.state = normalize({ ...this.state, ...state }); ui.language = this.state.interfaceLanguage; };
    } else {
      let saved: Partial<KeyboardState> | null = null;
      try { saved = JSON.parse(localStorage.getItem(storageKey) ?? 'null'); } catch { saved = null; }
      const legacy = (() => { try { return localStorage.getItem('sieuviet.site:language'); } catch { return null; } })();
      this.state = normalize(saved ?? { interfaceLanguage: legacy === 'en' ? 'en' : 'vi' });
    }
    ui.language = this.state.interfaceLanguage;
  }
  private save() {
    ui.language = this.state.interfaceLanguage;
    const snapshot = $state.snapshot(this.state);
    if (typeof window === 'undefined') return;
    const message = { type: 'state', state: snapshot };
    if (window.webkit?.messageHandlers?.sieuviet) window.webkit.messageHandlers.sieuviet.postMessage(message);
    else if (window.sieuvietAndroid) window.sieuvietAndroid.postMessage(JSON.stringify(message));
    else try { localStorage.setItem(storageKey, JSON.stringify(snapshot)); } catch { /* private mode: keep in memory */ }
  }
  displayName(profile: KeyboardProfile) {
    if (profile.name === 'Default keyboard') return t('defaultKeyboard');
    if (profile.name === 'English') return t('englishKeyboard');
    return profile.name;
  }
  add(language: KeyboardLanguage = 'vi') {
    let number = 2;
    const names = new Set(this.state.profiles.map((profile) => profile.name));
    while (names.has(`Keyboard ${number}`) || names.has(`Bàn phím ${number}`)) number++;
    const profile = makeProfile(language, t('keyboardNumber', { number: String(number) }));
    this.state.profiles.push(profile);
    this.save();
    return profile.id;
  }
  remove(id: string) {
    if (this.state.profiles.length <= 1) return;
    this.state.profiles = this.state.profiles.filter((profile) => profile.id !== id);
    if (this.state.activeID === id) this.state.activeID = this.state.profiles[0].id;
    this.save();
  }
  select(id: string) {
    if (!this.state.profiles.some((profile) => profile.id === id)) return;
    this.state.activeID = id;
    this.save();
  }
  /** A Shift tap moves to the next keyboard in the list, wrapping around. */
  next() {
    const index = this.state.profiles.findIndex((profile) => profile.id === this.state.activeID);
    this.select(this.state.profiles[(index + 1) % this.state.profiles.length].id);
  }
  update(id: string, change: Partial<Omit<KeyboardProfile, 'id'>>) {
    const profile = this.state.profiles.find((item) => item.id === id);
    if (!profile) return;
    Object.assign(profile, change);
    const allowed = paradigms[profile.language];
    if (!allowed.inputs.includes(profile.inputType)) profile.inputType = allowed.inputs[0];
    if (!allowed.outputs.includes(profile.outputType)) profile.outputType = allowed.outputs[0];
    this.save();
  }
  setInterfaceLanguage(language: Language) { this.state.interfaceLanguage = language; this.save(); }
  setShiftTapSeconds(seconds: number) {
    if (!Number.isFinite(seconds) || seconds < shiftTapRange[0] || seconds > shiftTapRange[1]) return false;
    this.state.shiftTapSeconds = seconds;
    this.save();
    return true;
  }
}

export const keyboards = new KeyboardStore();
