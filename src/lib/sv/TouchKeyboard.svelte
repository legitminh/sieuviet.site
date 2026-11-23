<script lang="ts">
  // The on-screen keyboard of the testing ground. It mirrors the native touch
  // surface: guide rows from the active keyboard, Shift tap = next keyboard,
  // Shift hold = uppercase, double tap = Caps Lock, held 123/#+= pages,
  // repeating delete and space-drag cursor movement. It only sends keys.
  import { KeyboardKeyDisplay, keyflow_key_handler, type VirtualKeyInput } from '@legitminh/keyflow';
  import { gridKeys } from './engine';
  import { modeTapCode, type SieuvietInputMethod } from './input-method';
  import { keyboards } from './keyboards.svelte';
  import { t } from './copy.svelte';
  import MobileSpaceKey from './MobileSpaceKey.svelte';
  import MobileDeleteKey from './MobileDeleteKey.svelte';

  let { method, revision, pressed = new Set<string>() }: { method: SieuvietInputMethod; revision: number; pressed?: Set<string> } = $props();

  const guideRows = [[...'qwertyuiop'], [...'asdfghjkl;'], ['shift', ...'zxcvbnm']];
  const englishRows = [[...'qwertyuiop'], [...'asdfghjkl'], ['shift', ...'zxcvbnm']];
  const gridRows = [0, 8, 16, 24].map((start) => gridKeys.slice(start, start + 8));
  const symbolPages = { numbers: ['1234567890', '-/:;()$&@"', ".,?!'[]_"], symbols: ['[]{}#%^*+=', '\\|~<>`_"\':', '!?@&$()-'] };

  const holdMs = 200, doubleTapMs = 300;
  let shiftHeldAt = $state<number | null>(null);
  let shiftUsed = false;
  let capsLock = $state(false);
  let lastTap: { at: number; previous: string } | null = null;
  let page = $state<'letters' | 'numbers' | 'symbols'>('letters');
  let pageHold: { page: 'numbers' | 'symbols'; previous: typeof page; at: number; used: boolean } | null = null;

  export function isCapsLock() { return capsLock; }

  let profile = $derived(keyboards.active);
  let vietnamese = $derived(profile.language === 'vi');
  let grid = $derived(vietnamese && profile.inputType === 'grid4x8' && page === 'letters');
  let uppercase = $derived(capsLock || shiftHeldAt !== null);
  let rows = $derived(page !== 'letters' ? symbolPages[page].map((row) => [...row])
    : !vietnamese ? englishRows : grid ? gridRows : guideRows);

  function label(key: string) {
    void revision;
    if (key === 'shift') return keyboards.displayName(profile);
    if (page !== 'letters' || !vietnamese) return uppercase && /^[a-z]$/.test(key) ? key.toUpperCase() : key;
    const value = method.engine.keyLabel(grid ? 'grid4x8' : 'ascii+', key);
    if (value === null) return null;
    return value === 'Clear' ? t('clear') : uppercase ? value.charAt(0).toLocaleUpperCase('vi') + value.slice(1) : value;
  }

  function send(key: string, code = `Virtual:${key}`) {
    if (!vietnamese && capsLock && /^[a-z]$/.test(key)) key = key.toUpperCase();
    const event = { key, code, repeat: false, source: 'virtual' as const, shiftKey: uppercase && !capsLock };
    keyflow_key_handler({ ...event, type: 'keydown' });
    keyflow_key_handler({ ...event, type: 'keyup' });
  }
  function typed() {
    if (shiftHeldAt !== null) shiftUsed = true;
    lastTap = null;
    if (pageHold) pageHold.used = true;
  }
  function typeKey(event: VirtualKeyInput) {
    if (event.type !== 'keyup') return;
    // Keyflow's virtual adapter lowercases named keys; letters keep their position identity.
    send(event.key);
    typed();
  }

  function shiftDown(event: PointerEvent) {
    event.preventDefault();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    if (capsLock) { capsLock = false; shiftUsed = true; }
    else shiftUsed = false;
    shiftHeldAt = performance.now();
  }
  function shiftUp() {
    if (shiftHeldAt === null) return;
    const now = performance.now(), held = now - shiftHeldAt;
    shiftHeldAt = null;
    if (shiftUsed || held >= holdMs) { lastTap = null; return; }
    if (lastTap && now - lastTap.at <= doubleTapMs) {
      // A double tap enables Caps Lock and keeps the keyboard chosen before the first tap.
      capsLock = true;
      keyboards.select(lastTap.previous);
      lastTap = null;
      return;
    }
    lastTap = { at: now, previous: keyboards.state.activeID };
    send('Shift', modeTapCode);
  }
  function pageDown(requested: 'numbers' | 'symbols') {
    pageHold = { page: requested, previous: page, at: performance.now(), used: false };
    page = requested;
  }
  function pageUp(requested: 'numbers' | 'symbols') {
    if (!pageHold || pageHold.page !== requested) return;
    const { previous, at, used } = pageHold;
    pageHold = null;
    page = used || performance.now() - at >= holdMs ? previous : previous === requested ? 'letters' : requested;
  }
</script>

<section class="touch-keyboard" aria-label={t('keyboardsHeading')} data-layout={grid ? 'grid4x8' : vietnamese ? 'ascii+' : 'english'}>
  {#each rows as row, rowIndex}
    <div class="row">
      {#each row as key}
        {#if key === 'shift'}
          <button type="button" class="key shift" class:pressed={uppercase} aria-label={`${t('nextKeyboard')}: ${keyboards.displayName(profile)}`}
            aria-pressed={capsLock} onpointerdown={shiftDown} onpointerup={shiftUp} onpointercancel={() => { shiftHeldAt = null; }}>
            <span>{capsLock ? '⇪' : '⇧'}</span>
          </button>
        {:else}
          {@const text = label(key)}
          <KeyboardKeyDisplay {key} label={text ?? key} disabled={text === null} onkey={typeKey}
            pressed={pressed.has(key)} class="key">
            <span class:small={(text?.length ?? 0) > 3}>{text ?? ''}</span>
          </KeyboardKeyDisplay>
        {/if}
      {/each}
      {#if !grid && rowIndex === rows.length - 1}
        <MobileDeleteKey ondelete={() => { send('Backspace'); typed(); }} pressed={pressed.has('backspace')} label={t('backspace')} />
        <KeyboardKeyDisplay key="enter" label={t('return')} onkey={typeKey} pressed={pressed.has('enter')} class="key"><span>↵</span></KeyboardKeyDisplay>
      {/if}
    </div>
  {/each}
  <div class="row">
    <button type="button" class="key page" class:pressed={page === 'numbers'} aria-label={t('numbersSymbols')}
      onpointerdown={(event) => { event.preventDefault(); pageDown('numbers'); }} onpointerup={() => pageUp('numbers')}>123</button>
    <button type="button" class="key page" class:pressed={page === 'symbols'} aria-label={t('moreSymbols')}
      onpointerdown={(event) => { event.preventDefault(); pageDown('symbols'); }} onpointerup={() => pageUp('symbols')}>#+=</button>
    <MobileSpaceKey onpress={() => { send(' '); typed(); }} ondragstart={() => {}} onmove={(steps) => {
      for (let i = 0; i < Math.abs(steps); i++) send(steps < 0 ? 'ArrowLeft' : 'ArrowRight');
    }} pressed={pressed.has(' ')} label={t('space')} />
    {#if grid}
      <MobileDeleteKey ondelete={() => { send('Backspace'); typed(); }} pressed={pressed.has('backspace')} label={t('backspace')} />
      <KeyboardKeyDisplay key="enter" label={t('return')} onkey={typeKey} pressed={pressed.has('enter')} class="key"><span>↵</span></KeyboardKeyDisplay>
    {:else}
      <KeyboardKeyDisplay key="," label={t('comma')} onkey={typeKey} pressed={pressed.has(',')} class="key"><span>,</span></KeyboardKeyDisplay>
      <KeyboardKeyDisplay key="." label={t('period')} onkey={typeKey} pressed={pressed.has('.')} class="key"><span>.</span></KeyboardKeyDisplay>
    {/if}
  </div>
</section>

<style>
  .touch-keyboard {
    display: flex; flex-direction: column; gap: 5px; padding: 5px; box-sizing: border-box; width: 100%;
    background: var(--background); font: 400 19px/1.1 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    --keyboard-key-height: 42px; --keyboard-key-radius: 4px; --keyboard-pressed-color: var(--background);
  }
  .row { display: flex; gap: 5px; min-height: 42px; }
  .touch-keyboard :global(.key) { flex: 1 1 0; min-width: 0; padding: .15rem; }
  .touch-keyboard :global(.key span) { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .touch-keyboard :global(.key span.small) { font-size: 11px; }
  .shift, .page {
    flex: 1.4 1 0; min-width: 0; min-height: 42px; border: 1px solid color-mix(in srgb, var(--primary) 55%, transparent);
    border-radius: 4px; color: inherit; background: var(--background); font: inherit; font-size: 13px; touch-action: none;
  }
  .shift { flex-grow: 2; }
  .shift span { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .shift.pressed, .page.pressed { background: var(--primary); color: var(--background); }
  @media (min-width: 601px) { .touch-keyboard { --keyboard-key-height: 36px; } .row { min-height: 36px; } }
  @media (max-width: 430px) { .touch-keyboard { font-size: 16px; gap: 4px; } .row { gap: 4px; } }
</style>
