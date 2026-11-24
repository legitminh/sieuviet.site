// The page's single instance of the shared Swift core, its rendered state, and the
// background work around it: completion jobs and dictionaries, run in idle time only.
import { base } from '$app/paths';
import { SieuvietCore, type CoreState } from './bridge';
import type { KeyboardState } from '../keyboards.svelte';

type Dictionary = 'zh' | 'en';
const dictionaryFiles: Record<Dictionary, string> = { zh: 'pinyin_simp.txt', en: 'english.txt' };

const idle = (run: (deadline: { timeRemaining(): number }) => void) =>
  typeof requestIdleCallback === 'function' ? requestIdleCallback(run, { timeout: 500 })
    : setTimeout(() => { const end = performance.now() + 8; run({ timeRemaining: () => end - performance.now() }); }, 16);

class CoreStore {
  /** The rendered keyboard: labels, suggestions, composition. Null until the core has loaded. */
  state = $state.raw<CoreState | null>(null);
  failed = $state(false);
  /** True once the Wasm module is running. */
  ready = $state(false);
  instance: SieuvietCore | null = null;
  private loading: Promise<SieuvietCore | null> | null = null;
  private requested = new Set<Dictionary>();
  private pumping = false;

  load() {
    this.loading ??= SieuvietCore.instantiate(fetch(`${base}/core/sieuviet.wasm`)).then((core) => {
      this.instance = core;
      this.ready = true;
      this.refresh();
      return core;
    }, (error) => {
      console.error('sieuviet core failed to load', error);
      this.failed = true;
      return null;
    });
    return this.loading;
  }
  refresh() { if (this.instance) this.state = this.instance.state(); }

  /** Hand the keyboard list to the core, and fetch only the dictionaries it needs. */
  configure(keyboards: KeyboardState) {
    const core = this.instance;
    if (!core) return;
    core.configure(keyboards.profiles, keyboards.activeID, keyboards.interfaceLanguage, keyboards.shiftTapSeconds);
    if (keyboards.profiles.some((profile) => profile.language === 'zh')) this.fetchDictionary('zh');
    if (keyboards.profiles.some((profile) => profile.language === 'en' && profile.suggestionsEnabled)) this.fetchDictionary('en');
    this.refresh();
    this.pump();
  }
  private fetchDictionary(kind: Dictionary) {
    if (this.requested.has(kind)) return;
    this.requested.add(kind);
    // Wait for idle time, then download at low priority; the core builds its index in idle slices.
    idle(async () => {
      try {
        const response = await fetch(`${base}/core/${dictionaryFiles[kind]}`, { priority: 'low' } as RequestInit);
        if (!response.ok) throw new Error(`${response.status}`);
        const text = await response.text();
        this.instance?.load(kind, text);
        this.pump();
      } catch (error) {
        console.error(`sieuviet ${kind} dictionary failed to load`, error);
        this.requested.delete(kind);
      }
    });
  }

  /** Drain queued completion work and dictionary building in idle time, a few milliseconds at a time. */
  pump() {
    if (this.pumping || !this.instance) return;
    this.pumping = true;
    const step = (deadline: { timeRemaining(): number }) => {
      const core = this.instance!;
      let more = true;
      while (more && deadline.timeRemaining() > 2) more = core.idle();
      if (core.changed) this.refresh();
      if (more) idle(step);
      else this.pumping = false;
    };
    idle(step);
  }
}

export const core = new CoreStore();
